import test from 'node:test';
import assert from 'node:assert/strict';
import { Team, User } from '../models/index.js';
import { normalizeTeamPeople, setUserTeams, syncUserMemberships } from '../utils/teamMemberships.js';
import { canManageTeam } from '../validations/teamPermissions.js';
import { canManageTeam as browserCanManageTeam } from '../../../web/src/utils/teamPermissions.js';
import { prepareTeam } from '../services/teams.js';

test('team membership management cannot promote, demote or remove the leader', async (t) => {
  const leader = new User({ name: 'Leader', permission: 'teamlead' });
  const member = new User({ name: 'Member', permission: 'member' });
  const team = new Team({ name: 'A', people: [
    { _id: leader._id, name: leader.name, permission: 'teamlead' },
    { _id: member._id, name: member.name, permission: 'member' },
  ] });
  t.mock.method(User, 'find', async () => [leader, member]);
  for (const people of [
    [{ _id: member._id }],
    [{ _id: leader._id, permission: 'member' }, { _id: member._id }],
    [{ _id: leader._id }, { _id: member._id, permission: 'teamlead' }],
  ]) await assert.rejects(prepareTeam({ people }, team), { status: 403 });
  const result = await prepareTeam({ people: [{ _id: leader._id }, { _id: member._id }] }, team);
  assert.deepEqual(result.people.map((person) => person.permission), ['teamlead', 'member']);
});

test('administrators can remove a leader through team membership management', async (t) => {
  const leader = new User({ name: 'Leader', permission: 'teamlead' });
  const member = new User({ name: 'Member', permission: 'member' });
  const team = new Team({ name: 'A', people: [
    { _id: leader._id, name: leader.name, permission: 'teamlead' },
    { _id: member._id, name: member.name, permission: 'member' },
  ] });
  t.mock.method(User, 'find', async () => [member]);
  const data = { people: [{ _id: member._id }] };
  for (const permission of ['teamlead', 'member']) {
    await assert.rejects(prepareTeam(data, team, { permission }), { status: 403 });
  }
  for (const permission of ['superadmin', 'admin']) {
  const result = await prepareTeam(data, team, { permission });
  assert.equal(result.people.length, 1);
  assert.equal(String(result.people[0]._id), String(member._id));
  assert.equal(result.people[0].permission, 'member');
  }
});

test('a second leader is rejected before writing memberships', async (t) => {
  const first = new User({ name: 'First' });
  const second = new User({ name: 'Second', permission: 'teamlead' });
  const team = new Team({ name: 'A', people: [{ _id: first._id, name: first.name, permission: 'teamlead' }] });
  t.mock.method(Team, 'find', () => ({ lean: async () => [team] }));
  t.mock.method(Team, 'updateOne', () => assert.fail('Must not change existing leadership'));
  await assert.rejects(syncUserMemberships(second, [String(team._id)]), { status: 409 });
  team.people.push({ _id: second._id, name: second.name, permission: 'teamlead' });
  await assert.rejects(team.validate(), /apenas um/);
});

test('concurrent leadership assignment uses an atomic guard', async (t) => {
  const user = new User({ name: 'Leader', permission: 'teamlead' });
  const team = new Team({ name: 'A', people: [] });
  t.mock.method(Team, 'find', () => ({ lean: async () => [team] }));
  const update = t.mock.method(Team, 'updateOne', async () => ({ matchedCount: 0 }));
  await assert.rejects(syncUserMemberships(user, [String(team._id)]), { status: 409 });
  assert.deepEqual(update.mock.calls[0].arguments[0].people, { $not: { $elemMatch: { permission: 'teamlead' } } });
});

test('one user can lead one team and be a member of another regardless of global permission', async (t) => {
  const user = new User({ name: 'Pessoa', email: 'person@example.test', permission: 'member' });
  t.mock.method(User, 'find', async () => [user]);
  const leader = await normalizeTeamPeople([{ _id: user._id, permission: 'teamlead', name: 'Forged' }]);
  const member = await normalizeTeamPeople([{ _id: user._id, permission: 'member' }]);
  assert.equal(leader[0].permission, 'teamlead');
  assert.equal(member[0].permission, 'member');
  assert.equal(leader[0].name, user.name);
  for (const allowed of [canManageTeam, browserCanManageTeam]) {
    assert.equal(allowed(user, { people: leader }), true);
    assert.equal(allowed(user, { people: member }), false);
    assert.equal(allowed({ _id: user._id, permission: 'teamlead' }, { people: member }), false);
  }
  await assert.rejects(normalizeTeamPeople([{ _id: user._id, permission: 'admin' }]), { status: 400 });
});

test('editing a user preserves each team role and new memberships default to member', async (t) => {
  const user = new User({ name: 'New name', email: 'new@example.test', permission: 'teamlead' });
  const lead = new Team({ name: 'A', people: [{ _id: user._id, name: 'Old name', email: 'old@example.test', permission: 'teamlead' }] });
  const member = new Team({ name: 'B', people: [{ _id: user._id, name: 'Old name', permission: 'member' }] });
  const empty = new Team({ name: 'C' });
  const teams = [lead, member, empty];
  t.mock.method(Team, 'findById', async (id) => teams.find((team) => String(team._id) === String(id)));
  t.mock.method(Team, 'updateMany', async () => ({}));
  const update = t.mock.method(Team, 'updateOne', async () => ({}));
  await setUserTeams(user, teams.map((team) => String(team._id)), 'old@example.test');
  const additions = update.mock.calls.map((call) => call.arguments[1].$push?.people).filter(Boolean);
  assert.deepEqual(additions.map((person) => person.permission), ['teamlead', 'member', 'member']);
  assert.ok(additions.every((person) => person.name === user.name && person.email === user.email));
});

test('user administration assigns leadership without removing memberships managed by team leaders', async (t) => {
  const user = new User({ name: 'Pessoa', email: 'person@example.test', permission: 'teamlead' });
  const oldLead = new Team({ name: 'A', people: [{ _id: user._id, name: user.name, permission: 'teamlead' }] });
  const member = new Team({ name: 'B', people: [{ _id: user._id, name: user.name, permission: 'member' }] });
  const newLead = new Team({ name: 'C' });
  t.mock.method(Team, 'find', () => ({ lean: async () => [oldLead, member, newLead] }));
  const update = t.mock.method(Team, 'updateOne', async () => ({}));
  await syncUserMemberships(user, [String(newLead._id)]);
  const changes = update.mock.calls.map((call) => call.arguments[1]);
  assert.equal(changes[0].$set['people.$.permission'], 'member');
  assert.equal(changes[1].$set['people.$.permission'], 'member');
  assert.equal(changes[2].$push.people.permission, 'teamlead');
  assert.ok(changes.every((change) => !change.$pull));
});

test('editing member details preserves memberships and does not join new teams', async (t) => {
  const user = new User({ name: 'Updated', email: 'person@example.test', permission: 'member' });
  const member = new Team({ name: 'A', people: [{ _id: user._id, name: 'Old', permission: 'member' }] });
  t.mock.method(Team, 'find', () => ({ lean: async () => [member, new Team({ name: 'B' })] }));
  const update = t.mock.method(Team, 'updateOne', async () => ({}));
  await syncUserMemberships(user);
  assert.equal(update.mock.callCount(), 1);
  assert.equal(update.mock.calls[0].arguments[1].$set['people.$.name'], 'Updated');
  assert.equal(update.mock.calls[0].arguments[1].$set['people.$.permission'], 'member');
});
