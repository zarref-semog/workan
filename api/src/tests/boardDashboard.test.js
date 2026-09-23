import test from 'node:test';
import assert from 'node:assert/strict';
import { boardDashboard } from '../../../web/src/utils/boardDashboard.js';

test('dashboard respects filters, due dates and terminal steps', () => {
  const steps = [
    { _id: 'a', order: 0, nextStepIds: ['b'], customFields: [{ name: 'Nome', required: true }] },
    { _id: 'b', order: 1, nextStepIds: [] },
  ];
  const cards = [
    { _id: '1', stepId: 'a', dueDate: '2026-09-28', fieldValues: {} },
    { _id: '2', stepId: 'a', dueDate: '2026-09-29', fieldValues: { Nome: 'Ana' } },
    { _id: '3', stepId: 'b', dueDate: '2026-09-27' },
    { _id: '4', stepId: 'removed', dueDate: '2026-09-27' },
  ];
  const now = new Date(2026, 8, 29, 12);
  const all = boardDashboard(cards, steps, steps, now);
  assert.deepEqual(all.totals, { total: 3, terminal: 1, overdue: 1, incomplete: 1 });
  assert.deepEqual(all.distribution.map((item) => item.count), [2, 1]);
  assert.deepEqual(all.attention.map((item) => item.card._id), ['1']);
  const filtered = boardDashboard(cards, steps, [steps[0]], now);
  assert.equal(filtered.totals.terminal, 0);
  assert.equal(filtered.totals.total, 2);
  assert.deepEqual(boardDashboard(cards, steps, [], now).totals, { total: 0, terminal: 0, overdue: 0, incomplete: 0 });
});
