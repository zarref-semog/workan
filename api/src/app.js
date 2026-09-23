import express from 'express';
import cors from 'cors';
import { config } from './config/env.js';
import { authorize } from './middleware/authorize.js';
import { errorHandler } from './middleware/errorHandler.js';
import routes from './routes/index.js';

// Importing the app never opens a database connection or HTTP listener.
export function createApp() {
  const app = express();
  app.use(cors({ origin: config.clientUrl }));
  app.use('/api/files', express.json({ limit: '8mb' }));
  app.use(express.json({ limit: '2mb' }));
  app.use('/api', authorize, routes);
  app.use(errorHandler);
  return app;
}
