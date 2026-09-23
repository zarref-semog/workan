import jwt from 'jsonwebtoken';
import { User, Team, Board } from '../models/index.js';
import { canManageTeam } from '../validations/teamPermissions.js';
import { config } from '../config/env.js';
const { jwtSecret } = config;
export async function authorize(req, res, next) {
  const fullPath = req.baseUrl + req.path;
  if (fullPath === '/api/auth/login' || fullPath === '/api/health' || (fullPath === '/api/appearance' && req.method === 'GET')) return next();
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ message: 'Sessão não autenticada.' });
  try {
    req.auth = jwt.verify(token, jwtSecret);
    const user = await User.findById(req.auth.sub);
    if (!user || user.active === false) return res.status(401).json({ message: 'Usuário inativo ou inexistente.' });
    req.currentUser = user;
    if (fullPath === '/api/auth/change-password' && req.method === 'POST') return next();
    if (user.mustChangePassword && fullPath !== '/api/auth/me') {
      return res.status(403).json({ message: 'Defina uma nova senha para continuar.', code: 'PASSWORD_CHANGE_REQUIRED' });
    }
    const permission = user.permission;
    if (fullPath.startsWith('/api/files') && ['GET', 'POST'].includes(req.method)) return next();
    if (permission === 'superadmin' || fullPath === '/api/auth/me') return next();
    if (permission === 'admin') {
      if (/^\/api\/teams\/[^/]+$/.test(fullPath) && req.method === 'PUT' &&
        Array.isArray(req.body.people) && Object.keys(req.body).every((key) => key === 'people')) return next();
      if (fullPath.startsWith('/api/teams') && req.method === 'GET') return next();
      if (fullPath.startsWith('/api/users') || fullPath.startsWith('/api/settings/permissions')) return next();
      return res.status(403).json({ message: 'Você não possui acesso a este recurso.' });
    }
    if (fullPath.startsWith('/api/boards') && ['POST', 'PUT', 'DELETE'].includes(req.method)) {
      const board = req.method === 'POST' ? req.body : await Board.findById(req.params.id || fullPath.split('/').at(-1));
      const team = board?.teamId ? await Team.findById(board.teamId) : null;
      const manages = canManageTeam(user, team);
      if (req.method === 'PUT') {
        req.memberCardsOnly = !manages;
        if (manages && req.body.teamId && String(req.body.teamId) !== String(board.teamId) &&
          !canManageTeam(user, await Team.findById(req.body.teamId))) return res.status(403).json({ message: 'Você não lidera a equipe de destino.' });
        return next();
      }
      if (manages) return next();
      return res.status(403).json({ message: 'Apenas líderes da equipe podem gerenciar seus quadros.' });
    }
    if (/^\/api\/teams\/[^/]+$/.test(fullPath) && ['PUT', 'DELETE'].includes(req.method)) {
      if (canManageTeam(user, await Team.findById(fullPath.split('/').at(-1)))) return next();
      return res.status(403).json({ message: 'Apenas líderes desta equipe podem alterá-la.' });
    }
    if (permission === 'teamlead') {
      const isManagedResource = fullPath.startsWith('/api/boards') || fullPath.startsWith('/api/teams');
      const isUserLookup = fullPath.startsWith('/api/users') && req.method === 'GET';
      if (isManagedResource || isUserLookup) return next();
      return res.status(403).json({ message: 'Você não possui acesso a este recurso.' });
    }
    const isBoardRead = fullPath.startsWith('/api/boards') && req.method === 'GET';
    const isCardUpdate = /^\/api\/boards\/[^/]+$/.test(fullPath) && req.method === 'PUT';
    const isTeamRead = fullPath.startsWith('/api/teams') && req.method === 'GET';
    const isUserLookup = fullPath.startsWith('/api/users') && req.method === 'GET';
    if (isCardUpdate) req.memberCardsOnly = true;
    if (isBoardRead || isCardUpdate || isTeamRead || isUserLookup) return next();
    return res.status(403).json({ message: 'Você não possui acesso a este recurso.' });
  } catch {
    res.status(401).json({ message: 'Sessão expirada. Entre novamente.' });
  }
}
