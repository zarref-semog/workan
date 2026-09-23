export const normalizedFieldName = (name) => String(name || "").normalize("NFKC").toLowerCase().replace(/[\s_\-]+/gu, "");
export const fieldKey = (field) => String(field.key || field._id || field.name);
export function fieldValue(field, values = {}) {
  const key = fieldKey(field);
  return values instanceof Map ? (values.has(key) ? values.get(key) : values.get(field.legacyName || field.name)) : (Object.hasOwn(values || {}, key) ? values[key] : values?.[field.legacyName || field.name]);
}

export function missingRequiredFields(step, values = {}) {
  return (step.customFields || []).filter((field) => {
    if (!field.required) return false;
    const value = fieldValue(field, values);
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

export function canEditStep(step, user, teams = [], card) {
  if (!step) return false;
  if (step.assigneeMode === 'owner') return !!card?.createdBy && String(card.createdBy) === String(user?._id);
  if (step.assigneeMode === 'anyone') return true;
  if (step.assigneeTeamId) {
    return teams.some((team) => String(team._id) === String(step.assigneeTeamId) &&
      team.people.some((person) => String(person._id) === String(user?._id)));
  }
  const ids = stepAssigneeIds(step);
  return !ids.length || ids.includes(String(user?._id));
}
