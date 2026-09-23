export function leadsTeam(user, team) {
  return !!team?.people?.some((person) => String(person._id) === String(user?._id) && person.permission === 'teamlead');
}

export function canManageTeam(user, team) {
  return user?.permission === 'superadmin' || leadsTeam(user, team);
}
