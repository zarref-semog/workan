import { Router } from 'express';
import { BrandingSetting } from '../models/index.js';
const router = Router();
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
  try { res.json(await BrandingSetting.findOneAndUpdate({ key: 'default' }, req.body, { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }).lean()); }
  catch (error) { next(error); }
});


export default router;
