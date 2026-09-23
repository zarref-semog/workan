import test from 'node:test';
import assert from 'node:assert/strict';
import { Board, Team } from '../models/index.js';
import { fieldValue, fieldKey, missingRequiredFields, canEditStep, validateCardTransitions } from '../validations/stepValidation.js';
import { fieldValue as browserValue, canEditStep as browserCanEdit } from '../../../web/src/utils/stepValidation.js';
import { validateCardPermissions } from '../validations/cardPermissions.js';
import { validateGroups, validateStepConfiguration } from '../services/boards.js';

test('same-name fields are independent, with legacy values readable', () => {
  const first = { key: 'first', name: 'Status', required: true };
  const second = { key: 'second', name: 'Status', required: true };
  for (const read of [fieldValue, browserValue]) {
    assert.equal(read(first, { first: 'A', second: 'B' }), 'A');
    assert.equal(read(second, { first: 'Changed', second: 'B' }), 'B');
    assert.equal(read(first, { Status: 'Legacy' }), 'Legacy');
    assert.equal(read(first, { Status: 'Legacy', first: '' }), '');
  }
  assert.deepEqual(missingRequiredFields({ customFields: [first, second] }, { first: 'A', second: '' }), ['Status']);
  assert.equal(fieldKey({ _id: 'existing-id', name: 'Old field' }), 'existing-id');
  assert.equal(fieldValue(first, new Map([['first', 'Map value']])), 'Map value');
});

test('owner-only cards reject changes and moves by anyone other than the creator', () => {
  const step = { _id: 'a', assigneeMode: 'owner', nextStepIds: ['b'], customFields: [{ key: 'required', name: 'Name', required: true }] };
  const nextStep = { _id: 'b' };
  const card = { _id: 'card', createdBy: 'owner', stepId: 'a', title: 'Card', fieldValues: { required: 'Filled' } };
  const moved = { ...card, stepId: 'b' };
  for (const check of [canEditStep, browserCanEdit]) {
    assert.equal(check(step, { _id: 'owner' }, [], card), true);
    assert.equal(check(step, { _id: 'other', permission: 'superadmin' }, [], card), false);
    assert.equal(check(step, { _id: 'owner' }, [], { ...card, createdBy: null }), false);
    assert.equal(check({ assigneeMode: 'anyone' }, { _id: 'other' }, [], card), true);
  }
  assert.throws(() => validateCardPermissions([{ ...moved, createdBy: 'other' }], [card], [step, nextStep], { _id: 'other' }, []), { status: 403 });
  assert.doesNotThrow(() => validateCardPermissions([moved], [card], [step, nextStep], { _id: 'owner' }, []));
  assert.doesNotThrow(() => validateCardTransitions([moved], [card], [step, nextStep]));
  assert.throws(() => validateCardTransitions([{ ...moved, fieldValues: { required: '' } }], [card], [step, nextStep]), { status: 400 });
});

test('groups share the board steps and reject orphaned cards or duplicate keys', async () => {
  const board = new Board({ name: 'Project', teamId: new Team()._id, groups: [{ key: 'sprint-1', name: 'Sprint 1' }, { key: 'sprint-2', name: 'Sprint 2' }], steps: [{ name: 'Entry' }] });
  board.cards.push(...['sprint-1', 'sprint-2'].map((groupId) => ({ title: groupId, description: 'Work', groupId, stepId: board.steps[0]._id })));
  await board.validate();
  validateGroups(board);
  assert.equal(board.steps.length, 1);
  assert.equal(board.toObject().cards[1].groupId, 'sprint-2');
  board.cards[0].groupId = 'missing';
  assert.throws(() => validateGroups(board), { status: 400 });
  board.cards[0].groupId = null;
  validateGroups(board);
  board.groups[1].key = 'sprint-1';
  assert.throws(() => validateGroups(board), { status: 400 });
});

test('blank board names and duplicate field identifiers are rejected', async () => {
  const board = new Board({ name: '   ', teamId: new Team()._id, steps: [{ name: 'Entry', customFields: [{ key: 'same', name: 'A' }, { key: 'same', name: 'B' }] }] });
  await assert.rejects(board.validate(), /name/);
  await assert.rejects(validateStepConfiguration(board.steps), { status: 400 });
});
