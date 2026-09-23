import { mkdir, writeFile, readFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function uploadPath(id) {
  if (!/^[a-f0-9]{24}$/i.test(String(id))) throw Object.assign(new Error('Arquivo inválido.'), { status: 400 });
  return path.join(process.env.UPLOADS_DIR || fileURLToPath(new URL('../../uploads/', import.meta.url)), String(id));
}
export async function storeFile(id, data) {
  const destination = uploadPath(id);
  await mkdir(path.dirname(destination), { recursive: true });
  try { await writeFile(destination, data, { flag: 'wx' }); }
  catch (error) {
    if (error.code !== 'EEXIST' || !(await readFile(destination)).equals(data)) throw error;
  }
}
export async function removeFile(id) {
  try { await unlink(uploadPath(id)); } catch (error) { if (error.code !== 'ENOENT') throw error; }
}
export const attachmentUrl = (id) => `/api/files/${id}`;

export function attachmentIds(cards) {
  const result = new Set();
  const visit = (value) => {
    if (!value || typeof value !== 'object') return;
    if (value.fileId) result.add(String(value.fileId));
    for (const item of value instanceof Map ? value.values() : Object.values(value)) visit(item);
  };
  for (const card of cards || []) {
    visit(card.fieldValues);
    for (const entry of card.stepDataHistory || []) visit(entry.values);
  }
  return result;
}
