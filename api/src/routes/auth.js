import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { User, Team } from '../models/index.js';
import { leadsTeam } from '../validations/teamPermissions.js';
import { publicUser } from '../services/users.js';
import { config } from '../config/env.js';
const { jwtSecret } = config;
const router = Router();
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
    const token = jwt.sign({ sub: user.id, permission: user.permission }, jwtSecret, { expiresIn: '8h' });
    res.json({ token, user: await sessionUser(user) });
  } catch (error) { next(error); }
});

router.get('/me', async (req, res, next) => {
  try {
    const user = await User.findById(req.auth.sub);
    user ? res.json(await sessionUser(user)) : res.status(401).json({ message: 'Usuário não encontrado.' });
  } catch (error) { next(error); }
});


export default router;
