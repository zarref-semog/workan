import mongoose from 'mongoose';
import { Attachment, Board, Team, User } from '../models/index.js';
import { stepAssigneeIds, validateCardTransitions } from '../validations/stepValidation.js';
import { prepareCards } from '../utils/cards.js';
import { validateCardLocations, validateCardPermissions } from '../validations/cardPermissions.js';
import { assertBoardAccess } from '../validations/boardAccess.js';

export async function createBoard(data, userId) {
  const team = await resolveBoardTeam(data.teamId);
  data = { ...data, color: team.color };
  const creator = await User.findById(userId);
  if (!creator) throw Object.assign(new Error('Usuário não encontrado.'), { status: 401 });
  data.ownerId = creator._id;
  data.cards = prepareCards(data.cards ?? [], [], creator);
  const candidate = new Board(data);
  await candidate.validate();
  await validateAttachments(candidate);
  await validateStepConfiguration(candidate.steps);
  validateCardLocations(candidate.cards, [], candidate.steps);
  return Board.create(data);
}

export async function updateBoard(id, data, userId, cardsOnly = false) {
  const updates = cardsOnly ? { cards: data.cards } : { ...data };
  const board = await Board.findById(id);
  if (!board) throw Object.assign(new Error('Quadro não encontrado.'), { status: 404 });
  const actor = await User.findById(userId);
  if (!actor) throw Object.assign(new Error('Usuário não encontrado.'), { status: 401 });
  assertBoardAccess(board, actor, await Team.find().lean());
  if (Object.keys(updates).some((key) => key.startsWith('$') || key.includes('.'))) {
    throw Object.assign(new Error('Atualização de quadro inválida.'), { status: 400 });
  }
  const team = await resolveBoardTeam(updates.teamId === undefined ? board.teamId : updates.teamId);
  updates.teamId = team._id;
  updates.color = team.color;
  const candidate = new Board({ ...board.toObject(), ...updates });
  await candidate.validate();
  await validateAttachments(candidate);
  if (updates.steps !== undefined) await validateStepConfiguration(candidate.steps);
  validateCardLocations(candidate.cards, board.cards, candidate.steps);
  if (updates.cards !== undefined) {
    const creator = await User.findById(userId);
    if (!creator) throw Object.assign(new Error('Usuário não encontrado.'), { status: 401 });
    validateCardPermissions(candidate.cards, board.cards, board.steps, creator, await Team.find().lean());
    updates.cards = prepareCards(updates.cards, board.cards, creator);
    validateCardTransitions(updates.cards, board.cards, board.steps);
  }
  return Board.findByIdAndUpdate(id, updates, { new: true, runValidators: true });
}
export async function resolveBoardTeam(teamId) {
  if (!mongoose.isValidObjectId(teamId)) throw Object.assign(new Error('Selecione uma equipe para o quadro.'), { status: 400 });
  const team = await Team.findById(teamId);
  if (!team) throw Object.assign(new Error('Equipe inexistente.'), { status: 400 });
  return team;
}

export async function withTeamColors(items) {
  const teams = await Team.find({ _id: { $in: items.map((item) => item.teamId).filter(Boolean) } }).lean();
  const byId = new Map(teams.map((team) => [String(team._id), team]));
  return items.map((item) => {
    const team = byId.get(String(item.teamId));
    return { ...item.toObject(), color: team?.color || item.color, teamName: team?.name || '' };
  });
}

export async function validateStepConfiguration(steps) {
  const ids = new Set(steps.map((step) => String(step._id)));
  for (const step of steps) {
    const assigneeIds = [...new Set(stepAssigneeIds(step))];
    if (assigneeIds.length && step.assigneeTeamId) throw Object.assign(new Error('Escolha pessoas ou uma equipe responsável.'), { status: 400 });
    if (assigneeIds.length && await User.countDocuments({ _id: { $in: assigneeIds } }) !== assigneeIds.length) throw Object.assign(new Error('Responsável inexistente.'), { status: 400 });
    if (step.assigneeTeamId && !await Team.exists({ _id: step.assigneeTeamId })) throw Object.assign(new Error('Equipe responsável inexistente.'), { status: 400 });
    if (step.nextStepIds?.some((id) => !ids.has(String(id)) || String(id) === String(step._id))) {
      throw Object.assign(new Error('Selecione outras etapas existentes no quadro como próximos destinos.'), { status: 400 });
    }
  }
}

export async function validateAttachments(board) {
  const fileNames = new Set(board.steps.flatMap((step) => step.customFields.filter((field) => field.type === 'file').map((field) => field.name)));
  const ids = new Set();
  for (const card of board.cards) for (const name of fileNames) {
    const value = card.fieldValues.get(name);
    if (value == null || value === '') continue;
    if (!mongoose.isValidObjectId(value.fileId) || typeof value.name !== 'string' || !value.name.trim()) {
      throw Object.assign(new Error(`Anexo inválido no campo "${name}".`), { status: 400 });
    }
    ids.add(String(value.fileId));
  }
  if (ids.size && await Attachment.countDocuments({ _id: { $in: [...ids] } }) !== ids.size) {
    throw Object.assign(new Error('Um dos arquivos anexados não existe. Envie o arquivo novamente.'), { status: 400 });
  }
}
