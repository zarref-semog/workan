export function prepareCards(cards, existingCards, creator, now = new Date()) {
  if (!Array.isArray(cards)) throw Object.assign(new Error('Lista de cards inválida.'), { status: 400 });
  const existing = new Map(existingCards.map((card) => [String(card._id), card]));
  return cards.map((card) => {
    if (!card || typeof card.title !== 'string' || !card.title.trim() ||
        typeof card.description !== 'string' || !card.description.trim()) {
      throw Object.assign(new Error('Todo card deve ter título e descrição preenchidos.'), { status: 400 });
    }
    const previous = card._id ? existing.get(String(card._id)) : null;
    return {
      ...card,
      title: card.title.trim(),
      description: card.description.trim(),
      createdBy: previous ? previous.createdBy || null : creator._id,
      createdByName: previous ? previous.createdByName || '' : creator.name,
      createdAt: previous ? previous.createdAt || null : now,
      updatedAt: now,
    };
  });
}
