import test from 'node:test';
import assert from 'node:assert/strict';
import { migrateBoardSteps } from '../migrations/stepsAndUsers.js';
import { Board, Team, User } from '../models/index.js';
import { normalizeTeamPeople, setUserTeams } from '../utils/teamMemberships.js';

test('renaming stored workflow preserves IDs, branches, field values and history', () => {
  const board = {
    phases: [{ _id: 'one', nextPhaseIds: ['two'], customFields: [{ name: 'A' }] }, { _id: 'two', nextPhaseIds: [] }],
    cards: [{ _id: 'card', phaseId: 'two', fieldValues: { A: 0 }, phaseDataHistory: [
      { _id: 'history', phaseId: 'one', phaseName: 'Entrada', values: { A: 0 }, movedAt: '2026-01-01' },
    ] }],
  };
  const result = migrateBoardSteps(board);
  assert.deepEqual(result.steps[0].nextStepIds, ['two']);
  assert.deepEqual(result.steps[1].nextStepIds, []);
  assert.equal(result.cards[0].stepId, 'two');
  assert.deepEqual(result.cards[0].stepDataHistory[0], {
    _id: 'history', stepId: 'one', stepName: 'Entrada', values: { A: 0 }, movedAt: '2026-01-01',
  });
  assert.deepEqual(result.cards[0].fieldValues, { A: 0 });
  assert.equal(result.cards[0].phaseId, undefined);
  assert.equal(result.steps[0].nextPhaseIds, undefined);
  assert.deepEqual(migrateBoardSteps(result), result, 'Migration can safely run again');
});

test('legacy unconfigured workflow remains unconfigured during migration', () => {
  assert.equal(migrateBoardSteps({ phases: [{ name: 'Entrada' }] }).steps[0].nextStepIds, undefined);
});

test('teams no longer require codes and users default to active', async () => {
  const team = new Team({ name: 'Equipe', code: 'OLD' });
  await team.validate();
  assert.equal(team.toObject().code, undefined);
  const user = new User({ name: 'Pessoa', email: 'p@example.com', password: 'hash', role: 'Antiga' });
  await user.validate();
  assert.equal(user.active, true);
  assert.equal(user.toObject().role, undefined);
  const board = new Board({ name: 'Quadro', teamId: team._id, steps: [{ name: 'Entrada' }] });
  await board.validate();
  assert.equal(board.steps[0].name, 'Entrada');
});

test('administrative permissions reject team assignment and remove existing memberships', async (t) => {
  const user = new User({ name: 'Admin', email: 'admin@example.com', permission: 'admin' });
  t.mock.method(User, 'find', async () => [user]);
  const remove = t.mock.method(Team, 'updateMany', async () => ({}));
  const add = t.mock.method(Team, 'updateOne', async () => ({}));
  for (const permission of ['admin', 'superadmin']) {
    user.permission = permission;
    await assert.rejects(normalizeTeamPeople([{ _id: user._id }]), { status: 400 });
    await setUserTeams(user, [new Team()._id]);
  }
  assert.equal(add.mock.callCount(), 0);
  assert.equal(remove.mock.callCount(), 2);
  assert.deepEqual(remove.mock.calls[0].arguments[0], { _id: { $nin: [] } });
});
