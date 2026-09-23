import { Router } from 'express';
import { Board, Team } from '../models/index.js';
import { assertBoardAccess, boardAccessFilter } from '../validations/boardAccess.js';
import { createBoard, updateBoard, withTeamColors } from '../services/boards.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const teams = await Team.find().lean();
    res.json(await withTeamColors(await Board.find(boardAccessFilter(req.currentUser, teams)).sort({ updatedAt: -1 })));
  } catch (error) { next(error); }
});
router.get('/:id', async (req, res, next) => {
  try {
    const board = await Board.findById(req.params.id);
    if (board) assertBoardAccess(board, req.currentUser, await Team.find().lean());
    board ? res.json((await withTeamColors([board]))[0]) : res.status(404).json({ message: 'Registro não encontrado' });
  } catch (error) { next(error); }
});
router.post('/', async (req, res, next) => {
  try {
    res.status(201).json(await createBoard(req.body, req.auth.sub));
  } catch (error) { next(error); }
});
router.put('/:id', async (req, res, next) => {
  try {
    res.json(await updateBoard(req.params.id, req.body, req.auth.sub, req.memberCardsOnly));
  } catch (error) { next(error); }
});
router.delete('/:id', async (req, res, next) => {
  try {
    const board = await Board.findById(req.params.id);
    if (board) assertBoardAccess(board, req.currentUser, await Team.find().lean());
    await Board.findByIdAndDelete(req.params.id);
    res.status(204).end();
  } catch (error) { next(error); }
});

export default router;
