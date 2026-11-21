// Просмотр базы в терминале: npm run db (все таблицы) или npm run db -- Tickets (строки таблицы).
// База открывается только для чтения, поэтому сервер можно не останавливать.
import { DatabaseSync } from 'node:sqlite';
import { existsSync } from 'node:fs';
import { databaseFile } from '../config.js';

if (!existsSync(databaseFile)) {
  console.log('Базы ещё нет. Запустите сервер (npm start), он создаст ' + databaseFile);
  process.exit(1);
}
const db = new DatabaseSync(databaseFile, { readOnly: true });
const tables = db
  .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
  .all()
  .map((row) => row.name);
const wanted = process.argv[2];

if (!wanted) {
  console.log('Файл базы: ' + databaseFile + '\n');
  console.table(
    tables.map((name) => ({
      'Таблица': name,
      'Строк': db.prepare(`SELECT COUNT(*) AS n FROM "${name}"`).get().n,
      'Столбцы': db.prepare(`PRAGMA table_info("${name}")`).all().map((c) => c.name).join(', '),
    })),
  );
  console.log('\nСтроки таблицы: npm run db -- ИмяТаблицы   (например, npm run db -- Tickets)');
} else {
  const name = tables.find((t) => t.toLowerCase() === wanted.toLowerCase());
  if (!name) {
    console.log('Нет такой таблицы. Есть: ' + tables.join(', '));
    process.exit(1);
  }
  const rows = db.prepare(`SELECT * FROM "${name}" LIMIT 30`).all();
  // Хеши паролей и сессий не показываются целиком, длинный текст обрезается.
  const hidden = ['PasswordHash', 'TokenHash'];
  const short = (key, value) => {
    if (typeof value !== 'string') return value;
    if (hidden.includes(key)) return value.slice(0, 10) + '…';
    return value.length > 40 ? value.slice(0, 39) + '…' : value;
  };
  console.log(`Таблица ${name}, первые ${rows.length} строк:`);
  console.table(rows.map((row) => Object.fromEntries(Object.entries(row).map(([k, v]) => [k, short(k, v)]))));
}
db.close();
