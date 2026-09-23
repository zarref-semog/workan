import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Attachment } from '../models/index.js';
import { storeFile, removeFile, uploadPath } from '../services/fileStorage.js';
import { migrateAttachmentFiles } from '../migrations/attachmentFiles.js';

test('file volume preserves bytes and migrates existing attachments before removing database bytes', async (t) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'workan-file-storage-'));
  const previous = process.env.UPLOADS_DIR;
  process.env.UPLOADS_DIR = directory;
  t.after(async () => { if (previous === undefined) delete process.env.UPLOADS_DIR; else process.env.UPLOADS_DIR = previous; await rm(directory, { recursive: true }); });
  const id = '000000000000000000000001';
  const bytes = Buffer.from([0, 1, 255, 42]);
  const legacy = { _id: id, name: 'document.pdf', data: { value: () => bytes } };
  t.mock.method(Attachment.collection, 'find', () => (async function* () { if (legacy.data) yield legacy; })());
  const update = t.mock.method(Attachment.collection, 'updateOne', async (_filter, change) => {
    assert.deepEqual(await readFile(uploadPath(id)), bytes);
    assert.equal(change.$unset.data, '');
    legacy.url = change.$set.url;
    delete legacy.data;
  });
  await migrateAttachmentFiles();
  await migrateAttachmentFiles();
  assert.equal(update.mock.callCount(), 1);
  assert.equal(legacy.url, `/api/files/${id}`);
  await storeFile(id, bytes);
  await assert.rejects(storeFile(id, Buffer.from('different')));
  assert.throws(() => uploadPath('../secret'), { status: 400 });
  await removeFile(id);
  await assert.rejects(readFile(uploadPath(id)), { code: 'ENOENT' });
  await removeFile(id);
});
