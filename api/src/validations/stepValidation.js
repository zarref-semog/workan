export function missingRequiredFields(step, values = {}) {
  return (step.customFields || []).filter((field) => {
    if (!field.required) return false;
    const value = values instanceof Map ? values.get(field.name) : values?.[field.name];
    if (field.type === 'file') return !value || typeof value.fileId !== 'string' || !/^[a-f0-9]{24}$/i.test(value.fileId) || typeof value.name !== 'string' || !value.name.trim();
    if (field.type === 'checkbox') return value !== true;
    return value === undefined || value === null || (typeof value === 'string' && !value.trim());
  }).map((field) => field.name);
}

export function allowedNextStepIds(step, steps) {
  if (Array.isArray(step.nextStepIds)) return step.nextStepIds.map(String);
  const ordered = [...steps].sort((a, b) => a.order - b.order);
  const index = ordered.findIndex((item) => String(item._id) === String(step._id));
  return index >= 0 && ordered[index + 1] ? [String(ordered[index + 1]._id)] : [];
}

export function stepAssigneeIds(step) {
  return (step.assigneeIds ?? (step.assigneeId ? [step.assigneeId] : [])).map(String);
}

export function canEditStep(step, user, teams = []) {
  if (!step) return false;
  if (step.assigneeTeamId) {
    return teams.some((team) => String(team._id) === String(step.assigneeTeamId) &&
      team.people.some((person) => String(person._id) === String(user?._id)));
  }
  const ids = stepAssigneeIds(step);
  return !ids.length || ids.includes(String(user?._id));
}

export function validateCardTransitions(cards, previousCards, steps) {
  const previousById = new Map(previousCards.map((card) => [String(card._id), card]));
  for (const card of cards) {
    const previous = card._id && previousById.get(String(card._id));
    if (!previous || String(previous.stepId) === String(card.stepId)) continue;
    const source = steps.find((step) => String(step._id) === String(previous.stepId));
    const destination = steps.find((step) => String(step._id) === String(card.stepId));
    if (!source || !destination) {
      throw Object.assign(new Error('Etapa de origem ou destino inválida.'), { status: 400 });
    }
    if (!allowedNextStepIds(source, steps).includes(String(destination._id))) {
      throw Object.assign(new Error(`A etapa "${destination.name}" não é um destino permitido para "${source.name}".`), { status: 400 });
    }
    const missing = missingRequiredFields(source, card.fieldValues);
    if (missing.length) {
      throw Object.assign(new Error(`Preencha os campos obrigatórios da etapa "${source.name}" antes de mover o card: ${missing.join(', ')}.`), { status: 400 });
    }
  }
}
