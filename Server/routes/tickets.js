import { Router } from 'express';
import { requireUser } from '../middleware/session.js';
import { findEvent } from '../db/events.js';
import { deleteTicket, findTicket, issueTicket, snapshot } from '../db/viewer.js';
import { today } from '../config.js';

export const ticketRoutes = Router();
ticketRoutes.post('/:eventId', requireUser, (req, res, next) => {
  try {
    const event = findEvent(req.params.eventId);
    const requestId = req.body?.requestId;
    if (typeof requestId !== 'string' || !/^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(requestId))
      return res.status(400).json({ error: 'Откройте оформление заново.' });
    if (!event) return res.status(404).json({ error: 'Концерт не найден.' });
    if (event.date < today()) return res.status(409).json({ error: 'Концерт уже в архиве.' });
    issueTicket(event, req.user.id, requestId.toLowerCase());
    res.json(snapshot(req.user));
  } catch (err) {
    next(err);
  }
});
// Возврат билета: только свой и только до даты концерта.
ticketRoutes.delete('/:number', requireUser, (req, res, next) => {
  try {
    if (!/^[1-9]\d{0,9}$/.test(req.params.number))
      return res.status(400).json({ error: 'Неверный номер билета.' });
    const ticket = findTicket(Number(req.params.number), req.user.id);
    if (!ticket) return res.status(404).json({ error: 'Билет не найден.' });
    if (ticket.date < today())
      return res.status(409).json({ error: 'Билет на прошедший концерт не возвращается.' });
    deleteTicket(ticket.number, req.user.id);
    res.json(snapshot(req.user));
  } catch (err) {
    next(err);
  }
});
