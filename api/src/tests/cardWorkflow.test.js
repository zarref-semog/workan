import test from 'node:test';
import assert from 'node:assert/strict';
import { Board } from '../models/index.js';
import { allowedNextStepIds, canEditStep, missingRequiredFields, validateCardTransitions } from '../validations/stepValidation.js';
import { validateCardPermissions, validateCardLocations } from '../validations/cardPermissions.js';
import * as browserRules from '../../../web/src/utils/stepValidation.js';

const id = (value) => value.toString(16).padStart(24, '0');
const user = { _id: id(10), permission: 'superadmin' };
const other = { _id: id(11) };
const steps = [
  { _id: id(1), name: 'Entrada', order: 0, nextStepIds: [id(2), id(3)], customFields: [{ name: 'Nome', required: true, type: 'text' }] },
  { _id: id(2), name: 'Análise', order: 1, assigneeId: user._id, nextStepIds: [id(3)] },
  { _id: id(3), name: 'Fim', order: 2, nextStepIds: [] },
];
const card = { _id: id(20), title: 'Pedido', description: 'Descrição', stepId: id(1), fieldValues: { Nome: 'Ana' } };
const status = (expected) => (error) => error.status === expected;
const cast = (cards) => new Board({ cards }).cards;

test('required attachments block transitions until a stored file is supplied', async () => {
  const step = { ...steps[0], customFields: [{ name: 'Documento', type: 'file', required: true }] };
  const configured = [step, ...steps.slice(1)];
  for (const value of [undefined, null, '', {}, { name: 'arquivo.pdf' }, { fileId: 'invalid', name: 'arquivo.pdf' }]) {
    const changed = { ...card, stepId: steps[1]._id, fieldValues: { Documento: value } };
    assert.throws(() => validateCardTransitions([changed], [card], configured), status(400));
    assert.deepEqual(browserRules.missingRequiredFields(step, changed.fieldValues), ['Documento']);
  }
  const values = { Documento: { fileId: id(40), name: 'arquivo.pdf', size: 100 } };
  assert.doesNotThrow(() => validateCardTransitions([{ ...card, stepId: steps[1]._id, fieldValues: values }], [card], configured));
  const board = new Board({ name: 'Arquivos', teamId: id(30), steps: configured, cards: [{ ...card, fieldValues: values }] });
  await board.validate();
  assert.deepEqual(board.cards[0].fieldValues.get('Documento'), values.Documento);
});

test('multiple step owners can edit and move cards; removing owners preserves legacy compatibility', () => {
  const step = { ...steps[1], assigneeId: null, assigneeIds: [user._id, other._id] };
  const configured = [steps[0], step, steps[2]];
  const previous = cast([{ ...card, stepId: step._id }]);
  const changed = cast([{ ...card, stepId: steps[2]._id }]);
  for (const actor of [user, other]) {
    assert.equal(canEditStep(step, actor), true);
    assert.equal(browserRules.canEditStep(step, actor), true);
    assert.doesNotThrow(() => validateCardPermissions(changed, previous, configured, actor, []));
  }
  assert.throws(() => validateCardPermissions(changed, previous, configured, { _id: id(99) }, []), status(403));
  assert.equal(canEditStep({ ...step, assigneeIds: [user._id] }, other), false);
  assert.equal(canEditStep({ ...step, assigneeIds: [] }, other), true);
  assert.equal(canEditStep(steps[1], user), true);
  const stored = new Board({ steps: [step] });
  assert.deepEqual(stored.steps[0].assigneeIds.map(String), [user._id, other._id]);
});

test('branching, forbidden destinations, terminal steps and legacy sequential fallback', () => {
  for (const stepId of [id(2), id(3)]) {
    assert.doesNotThrow(() => validateCardTransitions([{ ...card, stepId }], [card], steps));
  }
  assert.throws(() => validateCardTransitions([{ ...card, stepId: id(1) }], [{ ...card, stepId: id(2) }], steps), status(400));
  assert.throws(() => validateCardTransitions([{ ...card, stepId: id(1) }], [{ ...card, stepId: id(3) }], steps), status(400));
  assert.throws(() => validateCardTransitions([{ ...card, stepId: id(99) }], [card], steps), status(400));
  const legacy = steps.map(({ nextStepIds, ...step }) => step);
  assert.deepEqual(allowedNextStepIds(legacy[0], legacy), [id(2)]);
  assert.deepEqual(allowedNextStepIds(legacy[2], legacy), []);
  assert.throws(() => validateCardTransitions([{ ...card, stepId: id(3) }], [card], legacy), status(400));
});

test('required fields block leaving, while drafts can remain incomplete', () => {
  for (const value of [undefined, null, '', '  ']) {
    const draft = { ...card, fieldValues: { Nome: value } };
    assert.doesNotThrow(() => validateCardTransitions([draft], [card], steps));
    assert.throws(() => validateCardTransitions([{ ...draft, stepId: id(2) }], [card], steps), status(400));
  }
  const step = { customFields: [
    { name: 'Aceito', type: 'checkbox', required: true },
    { name: 'Quantidade', type: 'number', required: true },
  ] };
  assert.deepEqual(missingRequiredFields(step, new Map([['Aceito', false], ['Quantidade', 0]])), ['Aceito']);
  assert.deepEqual(missingRequiredFields(step, { Aceito: true, Quantidade: 0 }), []);
});

test('step owner permissions apply to editing, moving and deleting, without administrator bypass', () => {
  const previous = cast([{ ...card, stepId: id(2) }]);
  for (const cards of [cast([{ ...card, stepId: id(2), title: 'Outro' }]), cast([{ ...card, stepId: id(3) }]), []]) {
    assert.doesNotThrow(() => validateCardPermissions(cards, previous, steps, user, []));
    assert.throws(() => validateCardPermissions(cards, previous, steps, { ...other, permission: 'superadmin' }, []), status(403));
  }
  const roundTrip = cast(JSON.parse(JSON.stringify(previous)));
  assert.doesNotThrow(() => validateCardPermissions(roundTrip, previous, steps, other, []));
  assert.throws(() => validateCardPermissions(cast([card, card]), previous, steps, user, []), status(400));
});

test('team membership determines access; card assignee cannot override step responsibility', () => {
  const teamStep = { ...steps[1], assigneeId: null, assigneeTeamId: id(30) };
  const teams = [{ _id: id(30), people: [user] }];
  assert.equal(canEditStep(teamStep, user, teams), true);
  assert.equal(canEditStep(teamStep, other, teams), false);
  assert.equal(canEditStep(teamStep, user, []), false);
  const previous = cast([{ ...card, stepId: id(2), assigneeId: other._id }]);
  const changed = cast([{ ...card, stepId: id(2), assigneeId: other._id, title: 'Mudou' }]);
  const teamSteps = [steps[0], teamStep, steps[2]];
  assert.throws(() => validateCardPermissions(changed, previous, teamSteps, other, teams), status(403));
  assert.doesNotThrow(() => validateCardPermissions(changed, previous, teamSteps, user, teams));
});

test('new cards start at entry and existing cards cannot be orphaned by step removal', () => {
  assert.doesNotThrow(() => validateCardLocations([card], [], steps));
  assert.throws(() => validateCardLocations([{ ...card, stepId: id(2) }], [], steps), status(400));
  assert.doesNotThrow(() => validateCardLocations([{ ...card, stepId: id(2) }], [card], steps));
  assert.throws(() => validateCardLocations([card], [card], steps.slice(1)), status(400));
});

test('step configuration survives Mongoose serialization, including explicit terminal state', async () => {
  const board = new Board({ name: 'Fluxo', teamId: id(30), steps, cards: [card] });
  await board.validate();
  assert.deepEqual(board.toObject().steps[2].nextStepIds, []);
  const legacy = new Board({ steps: [{ name: 'Legada' }] });
  assert.equal(legacy.steps[0].nextStepIds, undefined);
});

test('browser and API apply the same workflow rules', () => {
  for (const step of steps) {
    assert.deepEqual(browserRules.allowedNextStepIds(step, steps), allowedNextStepIds(step, steps));
    for (const actor of [user, other]) assert.equal(browserRules.canEditStep(step, actor), canEditStep(step, actor));
    assert.deepEqual(browserRules.missingRequiredFields(step, {}), missingRequiredFields(step, {}));
  }
});
