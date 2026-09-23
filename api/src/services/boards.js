import mongoose from 'mongoose';
import { attachmentIds, removeFile } from './fileStorage.js';
import { preserveCardHistory } from '../validations/cardHistory.js';
import { Attachment, Board, Team, User } from '../models/index.js';
import { normalizedFieldName, fieldKey, fieldValue, stepAssigneeIds, validateCardTransitions } from '../validations/stepValidation.js';
import { prepareCards } from '../utils/cards.js';
import { validateCardLocations, validateCardPermissions, validateCardFieldPermissions } from '../validations/cardPermissions.js';
import { assertBoardAccess } from '../validations/boardAccess.js';
import { canAssignBoardManager, canManageBoardCards } from '../validations/boardManagement.js';

export async function createBoard(data, userId) {
  const team = await resolveBoardTeam(data.teamId);
  data = { ...data, color: team.color };
  const creator = await User.findById(userId);
  if (!creator) throw Object.assign(new Error('Usuário não encontrado.'), { status: 401 });
  data.ownerId = creator._id;
  if (data.managerId) await validateBoardManager(data, {}, creator, await Team.find().lean());
  data.cards = prepareCards(data.cards ?? [], [], creator);
  const candidate = new Board(data);
  await candidate.validate();
  validateGroups(candidate);
  await validateAttachments(candidate);
  await validateStepConfiguration(candidate.steps);
  validateCardLocations(candidate.cards, [], candidate.steps);
  validateCardFieldPermissions(candidate.cards, [], creator, canManageBoardCards(creator, candidate, await Team.find().lean()));
  return Board.create(data);
}

export async function updateBoard(id, data, userId, cardsOnly = false) {
  const updates = cardsOnly ? { cards: data.cards } : { ...data };
  const board = await Board.findById(id);
  if (!board) throw Object.assign(new Error('Quadro não encontrado.'), { status: 404 });
  const actor = await User.findById(userId);
  if (!actor) throw Object.assign(new Error('Usuário não encontrado.'), { status: 401 });
  assertBoardAccess(board, actor, await Team.find().lean());
  await validateBoardManager(data, board, actor, await Team.find().lean());
  if (Object.keys(updates).some((key) => key.startsWith('$') || key.includes('.'))) {
    throw Object.assign(new Error('Atualização de quadro inválida.'), { status: 400 });
  }
  const team = await resolveBoardTeam(updates.teamId === undefined ? board.teamId : updates.teamId);
  updates.teamId = team._id;
  updates.color = team.color;
  const candidate = new Board({ ...board.toObject(), ...updates });
  await candidate.validate();
  validateGroups(candidate);
  await validateAttachments(candidate);
  if (updates.steps !== undefined) await validateStepConfiguration(candidate.steps);
  validateCardLocations(candidate.cards, board.cards, candidate.steps);
  if (updates.cards !== undefined) {
    const teams = await Team.find().lean();
    const managesCards = canManageBoardCards(actor, board, teams);
    validateCardFieldPermissions(candidate.cards, board.cards, actor, managesCards);
    const creator = await User.findById(userId);
    if (!creator) throw Object.assign(new Error('Usuário não encontrado.'), { status: 401 });
    if (!managesCards) {
      validateCardPermissions(candidate.cards, board.cards, board.steps, creator, teams);
      for (const card of candidate.cards) {
        const previous = board.cards.find((item) => String(item._id) === String(card._id));
        if (String(card.groupId || '') !== String(previous?.groupId || '')) throw Object.assign(new Error('Somente a gestão do quadro pode alterar o grupo do card.'), { status: 403 });
      }
    }
    updates.cards = preserveCardHistory(prepareCards(updates.cards, board.cards, creator), board.cards, board.steps, managesCards);
    validateCardTransitions(updates.cards, board.cards, board.steps, managesCards);
  }
  const saved = await Board.findByIdAndUpdate(id, updates, { new: true, runValidators: true });
  const retained = attachmentIds(updates.cards || board.cards);
  const removed = [...attachmentIds(board.cards)].filter((fileId) => !retained.has(fileId));
  if (removed.length) {
    const boards = await Board.find().select('cards').lean();
    const referenced = new Set(boards.flatMap((item) => [...attachmentIds(item.cards)]));
    for (const fileId of removed) if (!referenced.has(fileId)) {
      try { await removeFile(fileId); await Attachment.deleteOne({ _id: fileId }); }
      catch (error) { console.error('Falha ao remover anexo sem referências:', error.message); }
    }
  }
  return saved;
}
export async function resolveBoardTeam(teamId) {
  if (!mongoose.isValidObjectId(teamId)) throw Object.assign(new Error('Selecione uma equipe para o quadro.'), { status: 400 });
  const team = await Team.findById(teamId);
  if (!team) throw Object.assign(new Error('Equipe inexistente.'), { status: 400 });
  return team;
}

export async function validateBoardManager(data, previous, actor, teams) {
  if (data.managerId === undefined || String(data.managerId || '') === String(previous.managerId || '')) return;
  if (!canAssignBoardManager(actor, previous.teamId ? previous : data, teams)) throw Object.assign(new Error('Somente o líder da equipe ou a administração pode definir o responsável do quadro.'), { status: 403 });
  if (data.managerId && (!mongoose.isValidObjectId(data.managerId) || !await User.exists({ _id: data.managerId, active: { $ne: false } }))) throw Object.assign(new Error('Responsável do quadro inválido ou inativo.'), { status: 400 });
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
  const fieldKeys = steps.flatMap((step) => step.customFields.map(fieldKey));
  if (new Set(fieldKeys).size !== fieldKeys.length) throw Object.assign(new Error("Identificadores de campos duplicados."), { status: 400 });
  for (const step of steps) {
    const names = step.customFields.map((field) => normalizedFieldName(field.name));
    if (new Set(names).size !== names.length) throw Object.assign(new Error("Campos com nomes equivalentes na mesma etapa."), { status: 400 });
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
  const fields = board.steps.flatMap((step) => step.customFields.filter((field) => field.type === 'file'));
  const ids = new Set();
  for (const card of board.cards) for (const field of fields) {
    const name = field.name;
    const value = fieldValue(field, card.fieldValues);
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

export function validateGroups(board) {
  const keys = board.groups.map((group) => group.key);
  if (new Set(keys).size !== keys.length) throw Object.assign(new Error("Identificadores de grupos duplicados."), { status: 400 });
  if (board.cards.some((card) => card.groupId && !keys.includes(card.groupId))) throw Object.assign(new Error("Grupo do card inexistente."), { status: 400 });
}
