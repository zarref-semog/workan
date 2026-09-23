import { isDeepStrictEqual } from 'node:util';
import { fieldKey, fieldValue } from './stepValidation.js';

const plain = (value) => JSON.parse(JSON.stringify(value));
export function preserveCardHistory(cards, previousCards, steps, canManage = false) {
  const previousById = new Map(previousCards.map((card) => [String(card._id), card]));
  return cards.map((card) => {
    const previous = previousById.get(String(card._id));
    if (!previous) return { ...card, stepDataHistory: [] };
    const previousHistory = previous.stepDataHistory || [];
    const submittedHistory = canManage ? (card.stepDataHistory ?? previousHistory).filter((entry) => previousHistory.some((old) =>
      old._id ? String(old._id) === String(entry._id) : String(old.stepId) === String(entry.stepId) && String(old.movedAt) === String(entry.movedAt))) : previousHistory;
    const history = submittedHistory.map((entry) => entry.toObject ? entry.toObject({ flattenMaps: true }) : entry);
    for (const entry of canManage ? [] : history) {
      const keys = Object.keys(entry.values instanceof Map ? Object.fromEntries(entry.values) : entry.values || {});
      for (const key of keys) {
        const read = (values) => values instanceof Map ? values.get(key) : values?.[key];
        if (!isDeepStrictEqual(plain(read(previous.fieldValues) ?? null), plain(read(card.fieldValues) ?? null))) {
          throw Object.assign(new Error('Os campos de uma etapa já concluída não podem ser alterados.'), { status: 403 });
        }
      }
      const step = steps.find((item) => String(item._id) === String(entry.stepId));
      const fields = step?.customFields || [];
      for (const field of fields) {
        if (!isDeepStrictEqual(plain(fieldValue(field, previous.fieldValues) ?? null), plain(fieldValue(field, card.fieldValues) ?? null))) {
          throw Object.assign(new Error('Os campos de uma etapa já concluída não podem ser alterados.'), { status: 403 });
        }
      }
    }
    if (String(previous.stepId) !== String(card.stepId)) {
      const step = steps.find((item) => String(item._id) === String(previous.stepId));
      if (step) history.push({ stepId: step._id, stepName: step.name,
        values: Object.fromEntries(step.customFields.map((field) => [fieldKey(field), fieldValue(field, card.fieldValues)]).filter(([, value]) => value !== undefined)),
        fieldLabels: Object.fromEntries(step.customFields.map((field) => [fieldKey(field), field.name])), movedAt: new Date() });
    }
    return { ...card, stepDataHistory: history };
  });
}
