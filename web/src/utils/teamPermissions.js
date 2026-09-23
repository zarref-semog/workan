export function canManageTeam(user, team) {
  return user?.permission === 'superadmin' || !!team?.people?.some((person) =>
    String(person._id) === String(user?._id) && person.permission === 'teamlead');
}
