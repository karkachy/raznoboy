import express from 'express';
import cookieParser from 'cookie-parser';
import { clientOrigin } from './config.js';
import { initializeDatabase } from './db/seed.js';
import { readSession } from './middleware/session.js';
import { logRequests, writeLog } from './middleware/logger.js';
import { allowClient } from './middleware/cors.js';
import { authRoutes } from './routes/auth.js';
import { eventRoutes } from './routes/events.js';
import { ticketRoutes } from './routes/tickets.js';
import { ratingRoutes } from './routes/ratings.js';

initializeDatabase();
export const app = express();
app.disable('x-powered-by');
app.use('/api', logRequests, allowClient, express.json({ limit: '16kb' }), cookieParser(), readSession, (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && req.get('X-Afisha-Request') !== '1')
    return res.status(403).json({ error: 'Запрос не принят.' });
  next();
});
app.use('/api', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/ratings', ratingRoutes);
// Сайт открывается на клиенте, а сервер отвечает только данными.
app.get('/', (req, res) => res.json({ message: 'Это сервер API. Сайт открывается на клиенте.', client: clientOrigin }));
app.use((req, res) => res.status(404).json({ error: 'Маршрут не найден.' }));
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  const status = err.status || 500;
  if (status >= 500) {
    console.error(err);
    writeLog('ERROR ' + req.method + ' ' + req.originalUrl + ' ' + (err.stack || err));
  }
  res
    .status(status)
    .json({ error: status >= 500 ? 'Сервер не смог выполнить запрос.' : 'Проверьте запрос.' });
});
