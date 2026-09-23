import { normalizeTeamPeople } from '../utils/teamMemberships.js';

export async function prepareTeam(data, currentTeam, actor) {
  const updates = { ...data };
  if (Object.keys(updates).some((key) => key.startsWith('$') || key.includes('.'))) {
    throw Object.assign(new Error('Atualização de equipe inválida.'), { status: 400 });
  }
  if (updates.people !== undefined) {
    if (currentTeam && Array.isArray(updates.people)) {
      const leaders = currentTeam.people.filter((person) => person.permission === 'teamlead');
      if ((!['superadmin', 'admin'].includes(actor?.permission) && leaders.some((leader) => !updates.people.some((person) => String(person._id) === String(leader._id)))) ||
        updates.people.some((person) => person.permission !== undefined && person.permission !==
          (currentTeam.people.find((member) => String(member._id) === String(person._id))?.permission || 'member'))) {
        throw Object.assign(new Error('A liderança só pode ser alterada no cadastro de usuários.'), { status: 403 });
      }
      updates.people = updates.people.map((person) => ({ ...person, permission:
        currentTeam.people.find((member) => String(member._id) === String(person._id))?.permission || 'member' }));
    }
    updates.people = await normalizeTeamPeople(updates.people);
  }
  return updates;
}
