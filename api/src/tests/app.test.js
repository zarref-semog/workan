import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { createApp } from '../app.js';
import { config } from '../config/env.js';
import { Attachment, Board, BrandingSetting, Team, User } from '../models/index.js';

test('HTTP routes preserve authentication, permissions and resource behavior', async (t) => {
  const server = createApp().listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const id = '000000000000000000000001';
  const token = jwt.sign({ sub: id }, config.jwtSecret);
  const request = (path, { authorized = false, body, ...options } = {}) => fetch(base + path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(authorized ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

  await t.test('health and appearance are public; resources require a session', async (t) => {
    assert.equal((await request('/health')).status, 200);
    const response = await request('/boards');
    assert.equal(response.status, 401);
    t.mock.method(BrandingSetting, 'findOne', () => ({ lean: async () => ({ appName: 'Brand' }) }));
    assert.equal((await (await request('/appearance')).json()).appName, 'Brand');
  });

  await t.test('login returns a token and hides the password; inactive users are rejected', async (t) => {
    t.mock.method(Team, 'find', () => ({ lean: async () => [] }));
    const user = new User({ _id: id, name: 'Test', email: 'test@example.test', password: 'hash', permission: 'member' });
    t.mock.method(User, 'findOne', () => ({ select: async () => user }));
    t.mock.method(bcrypt, 'compare', async () => true);
    const response = await request('/auth/login', { method: 'POST', body: { email: user.email, password: 'password' } });
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.equal(result.user.password, undefined);
    assert.equal(jwt.verify(result.token, config.jwtSecret).sub, id);
    user.active = false;
    assert.equal((await request('/auth/login', { method: 'POST', body: { email: user.email } })).status, 401);
  });

  await t.test('current database permission controls route access', async (t) => {
    t.mock.method(User, 'findById', async () => ({ _id: id, permission: 'admin' }));
    assert.equal((await request('/boards', { authorized: true })).status, 403);
    const response = await request('/settings/permissions', { authorized: true });
    assert.equal(response.status, 200);
    assert.deepEqual((await response.json()).roles.member, ['manageCards']);
    assert.equal((await request('/settings/permissions', { authorized: true, method: 'PUT', body: {} })).status, 405);
  });

  await t.test('member board writes preserve card-only restrictions', async (t) => {
    const actor = new User({ _id: id, name: 'Member', email: 'member@example.test', permission: 'member' });
    const team = new Team({ name: 'Team' });
    const board = new Board({ name: 'Original', ownerId: actor._id, teamId: team._id, steps: [{ name: 'Entrada' }], cards: [] });
    t.mock.method(User, 'findById', async () => actor);
    t.mock.method(Board, 'findById', async () => board);
    t.mock.method(Team, 'findById', async () => team);
    t.mock.method(Team, 'find', () => ({ lean: async () => [team.toObject()] }));
    const save = t.mock.method(Board, 'findByIdAndUpdate', async (_id, updates) => ({ ...board.toObject(), ...updates }));
    const response = await request(`/boards/${board._id}`, { authorized: true, method: 'PUT', body: { name: 'Forbidden', steps: [], cards: [] } });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).name, 'Original');
    assert.equal(save.mock.calls[0].arguments[1].steps, undefined);
    assert.equal((await request('/boards', { authorized: true, method: 'POST', body: {} })).status, 403);
  });

  await t.test('leadership grants configuration access only in the corresponding team', async (t) => {
    const actor = new User({ _id: id, name: 'Pessoa', permission: 'member' });
    const leadTeam = new Team({ name: 'A', people: [{ _id: id, name: 'Pessoa', permission: 'teamlead' }] });
    const memberTeam = new Team({ name: 'B', people: [{ _id: id, name: 'Pessoa', permission: 'member' }] });
    const leadBoard = new Board({ name: 'A', teamId: leadTeam._id, steps: [], cards: [] });
    const memberBoard = new Board({ name: 'B', teamId: memberTeam._id, steps: [], cards: [] });
    t.mock.method(User, 'findById', async () => actor);
    t.mock.method(Team, 'find', () => ({ lean: async () => [leadTeam, memberTeam] }));
    t.mock.method(Team, 'findById', async (teamId) => String(teamId) === String(leadTeam._id) ? leadTeam : memberTeam);
    t.mock.method(Board, 'findById', async (boardId) => String(boardId) === String(leadBoard._id) ? leadBoard : memberBoard);
    t.mock.method(Board, 'findByIdAndUpdate', async (_id, updates) => updates);
    const update = (board) => request(`/boards/${board._id}`, { authorized: true, method: 'PUT', body: { name: 'Changed', cards: [] } });
    const allowed = await update(leadBoard);
    assert.equal(allowed.status, 200);
    assert.equal((await allowed.json()).name, 'Changed');
    const limited = await update(memberBoard);
    assert.equal(limited.status, 403);
    assert.equal((await request(`/boards/${memberBoard._id}`, { authorized: true, method: 'DELETE' })).status, 403);
    assert.equal((await request(`/teams/${memberTeam._id}`, { authorized: true, method: 'PUT', body: { people: [] } })).status, 403);
    assert.equal((await request(`/boards/${leadBoard._id}`, { authorized: true, method: 'PUT', body: { teamId: memberTeam._id } })).status, 403);
  });

  await t.test('team validation errors still reach the shared error handler', async (t) => {
    t.mock.method(User, 'findById', async () => ({ _id: id, permission: 'teamlead' }));
    t.mock.method(Team, 'findById', async () => ({ people: [{ _id: id, permission: 'teamlead' }] }));
    const response = await request(`/teams/${id}`, { authorized: true, method: 'PUT', body: { $set: { name: 'Invalid' } } });
    assert.equal(response.status, 400);
    assert.match((await response.json()).message, /equipe/);
  });

  await t.test('unrelated teams cannot read, update or delete private boards', async (t) => {
    const actor = new User({ _id: id, permission: 'teamlead' });
    const hr = new Team({ name: 'RH', people: [] });
    const tech = new Team({ name: 'TI', people: [{ _id: id, name: 'Tech user' }] });
    const board = new Board({ name: 'RH privado', teamId: hr._id, sharedTeamIds: [hr._id] });
    t.mock.method(User, 'findById', async () => actor);
    t.mock.method(Team, 'find', () => ({ lean: async () => [hr.toObject(), tech.toObject()] }));
    t.mock.method(Team, 'findById', async () => hr);
    t.mock.method(Board, 'findById', async () => board);
    t.mock.method(Board, 'findByIdAndUpdate', () => assert.fail('Must not update inaccessible board'));
    t.mock.method(Board, 'findByIdAndDelete', () => assert.fail('Must not delete inaccessible board'));
    for (const method of ['GET', 'PUT', 'DELETE']) {
      const response = await request(`/boards/${board._id}`, { authorized: true, method,
        ...(method === 'PUT' ? { body: { visibility: 'public', sharedUserIds: [id] } } : {}) });
      assert.equal(response.status, 403, method);
    }
    board.sharedUserIds = [id];
    assert.equal((await request(`/boards/${board._id}`, { authorized: true })).status, 403);
    actor.permission = 'member';
    assert.equal((await request(`/boards/${board._id}`, { authorized: true })).status, 200);
  });

  await t.test('file upload and download retain response contracts and headers', async (t) => {
    t.mock.method(User, 'findById', async () => ({ _id: id, permission: 'member' }));
    let stored;
    t.mock.method(Attachment, 'create', async (data) => { stored = { ...data, id }; return stored; });
    t.mock.method(Attachment, 'findById', () => ({ select: async () => stored }));
    const response = await request('/files', { authorized: true, method: 'POST', body: { name: 'file.txt', content: Buffer.from('content').toString('base64') } });
    assert.equal(response.status, 201);
    assert.deepEqual(await response.json(), { fileId: id, name: 'file.txt', size: 7 });
    const download = await request(`/files/${id}`, { authorized: true });
    assert.equal(download.status, 200);
    assert.equal(download.headers.get('x-content-type-options'), 'nosniff');
    assert.match(download.headers.get('content-disposition'), /^attachment;/);
    assert.equal(await download.text(), 'content');
  });

  await t.test('user creation and password reset remain accessible to administrators', async (t) => {
    t.mock.method(User, 'findById', async () => ({ _id: id, permission: 'admin' }));
    const hash = t.mock.method(bcrypt, 'hash', async () => 'hashed-password');
    t.mock.method(Team, 'updateMany', async () => ({}));
    const create = t.mock.method(User, 'create', async (data) => new User({ ...data, _id: id }));
    const response = await request('/users', { authorized: true, method: 'POST', body: {
      name: 'Admin', email: 'admin@example.test', permission: 'admin', teamIds: ['invalid'], password: 'client-password',
    } });
    assert.equal(response.status, 201);
    const user = await response.json();
    assert.equal(user.password, undefined);
    assert.deepEqual(user.teamIds, []);
    assert.equal(create.mock.calls[0].arguments[0].active, true);
    assert.equal(hash.mock.calls[0].arguments[0], config.defaultUserPassword);
    t.mock.method(User, 'findByIdAndUpdate', async () => user);
    const reset = await request(`/users/${id}/reset-password`, { authorized: true, method: 'POST' });
    assert.equal(reset.status, 200);
    assert.equal((await reset.json()).defaultPassword, config.defaultUserPassword);
  });
});
