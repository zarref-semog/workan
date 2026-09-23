const dayNumber = (date) => Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000;
export function cardDateLabels(card, now = new Date()) {
  const created = card.createdAt ? new Date(card.createdAt) : null;
  const elapsed = created && !Number.isNaN(created.getTime()) ? Math.max(0, dayNumber(now) - dayNumber(created)) : null;
  // Due dates represent calendar days, not midnight in UTC.
  const due = card.dueDate ? new Date(`${String(card.dueDate).slice(0, 10)}T12:00:00`) : null;
  const remaining = due && !Number.isNaN(due.getTime()) ? dayNumber(due) - dayNumber(now) : null;
  return {
    age: elapsed === null ? 'Criação não registrada' : elapsed === 0 ? 'Hoje' : `Há ${elapsed} ${elapsed === 1 ? 'dia' : 'dias'}`,
    deadline: remaining === null ? null : remaining === 0 ? 'Vence hoje' : `${Math.abs(remaining)} ${Math.abs(remaining) === 1 ? 'dia' : 'dias'}`,
    overdue: remaining !== null && remaining < 0,
  };
}
