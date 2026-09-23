import { Router } from 'express';
import { Board, Team } from '../models/index.js';
import { prepareTeam } from '../services/teams.js';

const router = Router();

router.get('/', async (_req, res, next) => {
  try { res.json(await Team.find().sort({ updatedAt: -1 })); }
  catch (error) { next(error); }
});
router.get('/:id', async (req, res, next) => {
  try {
    const team = await Team.findById(req.params.id);
    team ? res.json(team) : res.status(404).json({ message: 'Registro não encontrado' });
  } catch (error) { next(error); }
});
router.post('/', async (req, res, next) => {
  try {
    const data = { ...req.body };
    if (req.currentUser.permission !== 'superadmin') data.people = [
      ...(data.people || []).filter((person) => String(person._id) !== String(req.currentUser._id)).map((person) => ({ ...person, permission: 'member' })),
      { _id: req.currentUser._id, permission: 'teamlead' },
    ];
    res.status(201).json(await Team.create(await prepareTeam(data)));
  }
  catch (error) { next(error); }
});
router.put('/:id', async (req, res, next) => {
  try {
    const current = await Team.findById(req.params.id);
    if (!current) return res.status(404).json({ message: 'Equipe não encontrada.' });
    const updates = await prepareTeam(req.body, current, req.currentUser);
    const saved = await Team.findOneAndUpdate({ _id: current._id, __v: current.__v }, { $set: updates, $inc: { __v: 1 } }, { new: true, runValidators: true });
    if (!saved) return res.status(409).json({ message: 'A equipe foi alterada. Atualize a página e tente novamente.' });
    res.json(saved);
  }
  catch (error) { next(error); }
});
router.delete('/:id', async (req, res, next) => {
  try {
    if (await Board.exists({ teamId: req.params.id })) return res.status(409).json({ message: 'Transfira os quadros desta equipe antes de excluir.' });
    await Team.findByIdAndDelete(req.params.id);
    res.status(204).end();
  } catch (error) { next(error); }
});

export default router;
