import { pbkdf2, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const derive = promisify(scrypt);
const legacyDerive = promisify(pbkdf2);
export async function hashPassword(password) {
  const salt = randomBytes(16);
  const key = await derive(password, salt, 64);
  return ['scrypt', salt.toString('hex'), key.toString('hex')].join(':');
}
export async function verifyPassword(password, stored) {
  if (stored.startsWith('scrypt:')) {
    const [, salt, hash] = stored.split(':');
    const expected = Buffer.from(hash, 'hex');
    const key = await derive(password, Buffer.from(salt, 'hex'), 64);
    return expected.length === key.length && timingSafeEqual(key, expected);
  }
  // Аккаунты прежней версии используют формат ASP.NET Identity V3.
  const bytes = Buffer.from(stored, 'base64');
  if (bytes.length < 13 || bytes[0] !== 1) return false;
  const digest = ['sha1', 'sha256', 'sha512'][bytes.readUInt32BE(1)];
  const rounds = bytes.readUInt32BE(5);
  const saltEnd = 13 + bytes.readUInt32BE(9);
  if (!digest || !rounds || rounds > 2000000 || saltEnd < 29 || bytes.length - saltEnd < 16) return false;
  const key = await legacyDerive(
    password,
    bytes.subarray(13, saltEnd),
    rounds,
    bytes.length - saltEnd,
    digest,
  );
  return timingSafeEqual(key, bytes.subarray(saltEnd));
}
