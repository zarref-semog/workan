import { leadsTeam } from './teamPermissions.js';
const isLeader = (user, teams) => user.permission === 'teamlead' || teams.some((team) => leadsTeam(user, team));

export function boardParticipants(board, users, teams) {
  users = users.filter((user) => !isLeader(user, teams) || teams.some((team) =>
    String(team._id) === String(board.teamId) && leadsTeam(user, team)));
  if (board.visibility === 'public') return users.filter((user) => user.active !== false);
  const teamIds = new Set([board.teamId, ...(board.sharedTeamIds || [])].filter(Boolean).map(String));
  const userIds = new Set([board.ownerId, ...(board.sharedUserIds || [])].filter(Boolean).map(String));
  for (const team of teams) {
    if (teamIds.has(String(team._id))) for (const person of team.people || []) userIds.add(String(person._id));
  }
  return users.filter((user) => user.active !== false && userIds.has(String(user._id)));
}

export function boardAccessFilter(user, teams) {
  if (user.permission === 'superadmin') return {};
  if (isLeader(user, teams)) return { teamId: { $in: teams.filter((team) => leadsTeam(user, team)).map((team) => team._id) } };
  const teamIds = teams.filter((team) => (team.people || []).some((person) => String(person._id) === String(user._id))).map((team) => team._id);
  return { $or: [
    { visibility: 'public' }, { ownerId: user._id }, { sharedUserIds: user._id },
    { teamId: { $in: teamIds } }, { sharedTeamIds: { $in: teamIds } },
  ] };
}

export function assertBoardAccess(board, user, teams) {
  if (user.permission === 'superadmin') return;
  if (isLeader(user, teams)) {
    if (teams.some((team) => String(team._id) === String(board.teamId) && leadsTeam(user, team))) return;
  } else if (boardParticipants(board, [user], teams).length) return;
  throw Object.assign(new Error('Você não possui acesso a este quadro.'), { status: 403 });
}
