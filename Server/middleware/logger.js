import { appendFile, mkdirSync } from 'node:fs';
import path from 'node:path';
import { logDirectory } from '../config.js';

const directory = logDirectory;
mkdirSync(directory, { recursive: true });
export const logFile = path.join(directory, 'requests.log');

// Запись дописывается в конец файла асинхронно, чтобы не задерживать ответ.
export function writeLog(line) {
  appendFile(logFile, new Date().toISOString() + ' ' + line + '\n', (err) => {
    if (err) console.error('Не удалось записать лог:', err.message);
  });
}

// Цвет кода ответа в терминале: 2xx и 3xx зелёный, 4xx жёлтый, 5xx красный.
export function statusColor(status) {
  if (status >= 500) return '\x1b[31m';
  if (status >= 400) return '\x1b[33m';
  return '\x1b[32m';
}

// Во время автотестов терминал не засоряется: строки пишутся только в файл.
const showInConsole = !process.env.NODE_TEST_CONTEXT;

// Одна строка на запрос: метод, адрес, код ответа, время обработки и ID пользователя.
export function logRequests(req, res, next) {
  const started = performance.now();
  res.on('finish', () => {
    const ms = (performance.now() - started).toFixed(1);
    const user = req.user ? 'user=' + req.user.id : 'guest';
    writeLog([req.method, req.originalUrl, res.statusCode, ms + 'ms', user].join(' '));
    if (showInConsole) {
      const time = new Date().toLocaleTimeString('ru-RU');
      const code = statusColor(res.statusCode) + res.statusCode + '\x1b[0m';
      console.log(`${time} ${req.method} ${req.originalUrl} → ${code} (${ms} мс, ${user})`);
    }
  });
  next();
}
