// Old names are used only to convert persisted boards without changing their IDs.
export async function migrateBoardExamples(db) {
  const boards = db.collection('boards');
  if (!await db.listCollections({ name: 'boards' }).hasNext()) return;
  await boards.updateMany({ $or: [
    { templateKey: { $exists: true } }, { isTemplate: { $exists: true } },
  ] }, [
    { $set: {
      exampleKey: { $ifNull: ['$exampleKey', { $ifNull: ['$templateKey', '$$REMOVE'] }] },
      isExample: { $ifNull: ['$isExample', { $ifNull: ['$isTemplate', false] }] },
    } },
    { $unset: ['templateKey', 'isTemplate'] },
  ]);
  for (const index of await boards.indexes()) {
    if (index.key.templateKey) await boards.dropIndex(index.name);
  }
}
