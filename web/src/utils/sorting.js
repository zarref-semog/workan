export const nameSortOptions = [['default', 'Ordem padrão'], ['name-asc', 'Nome: A–Z'], ['name-desc', 'Nome: Z–A']];

export function sortByName(items, order) {
  if (order === 'default') return [...items];
  return [...items].sort((a, b) => (order === 'name-desc' ? -1 : 1) * a.name.localeCompare(b.name, 'pt-BR', { numeric: true, sensitivity: 'base' }));
}
