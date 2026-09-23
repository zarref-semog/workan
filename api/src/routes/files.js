import { Router } from 'express';
import mongoose from 'mongoose';
import { Attachment } from '../models/index.js';
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
    const file = await Attachment.create({ name: name.trim(), data, size: data.length, uploadedBy: req.auth.sub });
    res.status(201).json({ fileId: file.id, name: file.name, size: file.size });
  } catch (error) { next(error); }
});
router.get('/:id', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Arquivo inválido.' });
    const file = await Attachment.findById(req.params.id).select('+data');
    if (!file) return res.status(404).json({ message: 'Arquivo não encontrado.' });
    res.set('Content-Type', 'application/octet-stream');
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(file.name).replace(/'/g, '%27')}`);
    res.send(file.data);
  } catch (error) { next(error); }
});


export default router;
