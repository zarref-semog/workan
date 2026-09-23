import { canManageTeam } from './teamPermissions.js';
export function canAssignBoardManager(user, board, teams) {
  return ['admin', 'superadmin'].includes(user?.permission) || teams.some((team) => String(team._id) === String(board.teamId) && canManageTeam(user, team));
}
export function isBoardManager(user, board) {
  return !!user?._id && !!board?.managerId && String(user._id) === String(board.managerId);
}
export function canManageBoardCards(user, board, teams) {
  return isBoardManager(user, board) || canAssignBoardManager(user, board, teams);
}
