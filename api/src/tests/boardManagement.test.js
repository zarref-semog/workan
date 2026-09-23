import test from 'node:test';
import assert from 'node:assert/strict';
import { Board, Team, User } from '../models/index.js';
import { normalizedFieldName } from '../validations/stepValidation.js';
import { normalizedFieldName as browserName } from '../../../web/src/utils/stepValidation.js';
import { validateStepConfiguration, validateBoardManager } from '../services/boards.js';
import { isBoardManager, canAssignBoardManager } from '../validations/boardManagement.js';
import { assertBoardAccess, boardAccessFilter } from '../validations/boardAccess.js';

test('field names ignore casing and word separators within the same step', async () => {
  const names = ['NomeCompleto', 'nomeCompleto', 'nome_completo', 'NOME COMPLETO', 'nome-completo'];
  for (const normalize of [normalizedFieldName, browserName]) assert.equal(new Set(names.map(normalize)).size, 1);
  for (const name of names.slice(1)) {
    const board = new Board({ steps: [{ name: 'A', customFields: [{ name: names[0] }, { name }] }] });
    await assert.rejects(validateStepConfiguration(board.steps), { status: 400 });
  }
  const board = new Board({ steps: [{ name: 'A', customFields: [{ name: 'Nome' }] }, { name: 'B', customFields: [{ name: 'Nome' }] }] });
  await validateStepConfiguration(board.steps);
});

test('assigned managers can access only their board and cannot delegate their role', async (t) => {
  const user = new User({ name: 'Manager', permission: 'member' });
  const other = new User({ name: 'Other', permission: 'member' });
  const team = new Team({ name: 'Team' });
  const board = new Board({ name: 'Private', teamId: team._id, managerId: user._id });
  const teams = [team];
  assert.equal(isBoardManager(user, board), true);
  assert.equal(isBoardManager(other, board), false);
  assert.equal(canAssignBoardManager(user, board, teams), false);
  assert.doesNotThrow(() => assertBoardAccess(board, user, teams));
  assert.throws(() => assertBoardAccess(new Board({ name: 'Other', teamId: team._id }), user, teams), { status: 403 });
  assert.deepEqual(boardAccessFilter(user, teams).$or[0], { managerId: user._id });
  await assert.rejects(validateBoardManager({ managerId: other._id }, board, user, teams), { status: 403 });
  await validateBoardManager({ managerId: user._id }, board, user, teams);
  t.mock.method(User, 'exists', async () => ({ _id: other._id }));
  for (const permission of ['admin', 'superadmin']) await validateBoardManager({ managerId: other._id }, board, { permission }, teams);
  team.people.push({ _id: other._id, name: 'Leader', permission: 'teamlead' });
  await validateBoardManager({ managerId: user._id }, { teamId: team._id }, other, teams);
});
