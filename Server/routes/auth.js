import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { randomBytes } from 'node:crypto';
import { createAccount, accountByEmail, renameAccount } from '../db/accounts.js';
import { snapshot } from '../db/viewer.js';
import { hashPassword, verifyPassword } from '../utils/passwords.js';
import { beginSession, endSession, requireUser } from '../middleware/session.js';

export const authRoutes = Router();
const limit = rateLimit({
  windowMs: 60000,
  limit: 30,
  message: { error: 'Слишком много попыток. Повторите через минуту.' },
});
const dummyHash = await hashPassword(randomBytes(32).toString('hex'));

// В каждом обработчике try/catch: любая ошибка (например, сбой базы) уходит через next(err)
// в общий обработчик в app.js, который отвечает 500 и пишет ошибку в лог.
authRoutes.get('/session', (req, res, next) => {
  try {
    res.json(snapshot(req.user));
  } catch (err) {
    next(err);
  }
});
authRoutes.post('/accounts', limit, async (req, res, next) => {
  try {
    const { name, email, password } = req.body ?? {};
    if (
      typeof name !== 'string' ||
      !name.trim() ||
      name.trim().length > 30 ||
      typeof email !== 'string' ||
      email.trim().length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
      typeof password !== 'string' ||
      password.length < 8 ||
      password.length > 128
    ) {
      return res.status(400).json({ error: 'Укажите имя, почту и пароль длиной от 8 до 128 символов.' });
    }
    const user = createAccount(name.trim(), email.trim().toLowerCase(), await hashPassword(password));
    if (!user) return res.status(409).json({ error: 'Эта почта уже зарегистрирована.' });
    beginSession(req, res, user);
    res.status(201).json(snapshot(user));
  } catch (err) {
    next(err);
  }
});
authRoutes.post('/login', limit, async (req, res, next) => {
  try {
    const { email, password } = req.body ?? {};
    if (typeof email !== 'string' || typeof password !== 'string' || !password || password.length > 128)
      return res.status(400).json({ error: 'Проверьте почту и пароль.' });
    const user = accountByEmail(email.trim().toLowerCase());
    const valid = await verifyPassword(password, user?.hash ?? dummyHash);
    if (!user || !valid) return res.status(401).json({ error: 'Неверная почта или пароль.' });
    beginSession(req, res, user);
    res.json(snapshot(user));
  } catch (err) {
    next(err);
  }
});
authRoutes.patch('/account', requireUser, (req, res, next) => {
  try {
    const name = req.body?.name;
    if (typeof name !== 'string' || !name.trim() || name.trim().length > 30)
      return res.status(400).json({ error: 'Имя должно содержать от 1 до 30 символов.' });
    res.json(snapshot(renameAccount(req.user.id, name.trim())));
  } catch (err) {
    next(err);
  }
});
authRoutes.post('/logout', (req, res, next) => {
  try {
    endSession(req, res);
    res.json(snapshot(null));
  } catch (err) {
    next(err);
  }
});
