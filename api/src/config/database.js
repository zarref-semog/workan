import mongoose from 'mongoose';
import { config } from './env.js';
import { migrateTeams } from '../migrations/teams.js';
import { migrateStepsAndUsers } from '../migrations/stepsAndUsers.js';
import { migrateBoardExamples } from '../migrations/boardExamples.js';

export async function connectDatabase() {
  await mongoose.connect(config.mongoUri);
  await migrateTeams(mongoose.connection.db);
  await migrateStepsAndUsers(mongoose.connection.db);
  await migrateBoardExamples(mongoose.connection.db);
}
