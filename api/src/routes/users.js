import { Router } from 'express';
import bcrypt from 'bcrypt';
import { User, Team } from '../models/index.js';
import { validateTeamIds, usersWithTeams, syncUserMemberships } from '../utils/teamMemberships.js';
import { userFields, publicUser } from '../services/users.js';
import { config } from '../config/env.js';
const { defaultUserPassword } = config;
const router = Router();
async function leadershipSelection(data, previous) {
  const permission = data.permission ?? previous?.permission ?? 'member';
  if (permission !== 'teamlead') return previous?.permission === 'teamlead' ? [] : undefined;
  const ids = data.ledTeamIds ?? (previous ? (await usersWithTeams([previous]))[0].ledTeamIds : []);
  const validated = await validateTeamIds(ids);
  if (!validated.length) throw Object.assign(new Error('Selecione ao menos uma equipe que o usuário liderará.'), { status: 400 });
  const occupied = await Team.findOne({ _id: { $in: validated }, people: { $elemMatch: {
    permission: 'teamlead', ...(previous ? { _id: { $ne: previous._id } } : {}),
  } } });
  if (occupied) throw Object.assign(new Error(`A equipe "${occupied.name}" já possui um líder.`), { status: 409 });
  return validated;
}
router.get('/', async (_req, res, next) => {
  try { res.json(await usersWithTeams(await User.find().sort({ updatedAt: -1 }))); } catch (error) { next(error); }
});
router.get('/:id', async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    user ? res.json((await usersWithTeams([user]))[0]) : res.status(404).json({ message: 'Registro não encontrado.' });
  } catch (error) { next(error); }
});
router.post('/', async (req, res, next) => {
  try {
    const ledTeamIds = await leadershipSelection(req.body);
    const password = await bcrypt.hash(defaultUserPassword, 12);
    const user = await User.create({ ...userFields(req.body), password, active: true, mustChangePassword: true });
    await syncUserMemberships(user, ledTeamIds);
    res.status(201).json({ ...publicUser(user), teamIds: ledTeamIds || [], ledTeamIds: ledTeamIds || [] });
  } catch (error) { next(error); }
});
router.put('/:id', async (req, res, next) => {
  try {
    const previous = await User.findById(req.params.id);
    if (!previous) return res.status(404).json({ message: 'Usuário não encontrado.' });
    const ledTeamIds = await leadershipSelection(req.body, previous);
    const updates = userFields(req.body);
    const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    await syncUserMemberships(user, ledTeamIds, previous.email);
    res.json((await usersWithTeams([user]))[0]);
  } catch (error) { next(error); }
});
router.post('/:id/reset-password', async (req, res, next) => {
  try {
    const password = await bcrypt.hash(defaultUserPassword, 12);
    const user = await User.findByIdAndUpdate(req.params.id, { password, mustChangePassword: true }, { new: true, runValidators: true });
    if (!user) return res.status(404).json({ message: 'Usuário não encontrado.' });
    res.json({ message: 'Senha redefinida.', defaultPassword: defaultUserPassword });
  } catch (error) { next(error); }
});
router.delete('/:id', async (req, res, next) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (user) await Team.updateMany({}, { $pull: { people: { $or: [{ _id: user._id }, { email: user.email }] } } });
    res.status(204).end();
  } catch (error) { next(error); }
});


export default router;
