import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { seedExamples } from '../example/seed.js';
import { migrateBoardExamples } from '../migrations/boardExamples.js';
import { Board, Team, User } from '../models/index.js';
import { normalizeTeamPeople, setUserTeams, usersWithTeams, validateTeamIds } from '../utils/teamMemberships.js';

test('shared memberships, initial counts and repeatable seed', { skip: !process.env.TEST_MONGODB_URI }, async () => {
  const uri = process.env.TEST_MONGODB_URI;
  const database = new URL(uri).pathname.slice(1);
  assert.match(database, /^workan_test_memberships_/);
  let created = false;
  try {
    await mongoose.connect(uri, { autoCreate: false, autoIndex: false });
    assert.equal((await mongoose.connection.db.listCollections().toArray()).length, 0, 'Use a new isolated test database');
    created = true;
    await seedExamples();
    const original = await Board.findOne({ exampleKey: 'recruitment' });
    await Board.collection.updateOne({ _id: original._id }, {
      $set: { templateKey: 'legacy-recruitment', isTemplate: true, name: 'Customized recruitment' },
      $unset: { exampleKey: '', isExample: '' },
    });
    await migrateBoardExamples(mongoose.connection.db);
    await migrateBoardExamples(mongoose.connection.db);
    await seedExamples();
    const migrated = await Board.findOne({ exampleKey: 'recruitment' });
    assert.equal(String(migrated._id), String(original._id));
    assert.equal(migrated.name, 'Customized recruitment');
    const teams = await Team.find().lean();
    const byName = Object.fromEntries(teams.map((team) => [team.name, team]));
    assert.equal(await User.countDocuments(), 0);
    assert.equal(await Board.countDocuments(), 6);
    for (const board of await Board.find()) {
      assert.equal(board.ownerId, null);
      assert.equal(board.memberIds.length, 0);
      assert.equal(board.cards.length, 0);
    }
    for (const [code, count] of Object.entries({ Vendas: 0, Financeiro: 0, Tecnologia: 0, 'Jurídico': 0, 'Recursos Humanos': 0 })) {
      assert.equal(byName[code].people.length, count, code);
    }
    const user = await User.create({ name: 'Test member', email: 'member@example.test', password: 'test-only', permission: 'member' });
    const selected = [String(byName.Vendas._id), String(byName.Financeiro._id)];
    assert.deepEqual(await validateTeamIds([...selected, selected[0]]), selected);
    await setUserTeams(user, selected);
    await setUserTeams(user, selected);
    assert.deepEqual(new Set((await usersWithTeams([user]))[0].teamIds), new Set(selected));
    assert.equal((await Team.findById(byName.Financeiro._id)).people.length, 1);
    await setUserTeams(user, [selected[1]]);
    await seedExamples();
    assert.deepEqual((await usersWithTeams([user]))[0].teamIds, [selected[1]], 'Restart must not restore a removed membership');
    const normalized = await normalizeTeamPeople([{ _id: user._id, name: 'Forged' }, { _id: user._id }]);
    assert.equal(normalized.length, 1);
    assert.equal(normalized[0].name, user.name);
    assert.equal(normalized[0].password, undefined);
    const admin = await User.create({ name: 'Test admin', email: 'admin@example.test', password: 'test-only', permission: 'superadmin' });
    await setUserTeams(admin, selected);
    assert.deepEqual((await usersWithTeams([admin]))[0].teamIds, []);
    await assert.rejects(normalizeTeamPeople([{ _id: admin._id }]), { status: 400 });
    await assert.rejects(validateTeamIds(['invalid']), { status: 400 });
    await assert.rejects(validateTeamIds([new mongoose.Types.ObjectId().toString()]), { status: 400 });
  } finally {
    if (created) await mongoose.connection.db.dropDatabase();
    await mongoose.disconnect();
  }
});
