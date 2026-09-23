import { createApp } from './app.js';
import { config } from './config/env.js';
import { connectDatabase } from './config/database.js';
import { seedExamples } from './example/seed.js';
import { ensureInitialAdmin } from './services/initialAdmin.js';

connectDatabase()
  .then(() => ensureInitialAdmin())
  .then(seedExamples)
  .then(() => createApp().listen(config.port, () => console.log(`workan API em http://localhost:${config.port}`)))
  .catch((error) => {
    console.error('Falha ao iniciar a API:', error.message);
    process.exit(1);
  });
