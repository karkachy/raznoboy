import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const directory = mkdtempSync(path.join(path.resolve(tmpdir()), 'raznoboy-test-'));
after(() => rmSync(directory, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 }));

test('старая таблица Tickets без AUTOINCREMENT пересоздаётся без потери билетов', async () => {
  // Старая база: та же схема, но номер билета без AUTOINCREMENT, и в ней два билета.
  const schema = readFileSync(new URL('../db/schema.sql', import.meta.url), 'utf8');
  const old = new DatabaseSync(path.join(directory, 'afisha.db'));
  old.exec(schema.replace('PRIMARY KEY AUTOINCREMENT', 'PRIMARY KEY'));
  old.exec(`INSERT INTO Accounts (Id,Name,Email,PasswordHash) VALUES (1,'Аня','anya@example.org','x');
    INSERT INTO Concerts (Id) VALUES ('witcher');
    INSERT INTO Tickets (Number,AccountId,ConcertId,RequestId,Title,EventDate,City,Place) VALUES
      (1,1,'witcher','a','The Witcher','2999-01-01','Город','Зал'),
      (2,1,'witcher','b','The Witcher','2999-01-01','Город','Зал');`);
  old.close();

  process.env.AFISHA_DATA_DIR = directory;
  const { db } = await import('../db/connection.js');
  const { initializeDatabase } = await import('../db/seed.js');
  initializeDatabase();
  try {
    const { sql } = db.prepare("SELECT sql FROM sqlite_master WHERE name='Tickets'").get();
    assert.match(sql, /AUTOINCREMENT/);
    assert.deepEqual(db.prepare('SELECT Number, RequestId FROM Tickets ORDER BY Number').all().map((r) => ({ ...r })), [
      { Number: 1, RequestId: 'a' },
      { Number: 2, RequestId: 'b' },
    ]);
    // Билет №2 вернули: следующий всё равно получает №3.
    db.prepare('DELETE FROM Tickets WHERE Number=2').run();
    const next = db.prepare(`INSERT INTO Tickets (AccountId,ConcertId,RequestId,Title,EventDate,City,Place)
      VALUES (1,'witcher','c','The Witcher','2999-01-01','Город','Зал') RETURNING Number`).get();
    assert.equal(next.Number, 3);
    // Повторный запуск сервера ничего не ломает.
    initializeDatabase();
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM Tickets').get().n, 2);
  } finally {
    db.close();
  }
});
