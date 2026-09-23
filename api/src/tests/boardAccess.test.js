import test from 'node:test';
import assert from 'node:assert/strict';
import { boardParticipants, assertBoardAccess, boardAccessFilter } from '../validations/boardAccess.js';
import { boardParticipants as browserParticipants } from '../../../web/src/utils/boardAccess.js';
import { boardMemberDirectory } from '../../../web/src/utils/boardAccess.js';

const hr = { _id: 'hr-user', permission: 'member' };
const tech = { _id: 'tech-user', permission: 'member' };
const owner = { _id: 'owner', permission: 'superadmin' };
const teams = [{ _id: 'hr', people: [hr] }, { _id: 'tech', people: [tech] }];
const board = { visibility: 'private', ownerId: owner._id, teamId: 'hr', sharedTeamIds: ['hr'], sharedUserIds: [], memberIds: [tech._id] };

test('member directory includes sharing candidates separately and excludes administrators', () => {
  const admin = { _id: 'admin', permission: 'admin' };
  const inactive = { _id: 'inactive', permission: 'member', active: false };
  const directory = boardMemberDirectory(board, [hr, tech, owner, admin, inactive, hr], teams);
  assert.deepEqual(directory.members, [hr]);
  assert.deepEqual(directory.candidates, [tech]);
  assert.deepEqual(boardMemberDirectory({ ...board, sharedUserIds: [tech._id, admin._id] }, [hr, tech, admin], teams), {
    members: [hr, tech], candidates: [],
  });
});

test('private board participants exclude unrelated teams and stale memberIds', () => {
  const users = [tech, hr, owner];
  assert.deepEqual(boardParticipants(board, users, teams), [hr, owner]);
  assert.deepEqual(browserParticipants(board, users, teams), [hr, owner]);
  assert.doesNotThrow(() => assertBoardAccess(board, hr, teams));
  assert.throws(() => assertBoardAccess(board, tech, teams), { status: 403 });
  assert.doesNotThrow(() => assertBoardAccess(board, owner, teams));
});

test('explicit sharing grants access and removing it revokes access', () => {
  assert.doesNotThrow(() => assertBoardAccess({ ...board, sharedUserIds: [tech._id] }, tech, teams));
  assert.doesNotThrow(() => assertBoardAccess({ ...board, sharedTeamIds: ['tech'] }, tech, teams));
  assert.throws(() => assertBoardAccess(board, tech, teams), { status: 403 });
  assert.deepEqual(boardParticipants({ ...board, visibility: 'public' }, [hr, tech], teams), [hr, tech]);
});

test('board listing query uses the current users teams, not all teams', () => {
  const filter = boardAccessFilter(tech, teams);
  assert.deepEqual(filter.$or.find((item) => item.teamId), { teamId: { $in: ['tech'] } });
  assert.deepEqual(filter.$or.find((item) => item.sharedTeamIds), { sharedTeamIds: { $in: ['tech'] } });
  assert.deepEqual(boardAccessFilter(owner, teams), {});
});

test('leaders only see boards owned by teams they lead, even with public or explicit sharing', () => {
  const leader = { _id: tech._id, permission: 'teamlead' };
  const scopedTeams = [{ _id: 'hr', people: [{ ...leader, permission: 'member' }] }, { _id: 'tech', people: [leader] }];
  assert.deepEqual(boardAccessFilter(leader, scopedTeams), { teamId: { $in: ['tech'] } });
  for (const visibility of ['private', 'public']) {
    const other = { ...board, visibility, ownerId: leader._id, sharedUserIds: [leader._id], sharedTeamIds: ['tech'] };
    assert.throws(() => assertBoardAccess(other, leader, scopedTeams), { status: 403 });
    assert.deepEqual(browserParticipants(other, [leader], scopedTeams), []);
  }
  assert.doesNotThrow(() => assertBoardAccess({ ...board, teamId: 'tech' }, leader, scopedTeams));
});
