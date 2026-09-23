import { isDeepStrictEqual } from 'node:util';
import { canEditStep } from './stepValidation.js';

// Compare persisted card values, ignoring server-owned timestamps and subdocument IDs.
function editableValues(card) {
  const plain = card.toObject ? card.toObject({ flattenMaps: true }) : card;
  const { _id, createdAt, updatedAt, createdBy, createdByName, stepDataHistory = [], ...values } = plain;
  return JSON.parse(JSON.stringify({
    ...values,
    stepDataHistory: stepDataHistory.map(({ _id, ...entry }) => entry),
  }));
}

export function validateCardPermissions(cards, previousCards, steps, user, teams) {
  const incoming = new Map(cards.map((card) => [String(card._id), card]));
  if (incoming.size !== cards.length) throw Object.assign(new Error('IDs de cards duplicados.'), { status: 400 });
  for (const previous of previousCards) {
    const next = incoming.get(String(previous._id));
    if (next && isDeepStrictEqual(editableValues(previous), editableValues(next))) continue;
    const step = steps.find((item) => String(item._id) === String(previous.stepId));
    if (!canEditStep(step, user, teams)) {
      throw Object.assign(new Error('Apenas o responsável pela etapa ou um integrante da equipe responsável pode editar, excluir ou mover este card.'), { status: 403 });
    }
  }
}

export function validateCardLocations(cards, previousCards, steps) {
  const previousIds = new Set(previousCards.map((card) => String(card._id)));
  const first = [...steps].sort((a, b) => a.order - b.order)[0];
  for (const card of cards) {
    if (!steps.some((step) => String(step._id) === String(card.stepId))) {
      throw Object.assign(new Error('Etapa do card inválida.'), { status: 400 });
    }
    if (!previousIds.has(String(card._id)) && String(card.stepId) !== String(first?._id)) {
      throw Object.assign(new Error('Novos cards devem iniciar na primeira etapa do quadro.'), { status: 400 });
    }
  }
}
