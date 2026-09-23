import test from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcrypt';
import { User } from '../models/index.js';
import { ensureInitialAdmin } from '../services/initialAdmin.js';

const settings = { name: ' First Admin ', email: ' ADMIN@EXAMPLE.TEST ', password: 'FirstAccess!2026' };

test('empty database receives one active superadmin with a hashed password and no team', async (t) => {
  let inserted;
  t.mock.method(User, 'exists', async () => inserted ? { _id: 'existing' } : null);
  const save = t.mock.method(User, 'updateOne', async (filter, update, options) => {
    assert.deepEqual(filter, { email: 'admin@example.test' });
    assert.equal(options.upsert, true);
    assert.deepEqual(Object.keys(update), ['$setOnInsert']);
    inserted = update.$setOnInsert;
  });
  await ensureInitialAdmin(settings);
  assert.equal(inserted.name, 'First Admin');
  assert.equal(inserted.permission, 'superadmin');
  assert.equal(inserted.active, true);
  assert.equal(inserted.initials, 'FA');
  assert.equal(inserted.teamIds, undefined);
  assert.notEqual(inserted.password, settings.password);
  assert.equal(await bcrypt.compare(settings.password, inserted.password), true);
  await ensureInitialAdmin({ ...settings, password: 'Changed' });
  assert.equal(save.mock.callCount(), 1);
});

test('existing users prevent bootstrap regardless of their role or email', async (t) => {
  t.mock.method(User, 'exists', async () => ({ _id: 'member' }));
  const save = t.mock.method(User, 'updateOne', async () => assert.fail('Must not write users'));
  await ensureInitialAdmin(settings);
  assert.equal(save.mock.callCount(), 0);
});

test('invalid initial administrator configuration is rejected before writing', async (t) => {
  t.mock.method(User, 'exists', async () => null);
  t.mock.method(User, 'updateOne', async () => assert.fail('Must not write users'));
  await assert.rejects(ensureInitialAdmin({ ...settings, email: 'invalid' }), /administrador inicial/);
});
