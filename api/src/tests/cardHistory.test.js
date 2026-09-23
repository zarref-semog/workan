import test from 'node:test';
import assert from 'node:assert/strict';
import { preserveCardHistory } from '../validations/cardHistory.js';

test('moving creates a server-owned snapshot and later changes cannot rewrite it', () => {
  const steps = [{ _id: 'a', name: 'Entry', customFields: [{ key: 'field', name: 'Value' }] }, { _id: 'b', name: 'Next', customFields: [] }];
  const before = { _id: 'card', stepId: 'a', fieldValues: { field: 'Original' }, stepDataHistory: [] };
  const [moved] = preserveCardHistory([{ ...before, stepId: 'b', stepDataHistory: [{ values: { field: 'Forged' } }] }], [before], steps);
  assert.equal(moved.stepDataHistory[0].values.field, 'Original');
  assert.throws(() => preserveCardHistory([{ ...moved, fieldValues: { field: 'Changed' } }], [moved], steps), { status: 403 });
  assert.throws(() => preserveCardHistory([{ ...moved, fieldValues: {} }], [moved], []), { status: 403 });
  const [retained] = preserveCardHistory([{ ...moved, stepDataHistory: [] }], [moved], steps);
  assert.deepEqual(retained.stepDataHistory, moved.stepDataHistory);
});
