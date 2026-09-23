import bcrypt from 'bcrypt';
import { User } from '../models/index.js';
import { config } from '../config/env.js';

// Initial access belongs to application setup, not to the optional examples.
export async function ensureInitialAdmin(settings = config.initialAdmin) {
  if (await User.exists({})) return;
  const name = settings.name.trim();
  const email = settings.email.trim().toLowerCase();
  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !settings.password) {
    throw new Error('Configure nome, e-mail e senha válidos para o administrador inicial.');
  }
  const password = await bcrypt.hash(settings.password, 12);
  await User.updateOne({ email }, { $setOnInsert: {
    name, email, password, active: true, permission: 'superadmin', mustChangePassword: true,
    initials: name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase(),
  } }, { upsert: true, runValidators: true, setDefaultsOnInsert: true });
}
