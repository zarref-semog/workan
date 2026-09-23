import test from 'node:test';
import assert from 'node:assert/strict';
import { canManageBoardCards } from '../validations/boardManagement.js';
import { preserveCardHistory } from '../validations/cardHistory.js';
import { validateCardTransitions } from '../validations/stepValidation.js';

test('card management is limited to the assigned manager, corresponding leader and administrators', () => {
  const board = { teamId: 'team', managerId: 'manager' };
  const teams = [{ _id: 'team', people: [{ _id: 'leader', permission: 'teamlead' }] }, { _id: 'other', people: [{ _id: 'outsider', permission: 'teamlead' }] }];
  for (const id of ['manager', 'leader']) assert.equal(canManageBoardCards({ _id: id, permission: 'member' }, board, teams), true);
  for (const permission of ['admin', 'superadmin']) assert.equal(canManageBoardCards({ _id: 'admin', permission }, board, teams), true);
  for (const id of ['member', 'outsider']) assert.equal(canManageBoardCards({ _id: id, permission: 'member' }, board, teams), false);
});

test('management can edit or remove completed data and bypass links while required fields remain enforced', () => {
  const steps = [{ _id: 'a', name: 'A', nextStepIds: [], customFields: [{ key: 'value', name: 'Value', required: true }] }, { _id: 'b', name: 'B', customFields: [] }];
  const before = { _id: 'card', stepId: 'a', fieldValues: { value: 'old' }, stepDataHistory: [{ _id: 'history', stepId: 'a', values: { value: 'old' } }] };
  const edited = { ...before, fieldValues: { value: 'new' }, stepDataHistory: [{ ...before.stepDataHistory[0], values: { value: 'new' } }] };
  assert.throws(() => preserveCardHistory([edited], [before], steps), { status: 403 });
  assert.equal(preserveCardHistory([edited], [before], steps, true)[0].stepDataHistory[0].values.value, 'new');
  const cleared = { ...before, fieldValues: {}, stepDataHistory: [] };
  assert.deepEqual(preserveCardHistory([cleared], [before], steps, true)[0].stepDataHistory, []);
  const moved = { ...edited, stepId: 'b' };
  assert.throws(() => validateCardTransitions([moved], [before], steps), { status: 400 });
  assert.doesNotThrow(() => validateCardTransitions([moved], [before], steps, true));
  assert.throws(() => validateCardTransitions([{ ...moved, fieldValues: {} }], [before], steps, true), { status: 400 });
  const spoofed = { ...moved, stepDataHistory: [...edited.stepDataHistory, { stepId: 'a', values: { value: 'fake' } }] };
  assert.equal(preserveCardHistory([spoofed], [before], steps, true)[0].stepDataHistory.length, 2);
});
