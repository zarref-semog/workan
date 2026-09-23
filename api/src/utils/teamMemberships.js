import mongoose from 'mongoose';
import { Team, User } from '../models/index.js';

export async function validateTeamIds(value) {
  if (!Array.isArray(value) || value.some((id) => !mongoose.isValidObjectId(id))) {
    throw Object.assign(new Error('Selecione equipes válidas.'), { status: 400 });
  }
  const ids = [...new Set(value.map(String))];
  if (await Team.countDocuments({ _id: { $in: ids } }) !== ids.length) {
    throw Object.assign(new Error('Uma das equipes selecionadas não existe.'), { status: 400 });
  }
  return ids;
}

export function memberData(user, permission = 'member') {
  const { _id, name, email, initials } = user;
  return { _id, name, email, permission, initials };
}

export async function normalizeTeamPeople(people) {
  if (!Array.isArray(people) || people.some((person) => !mongoose.isValidObjectId(person?._id))) {
    throw Object.assign(new Error('Selecione usuários válidos para a equipe.'), { status: 400 });
  }
  const ids = [...new Set(people.map((person) => String(person._id)))];
  if (new Set(people.filter((person) => person.permission === 'teamlead').map((person) => String(person._id))).size > 1) {
    throw Object.assign(new Error('Cada equipe pode ter apenas um líder.'), { status: 400 });
  }
  if (people.some((person) => person.permission !== undefined && !['teamlead', 'member'].includes(person.permission))) {
    throw Object.assign(new Error('Selecione líder ou membro para o papel na equipe.'), { status: 400 });
  }
  const users = await User.find({ _id: { $in: ids } });
  if (users.length !== ids.length) throw Object.assign(new Error('Usuário não encontrado.'), { status: 400 });
  if (users.some((user) => ['superadmin', 'admin'].includes(user.permission))) throw Object.assign(new Error('Administradores não podem pertencer a equipes.'), { status: 400 });
  return users.map((user) => memberData(user, people.find((person) => String(person._id) === String(user._id))?.permission ?? 'member'));
}

export async function usersWithTeams(users) {
  const teams = await Team.find().lean();
  return users.map((user) => ({
    ...user.toObject(),
    teamIds: teams.filter((team) => team.people.some((person) =>
      String(person._id) === String(user._id) || person.email === user.email,
    )).map((team) => String(team._id)),
    ledTeamIds: teams.filter((team) => team.people.some((person) =>
      String(person._id) === String(user._id) && person.permission === 'teamlead',
    )).map((team) => String(team._id)),
  }));
}

export async function syncUserMemberships(user, ledTeamIds, previousEmail) {
  if (['superadmin', 'admin'].includes(user.permission)) return setUserTeams(user, [], previousEmail);
  const teams = await Team.find().lean();
  if (teams.some((team) => ledTeamIds?.includes(String(team._id)) && team.people.some((person) =>
    person.permission === 'teamlead' && String(person._id) !== String(user._id)))) {
    throw Object.assign(new Error('Uma das equipes selecionadas já possui outro líder.'), { status: 409 });
  }
  for (const team of teams) {
    const existing = team.people.find((person) => String(person._id) === String(user._id) ||
      person.email === user.email || (previousEmail && person.email === previousEmail));
    const leads = ledTeamIds?.includes(String(team._id));
    if (!existing && !leads) continue;
    const permission = ledTeamIds === undefined ? existing.permission : leads ? 'teamlead' : 'member';
    if (existing) {
      const result = await Team.updateOne({ _id: team._id, 'people._id': existing._id,
        ...(permission === 'teamlead' ? { people: { $not: { $elemMatch: { permission: 'teamlead', _id: { $ne: user._id } } } } } : {}),
      }, { $inc: { __v: 1 }, $set: {
        'people.$.name': user.name, 'people.$.email': user.email,
        'people.$.initials': user.initials, 'people.$.permission': permission,
      } });
      if (result.matchedCount === 0) throw Object.assign(new Error('A equipe já possui outro líder. Atualize a página.'), { status: 409 });
    } else {
      const result = await Team.updateOne({ _id: team._id, people: { $not: { $elemMatch: { permission: 'teamlead' } } } }, { $inc: { __v: 1 }, $push: { people: memberData(user, permission) } });
      if (result.matchedCount === 0) throw Object.assign(new Error('A equipe já possui outro líder. Atualize a página.'), { status: 409 });
    }
  }
}

export async function setUserTeams(user, teamIds, previousEmail) {
  if (['superadmin', 'admin'].includes(user.permission)) teamIds = [];
  const membership = { $or: [{ _id: user._id }, { email: user.email }, ...(previousEmail ? [{ email: previousEmail }] : [])] };
  await Team.updateMany({ _id: { $nin: teamIds } }, { $pull: { people: membership } });
  for (const teamId of teamIds) {
    const team = await Team.findById(teamId);
    const existing = team?.people.find((person) => String(person._id) === String(user._id) || person.email === user.email || (previousEmail && person.email === previousEmail));
    const permission = existing?.permission === 'teamlead' ? 'teamlead' : 'member';
    await Team.updateOne({ _id: teamId }, { $pull: { people: membership } });
    await Team.updateOne({ _id: teamId }, { $push: { people: memberData(user, permission) } });
  }
}
