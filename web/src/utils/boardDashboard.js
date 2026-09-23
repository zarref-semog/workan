import { allowedNextStepIds, missingRequiredFields } from './stepValidation.js';

export function boardDashboard(cards, steps, visibleSteps = steps, now = new Date()) {
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const distribution = visibleSteps.map((step) => ({ step, count: 0 }));
  const byId = new Map(distribution.map((item) => [String(item.step._id), item]));
  const totals = { total: 0, terminal: 0, overdue: 0, incomplete: 0 };
  const attention = [];
  for (const card of cards) {
    const item = byId.get(String(card.stepId));
    if (!item) continue;
    totals.total++;
    item.count++;
    const terminal = !allowedNextStepIds(item.step, steps).length;
    const overdue = !terminal && !!card.dueDate && String(card.dueDate).slice(0, 10) < today;
    const missing = missingRequiredFields(item.step, card.fieldValues);
    if (terminal) totals.terminal++;
    if (overdue) totals.overdue++;
    if (missing.length) totals.incomplete++;
    if (overdue || missing.length) attention.push({ card, step: item.step, overdue, missing });
  }
  attention.sort((a, b) => Number(b.overdue) - Number(a.overdue) || String(a.card.dueDate || '9999').localeCompare(String(b.card.dueDate || '9999')));
  return { totals, distribution, attention };
}
