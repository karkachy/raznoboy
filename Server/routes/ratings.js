import { Router } from 'express';
import { requireUser } from '../middleware/session.js';
import { findEvent } from '../db/events.js';
import { deleteRating, saveRating, snapshot } from '../db/viewer.js';

export const ratingRoutes = Router();
ratingRoutes.put('/:eventId', requireUser, (req, res, next) => {
  try {
    const score = req.body?.score;
    if (!Number.isInteger(score) || score < 1 || score > 5)
      return res.status(400).json({ error: 'Выберите от 1 до 5 звёзд.' });
    if (!findEvent(req.params.eventId)) return res.status(404).json({ error: 'Концерт не найден.' });
    saveRating(req.params.eventId, req.user.id, score);
    res.json(snapshot(req.user));
  } catch (err) {
    next(err);
  }
});
// Удаление своей оценки. Повторный запрос ничего не меняет и тоже отвечает 200.
ratingRoutes.delete('/:eventId', requireUser, (req, res, next) => {
  try {
    if (!findEvent(req.params.eventId)) return res.status(404).json({ error: 'Концерт не найден.' });
    deleteRating(req.params.eventId, req.user.id);
    res.json(snapshot(req.user));
  } catch (err) {
    next(err);
  }
});
