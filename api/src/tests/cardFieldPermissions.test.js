import test from 'node:test';
import assert from 'node:assert/strict';
import { validateCardFieldPermissions, validateCardPermissions } from '../validations/cardPermissions.js';

test('only the creator can delete without board management, regardless of step ownership', () => {
  const card = { _id: 'card', createdBy: 'creator', stepId: 'step', assigneeId: 'owner' };
  const steps = [{ _id: 'step', assigneeIds: ['owner'] }];
  assert.doesNotThrow(() => validateCardPermissions([], [card], steps, { _id: 'creator' }, []));
  assert.throws(() => validateCardPermissions([], [card], steps, { _id: 'owner' }, []), { status: 403 });
  assert.throws(() => validateCardPermissions([], [card], [{ _id: 'step', assigneeMode: 'anyone' }], { _id: 'member' }, []), { status: 403 });
});

test('card fields enforce creator, self-assignment, responsibility and management permissions', () => {
  const card = { _id: 'card', createdBy: 'creator', title: 'Title', description: 'Description', assigneeId: 'owner', activities: [] };
  const check = (changes, id, manages = false) => validateCardFieldPermissions([{ ...card, ...changes }], [card], { _id: id }, manages);
  assert.doesNotThrow(() => check({ title: 'Updated' }, 'creator'));
  assert.throws(() => check({ title: 'Updated' }, 'owner'), { status: 403 });
  assert.throws(() => check({ description: 'Updated' }, 'admin', true), { status: 403 });
  assert.throws(() => check({ assigneeId: 'member' }, 'member'), { status: 403 });
  assert.throws(() => check({ assigneeId: 'other' }, 'member'), { status: 403 });
  assert.throws(() => check({ assigneeId: null }, 'member'), { status: 403 });
  assert.throws(() => check({ assigneeId: 'other' }, 'leader', true), { status: 403 });
  assert.doesNotThrow(() => check({ assigneeId: null }, 'leader', true));
  assert.doesNotThrow(() => check({ assigneeId: null }, 'owner'));
  assert.throws(() => check({ assigneeId: 'other' }, 'owner'), { status: 403 });
  assert.throws(() => check({ assigneeId: 'other' }, 'owner', true), { status: 403 });
  assert.doesNotThrow(() => check({ assigneeId: 'owner' }, 'owner'));
  for (const changes of [{ dueDate: '2026-12-01' }, { activities: [{ key: 'a', title: 'Task', completed: false }] }]) {
    assert.throws(() => check(changes, 'member'), { status: 403 });
    assert.doesNotThrow(() => check(changes, 'owner'));
    if (changes.dueDate) assert.throws(() => check(changes, 'leader', true), { status: 403 });
    else assert.doesNotThrow(() => check(changes, 'leader', true));
    assert.throws(() => check({ ...changes, assigneeId: 'member' }, 'member'), { status: 403 });
    const unassigned = { ...card, assigneeId: null };
    assert.doesNotThrow(() => validateCardFieldPermissions([{ ...unassigned, ...changes, assigneeId: 'member' }], [unassigned], { _id: 'member' }));
  }
});
