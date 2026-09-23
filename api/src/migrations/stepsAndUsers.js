// Legacy field names occur only here to preserve existing boards during the rename.
export function migrateBoardSteps(board) {
  const steps = (board.steps ?? board.phases ?? []).map(({ nextPhaseIds, ...step }) => ({
    ...step,
    ...(step.nextStepIds !== undefined ? {} : nextPhaseIds !== undefined ? { nextStepIds: nextPhaseIds } : {}),
  }));
  const cards = (board.cards || []).map(({ phaseId, phaseDataHistory, ...card }) => ({
    ...card,
    stepId: card.stepId ?? phaseId,
    stepDataHistory: (card.stepDataHistory ?? phaseDataHistory ?? []).map(({ phaseId, phaseName, ...entry }) => ({
      ...entry, stepId: entry.stepId ?? phaseId, stepName: entry.stepName ?? phaseName,
    })),
  }));
  return { steps, cards };
}

export async function migrateStepsAndUsers(db) {
  const migrations = db.collection('migrations');
  const migrationId = 'steps-and-user-forms-v1';
  if (await migrations.findOne({ _id: migrationId })) return;
  for await (const board of db.collection('boards').find()) {
    await db.collection('boards').updateOne({ _id: board._id }, {
      $set: migrateBoardSteps(board), $unset: { phases: '' },
    });
  }
  const teams = db.collection('teams');
  if (await db.listCollections({ name: 'teams' }).hasNext()) {
    for (const index of await teams.indexes()) {
      if (index.key.code) await teams.dropIndex(index.name);
    }
  }
  const administrators = await db.collection('users').find({ permission: { $in: ['superadmin', 'admin'] } }).toArray();
  await teams.updateMany({}, { $pull: { people: { $or: [
    { _id: { $in: administrators.map((user) => user._id) } },
    { email: { $in: administrators.map((user) => user.email) } },
  ] } } });
  await teams.updateMany({}, { $unset: { code: '' } });
  await teams.updateMany({ people: { $type: 'array' } }, { $unset: { 'people.$[].role': '' } });
  await db.collection('users').updateMany({}, { $unset: { role: '' } });
  await db.collection('users').updateMany({ active: { $exists: false } }, { $set: { active: true } });
  await migrations.updateOne({ _id: migrationId }, { $setOnInsert: { completedAt: new Date() } }, { upsert: true });
}
