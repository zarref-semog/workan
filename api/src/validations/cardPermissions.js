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
    if (!next) {
      if (!previous.createdBy || String(previous.createdBy) !== String(user?._id)) {
        throw Object.assign(new Error('Somente o criador ou a liderança do quadro pode excluir este card.'), { status: 403 });
      }
      continue;
    }
    if (next && isDeepStrictEqual(editableValues(previous), editableValues(next))) continue;
    const step = steps.find((item) => String(item._id) === String(previous.stepId));
    if (!canEditStep(step, user, teams, previous)) {
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

export function validateCardFieldPermissions(cards, previousCards, user, manages = false) {
  const same = (a, b) => !!a && !!b && String(a) === String(b);
  const fail = (message) => { throw Object.assign(new Error(message), { status: 403 }); };
  for (const card of cards) {
    const previous = previousCards.find((item) => same(item._id, card._id));
    if (previous && !same(previous.createdBy, user._id) && (card.title !== previous.title || card.description !== previous.description)) fail('Somente o criador pode modificar o título e a descrição do card.');
    const owner = same(previous?.assigneeId, user._id);
    const claiming = !previous?.assigneeId && same(card.assigneeId, user._id);
    const assignmentChanged = String(card.assigneeId || '') !== String(previous?.assigneeId || '');
    if (assignmentChanged && !claiming && !((owner || manages) && !card.assigneeId)) fail('Você só pode assumir um card sem responsável ou remover a atribuição quando autorizado.');
    const responsible = owner || claiming;
    const date = (value) => value ? new Date(value).toISOString() : null;
    if (date(card.dueDate) !== date(previous?.dueDate) && !responsible) fail('Somente o responsável pode alterar o prazo.');
    if (!isDeepStrictEqual(JSON.parse(JSON.stringify(card.activities || [])), JSON.parse(JSON.stringify(previous?.activities || []))) && !responsible && !manages) fail('Somente o responsável ou a gestão pode gerenciar atividades.');
  }
}
