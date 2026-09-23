import { Router } from 'express';
import { BrandingSetting } from '../models/index.js';
import mongoose from 'mongoose';
import { readFile } from 'node:fs/promises';
import { storeFile, uploadPath, removeFile } from '../services/fileStorage.js';
const router = Router();
router.get('/logo/:id', async (req, res, next) => {
  try {
    const settings = await BrandingSetting.findOne({ key: 'default' }).lean();
    if (settings?.logoUrl !== `/api/appearance/logo/${req.params.id}`) return res.sendStatus(404);
    const data = await readFile(uploadPath(req.params.id));
    res.set('X-Content-Type-Options', 'nosniff').type(data[0] === 0x89 ? 'png' : 'jpg').send(data);
  } catch (error) { if (error.code === 'ENOENT') return res.sendStatus(404); next(error); }
});
router.get('/', async (_req, res, next) => {
  try {
    let settings = await BrandingSetting.findOne({ key: 'default' }).lean();
    if (!settings) settings = (await BrandingSetting.create({ key: 'default' })).toObject();
    // Upgrade the previous default identity while preserving custom branding.
    if (['ProcMap', 'workan', 'Workan'].includes(settings.appName)) settings.appName = '';
    if (settings.tagline === 'Processos claros.') settings.tagline = '';
    if (['/workan-logo.svg'].includes(settings.logoUrl)) settings.logoUrl = '';
    res.json(settings);
  }
  catch (error) { next(error); }
});
router.put('/', async (req, res, next) => {
  try {
    const { logoImage, ...data } = req.body;
    let uploadedId;
    if (logoImage) {
      const bytes = Buffer.from(typeof logoImage.content === 'string' ? logoImage.content : '', 'base64');
      const png = bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
      const jpg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
      if (!bytes.length || bytes.length > 1024 * 1024 || !((png && /\.png$/i.test(logoImage.name)) || (jpg && /\.jpe?g$/i.test(logoImage.name)))) {
        return res.status(400).json({ message: 'Selecione uma imagem JPG ou PNG de até 1 MB.' });
      }
      uploadedId = new mongoose.Types.ObjectId().toString();
      await storeFile(uploadedId, bytes);
      data.logoUrl = `/api/appearance/logo/${uploadedId}`;
    }
    try { res.json(await BrandingSetting.findOneAndUpdate({ key: 'default' }, data, { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }).lean()); }
    catch (error) { if (uploadedId) await removeFile(uploadedId); throw error; }
  }
  catch (error) { next(error); }
});


export default router;
