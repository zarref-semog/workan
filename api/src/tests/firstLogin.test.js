import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { createApp } from '../app.js';
import { config } from '../config/env.js';
import { User, Team } from '../models/index.js';

test('existing users with the default password must change it regardless of role', async (t) => {
  const server = createApp().listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const user = new User({ name: 'Existing', email: 'existing@example.test', password: await bcrypt.hash(config.defaultUserPassword, 4) });
  t.mock.method(User, 'findOne', () => ({ select: async () => user }));
  t.mock.method(Team, 'find', () => ({ lean: async () => [] }));
  const update = t.mock.method(User, 'updateOne', async () => ({ matchedCount: 1 }));
  for (const permission of ['member', 'teamlead', 'admin', 'superadmin']) {
    user.permission = permission;
    user.mustChangePassword = false;
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user.email, password: config.defaultUserPassword }),
    });
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.equal(result.user.mustChangePassword, true, permission);
    assert.equal(result.user.password, undefined);
  }
  assert.equal(update.mock.callCount(), 4);
});

test('first login requires a confirmed new password before accessing resources', async (t) => {
  const server = createApp().listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const user = new User({ name: 'New user', email: 'new@example.test', password: await bcrypt.hash('Temporary123!', 4), mustChangePassword: true, permission: 'superadmin' });
  const token = jwt.sign({ sub: user.id }, config.jwtSecret);
  t.mock.method(User, 'findById', () => ({ then: (resolve) => Promise.resolve(user).then(resolve), select: async () => user }));
  t.mock.method(Team, 'find', () => ({ lean: async () => [] }));
  const save = t.mock.method(User, 'findOneAndUpdate', async (_filter, update) => {
    user.password = update.$set.password;
    user.mustChangePassword = update.$set.mustChangePassword;
    return user;
  });
  const request = (path, body) => fetch(`http://127.0.0.1:${server.address().port}/api${path}`, {
    method: body ? 'POST' : 'GET', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  assert.equal((await request('/boards')).status, 403);
  assert.equal((await request('/users')).status, 403);
  const me = await (await request('/auth/me')).json();
  assert.equal(me.mustChangePassword, true);
  assert.equal(me.password, undefined);
  for (const body of [
    { newPassword: 'short', confirmPassword: 'short' },
    { newPassword: 'NewPassword123!', confirmPassword: 'different' },
    { newPassword: 'Temporary123!', confirmPassword: 'Temporary123!' },
    { newPassword: 'a'.repeat(73), confirmPassword: 'a'.repeat(73) },
  ]) assert.equal((await request('/auth/change-password', body)).status, 400);
  assert.equal(save.mock.callCount(), 0);
  const changed = await request('/auth/change-password', { newPassword: 'Personal123!', confirmPassword: 'Personal123!' });
  assert.equal(changed.status, 200);
  const result = await changed.json();
  assert.equal(result.mustChangePassword, false);
  assert.equal(result.password, undefined);
  assert.equal(await bcrypt.compare('Personal123!', user.password), true);
  assert.equal((await (await request('/auth/me')).json()).mustChangePassword, false);
  assert.equal((await request('/auth/change-password', { newPassword: 'Another123!', confirmPassword: 'Another123!' })).status, 409);
});
