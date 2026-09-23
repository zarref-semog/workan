import test from 'node:test';
import assert from 'node:assert/strict';
import { Board, Team, User, BrandingSetting } from '../models/index.js';
import { seedExamples } from '../example/seed.js';

test('startup seed writes only empty teams and board examples', async (t) => {
  const teams = [];
  t.mock.method(Team, 'updateOne', async (filter, update) => {
    assert.deepEqual(update.$setOnInsert.people, []);
    teams.push({ ...update.$setOnInsert, _id: filter.name });
  });
  t.mock.method(Team, 'find', () => ({ lean: async () => teams }));
  t.mock.method(Board, 'findOne', () => ({ select: async () => null }));
  const writes = t.mock.method(Board, 'updateOne', async () => ({}));
  for (const Model of [User, BrandingSetting]) {
    for (const method of ['create', 'updateOne', 'updateMany', 'find', 'findOne']) {
      t.mock.method(Model, method, () => assert.fail('Seed must not access users or branding'));
    }
  }
  await seedExamples();
  assert.equal(teams.length, 5);
  const examples = writes.mock.calls.map((call) => call.arguments[1].$setOnInsert).filter(Boolean);
  assert.equal(examples.length, 6);
  for (const example of examples) {
    assert.equal(example.ownerId, null);
    assert.deepEqual(example.memberIds, []);
    assert.deepEqual(example.cards, []);
    assert.ok(example.steps.length > 0);
  }
});
