import { fileURLToPath } from 'node:url';
import path from 'node:path';

// Папка Server — от неё считаются все пути сервера.
export const serverRoot = fileURLToPath(new URL('.', import.meta.url));
// Сервер (API) и клиент работают на разных портах.
export const port = Number(process.env.PORT || 5198);
export const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
// Автотесты подменяют папку на временную, чтобы не трогать рабочую базу.
const testDirectory = process.env.AFISHA_DATA_DIR;
export const databaseFile = path.join(testDirectory || path.join(serverRoot, 'db'), 'afisha.db');
export const logDirectory = path.join(testDirectory || serverRoot, 'logs');
export const sessionLifetime = 7 * 24 * 60 * 60 * 1000;
export function today() {
  return new Intl.DateTimeFormat('sv-SE', { dateStyle: 'short', timeZone: 'Asia/Novosibirsk' }).format(
    new Date(),
  );
}
