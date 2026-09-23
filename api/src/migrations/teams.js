// Legacy names are confined to this one-time data migration.
export async function migrateTeams(db) {
  const migrations = db.collection('migrations');
  const migrationId = 'teams-naming-v1';
  if (await migrations.findOne({ _id: migrationId })) return;

  const legacyExists = await db.listCollections({ name: 'departments' }).hasNext();
  if (legacyExists) {
    const teams = db.collection('teams');
    for await (const team of db.collection('departments').find()) {
      const { _id, ...data } = team;
      await teams.updateOne({ _id }, { $setOnInsert: data }, { upsert: true });
    }
  }

  await db.collection('boards').updateMany(
    { sharedDepartmentIds: { $exists: true } },
    [
      { $set: { sharedTeamIds: { $setUnion: [
        { $ifNull: ['$sharedTeamIds', []] },
        { $ifNull: ['$sharedDepartmentIds', []] },
      ] } } },
      { $unset: 'sharedDepartmentIds' },
    ],
  );
  await db.collection('boards').updateMany(
    { visibility: { $in: ['department', 'team'] } },
    { $set: { visibility: 'private' } },
  );

  // Keep the original collection as a backup; never overwrite existing teams.
  await migrations.updateOne(
    { _id: migrationId },
    { $setOnInsert: { completedAt: new Date() } },
    { upsert: true },
  );
}
