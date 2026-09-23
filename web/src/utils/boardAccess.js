import { canManageTeam } from './teamPermissions.js';

export function boardMemberDirectory(board, users, teams) {
  const eligible = users.filter((user) => user.active !== false && !['admin', 'superadmin'].includes(user.permission));
  const unique = [...new Map(eligible.map((user) => [String(user._id), user])).values()];
  const members = boardParticipants(board, unique, teams);
  const ids = new Set(members.map((user) => String(user._id)));
  return { members, candidates: unique.filter((user) => !ids.has(String(user._id))) };
}

export function boardParticipants(board, users, teams) {
  users = users.filter((user) => user.permission === 'superadmin' ||
    (user.permission !== 'teamlead' && !teams.some((team) => canManageTeam(user, team))) || teams.some((team) =>
    String(team._id) === String(board.teamId) && canManageTeam(user, team)));
  if (board.visibility === 'public') return users.filter((user) => user.active !== false);
  const teamIds = new Set([board.teamId, ...(board.sharedTeamIds || [])].filter(Boolean).map(String));
  const userIds = new Set([board.ownerId, ...(board.sharedUserIds || [])].filter(Boolean).map(String));
  for (const team of teams) {
    if (teamIds.has(String(team._id))) for (const person of team.people || []) userIds.add(String(person._id));
  }
  return users.filter((user) => user.active !== false && userIds.has(String(user._id)));
}

