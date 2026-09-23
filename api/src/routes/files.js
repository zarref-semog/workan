import { readFile } from 'node:fs/promises';
import { storeFile, removeFile, uploadPath, attachmentUrl, attachmentIds } from '../services/fileStorage.js';
import { Router } from 'express';
import mongoose from 'mongoose';
import { Attachment, Board } from '../models/index.js';
const router = Router();
router.post('/', async (req, res, next) => {
  try {
    const { name, content } = req.body;
    if (typeof name !== 'string' || !name.trim() || name.length > 255 || typeof content !== 'string') {
      return res.status(400).json({ message: 'Arquivo inválido.' });
    }
    const data = Buffer.from(content, 'base64');
    if (data.toString('base64') !== content) return res.status(400).json({ message: 'Conteúdo do arquivo inválido.' });
    if (data.length > 5 * 1024 * 1024) return res.status(413).json({ message: 'O arquivo deve ter no máximo 5 MB.' });
    const id = new mongoose.Types.ObjectId();
    await storeFile(id, data);
    let file;
    try { file = await Attachment.create({ _id: id, name: name.trim(), url: attachmentUrl(id), size: data.length, uploadedBy: req.auth.sub }); }
    catch (error) { await removeFile(id); throw error; }
    res.status(201).json({ fileId: file.id, name: file.name, size: file.size, url: file.url });
  } catch (error) { next(error); }
});
router.get('/:id', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Arquivo inválido.' });
    const file = await Attachment.findById(req.params.id);
    if (!file) return res.status(404).json({ message: 'Arquivo não encontrado.' });
    res.set('Content-Type', 'application/octet-stream');
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(file.name).replace(/'/g, '%27')}`);
    try { res.send(await readFile(uploadPath(req.params.id))); }
    catch (error) { if (error.code === 'ENOENT') return res.status(404).json({ message: 'Arquivo indisponivel.' }); throw error; }
  } catch (error) { next(error); }
});


router.delete('/:id', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Arquivo invalido.' });
    const file = await Attachment.findById(req.params.id);
    if (!file) return res.status(404).json({ message: 'Arquivo nao encontrado.' });
    if (String(file.uploadedBy) !== String(req.auth.sub) && !['admin', 'superadmin'].includes(req.currentUser.permission)) return res.status(403).json({ message: 'Sem permissao para excluir este arquivo.' });
    const boards = await Board.find().select('cards').lean();
    if (boards.some((board) => attachmentIds(board.cards).has(req.params.id))) return res.status(409).json({ message: 'Remova o anexo do card antes de excluir. Anexos do historico sao preservados.' });
    await removeFile(req.params.id);
    await Attachment.deleteOne({ _id: req.params.id });
    res.status(204).end();
  } catch (error) { next(error); }
});

export default router;
