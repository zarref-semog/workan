import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { User, Team } from '../models/index.js';
import { leadsTeam } from '../validations/teamPermissions.js';
import { publicUser } from '../services/users.js';
import { config } from '../config/env.js';
const { jwtSecret } = config;
const router = Router();
const isDefaultPassword = (password) => [config.defaultUserPassword, config.initialAdmin.password].includes(password);
async function sessionUser(user) {
  const teams = await Team.find().lean();
  return { ...publicUser(user), ledTeamIds: teams.filter((team) => leadsTeam(user, team)).map((team) => String(team._id)) };
}
router.post('/login', async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const user = await User.findOne({ email }).select('+password');
    if (!user || user.active === false || !(await bcrypt.compare(String(req.body.password || ''), user.password))) {
      return res.status(401).json({ message: 'E-mail ou senha inválidos.' });
    }
    if (isDefaultPassword(String(req.body.password || '')) && !user.mustChangePassword) {
      const result = await User.updateOne({ _id: user._id, password: user.password }, { $set: { mustChangePassword: true } });
      if (!result.matchedCount) return res.status(409).json({ message: 'A senha foi alterada. Entre novamente.' });
      user.mustChangePassword = true;
    }
    const token = jwt.sign({ sub: user.id, permission: user.permission }, jwtSecret, { expiresIn: '8h' });
    res.json({ token, user: await sessionUser(user) });
  } catch (error) { next(error); }
});

router.post('/change-password', async (req, res, next) => {
  try {
    const { newPassword, confirmPassword } = req.body;
    if (typeof newPassword !== 'string' || newPassword.length < 8 || Buffer.byteLength(newPassword, 'utf8') > 72) {
      return res.status(400).json({ message: 'A nova senha deve ter ao menos 8 caracteres e no máximo 72 bytes.' });
    }
    if (newPassword !== confirmPassword) return res.status(400).json({ message: 'As senhas não coincidem.' });
    if (isDefaultPassword(newPassword)) return res.status(400).json({ message: 'Escolha uma senha diferente da senha padrão.' });
    const user = await User.findById(req.auth.sub).select('+password');
    if (!user?.mustChangePassword) return res.status(409).json({ message: 'Não há troca de senha pendente.' });
    if (await bcrypt.compare(newPassword, user.password)) return res.status(400).json({ message: 'Escolha uma senha diferente da senha temporária.' });
    const password = await bcrypt.hash(newPassword, 12);
    const updated = await User.findOneAndUpdate({ _id: user._id, password: user.password, mustChangePassword: true },
      { $set: { password, mustChangePassword: false } }, { new: true, runValidators: true });
    if (!updated) return res.status(409).json({ message: 'A senha foi alterada. Entre novamente.' });
    res.json(await sessionUser(updated));
  } catch (error) { next(error); }
});

router.get('/me', async (req, res, next) => {
  try {
    const user = await User.findById(req.auth.sub);
    user ? res.json(await sessionUser(user)) : res.status(401).json({ message: 'Usuário não encontrado.' });
  } catch (error) { next(error); }
});


export default router;
