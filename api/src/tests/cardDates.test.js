import test from 'node:test';
import assert from 'node:assert/strict';
import { cardDateLabels } from '../../../web/src/utils/cardDates.js';

test('cards display calendar age and optional remaining days', () => {
  const now = new Date(2026, 9, 26, 12);
  assert.deepEqual(cardDateLabels({ createdAt: new Date(2026, 9, 26, 1).toISOString() }, now), { age: 'Hoje', deadline: null, overdue: false });
  assert.deepEqual(cardDateLabels({ createdAt: new Date(2026, 9, 25, 23).toISOString(), dueDate: '2026-10-29' }, now), { age: 'Há 1 dia', deadline: '3 dias', overdue: false });
  assert.equal(cardDateLabels({ dueDate: '2026-10-26' }, now).deadline, 'Vence hoje');
  assert.equal(cardDateLabels({ dueDate: '2026-10-24' }, now).deadline, '2 dias');
  assert.equal(cardDateLabels({ dueDate: '2026-10-24' }, now).overdue, true);
  assert.equal(cardDateLabels({ dueDate: '2026-10-25' }, now).deadline, '1 dia');
  assert.equal(cardDateLabels({ createdAt: 'invalid', dueDate: 'invalid' }, now).deadline, null);
});
