import { randomBytes, createHash } from 'node:crypto';
import { db } from '../db/connection.js';
import { sessionLifetime } from '../config.js';

const cookie = 'Raznoboy.NodeSession';
const digest = (token) => createHash('sha256').update(token).digest('hex');
const options = (req) => ({ httpOnly: true, sameSite: 'strict', secure: req.secure, path: '/' });

export function readSession(req, res, next) {
  const token = req.cookies[cookie];
  req.user =
    typeof token === 'string'
      ? db
          .prepare(
            `SELECT a.Id AS id,a.Name AS name
    FROM Sessions s JOIN Accounts a ON a.Id=s.AccountId WHERE TokenHash=? AND ExpiresAt>?`,
          )
          .get(digest(token), Date.now())
      : null;
  next();
}
export function requireUser(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Для этого действия войдите в аккаунт.' });
  next();
}
export function endSession(req, res) {
  const token = req.cookies[cookie];
  if (typeof token === 'string') db.prepare('DELETE FROM Sessions WHERE TokenHash=?').run(digest(token));
  res.clearCookie(cookie, options(req));
}
export function beginSession(req, res, user) {
  endSession(req, res);
  const token = randomBytes(32).toString('hex');
  db.prepare('DELETE FROM Sessions WHERE ExpiresAt<=?').run(Date.now());
  db.prepare('INSERT INTO Sessions VALUES (?,?,?)').run(digest(token), user.id, Date.now() + sessionLifetime);
  res.cookie(cookie, token, { ...options(req), maxAge: sessionLifetime });
}
