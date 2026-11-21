import { Router } from 'express';
import { listEvents } from '../db/events.js';

export const eventRoutes = Router();
eventRoutes.get('/', (req, res, next) => {
  try {
    res.json(listEvents());
  } catch (err) {
    next(err);
  }
});
