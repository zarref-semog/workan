import { Router } from 'express';

const router = Router();
router.get('/', (_req, res) => {
  res.json({ roles: {
    superadmin: ['manageBoards', 'manageCards', 'manageTeams', 'manageUsers', 'viewPermissions', 'manageAppearance'],
    admin: ['manageUsers', 'viewPermissions'],
    teamlead: ['manageBoards', 'manageCards', 'manageTeams'],
    member: ['manageCards'],
  } });
});
router.all('/', (_req, res) => {
  res.set('Allow', 'GET, HEAD').status(405).json({ message: 'As permissões são predefinidas e não podem ser alteradas.' });
});


export default router;
