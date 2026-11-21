import { readFileSync } from 'node:fs';
import { db } from './connection.js';

const read = (file) => readFileSync(new URL(file, import.meta.url), 'utf8');
export function initializeDatabase() {
  createTables();
  const events = JSON.parse(read('./seeds/events.json'));
  const ratings = JSON.parse(read('./seeds/ratings.json'));
  const concert = db.prepare('INSERT OR IGNORE INTO Concerts (Id) VALUES (?)');
  const details = db.prepare(`INSERT OR REPLACE INTO EventDetails
    (Id,title,genre,kind,city,date,time,place,cover,artist,description,source,credit,featured,ticketUrl,coverPosition,dateLabel)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  const seedVote = db.prepare('INSERT OR IGNORE INTO SeedVotes (ConcertId,Slot,Score) VALUES (?,?,?)');
  db.exec('BEGIN IMMEDIATE');
  try {
    for (const e of events) {
      concert.run(e.id);
      details.run(
        e.id,
        e.title,
        e.genre,
        e.kind,
        e.city,
        e.date,
        e.time ?? null,
        e.place,
        e.cover,
        e.artist,
        e.desc,
        e.source,
        e.credit,
        Number(Boolean(e.featured)),
        e.ticketUrl ?? null,
        e.coverPosition ?? null,
        e.dateLabel ?? null,
      );
      const scores = ratings[e.id];
      if (scores?.length !== 10) throw new Error('Отсутствуют начальные оценки для ' + e.id);
      scores.forEach((score, slot) => seedVote.run(e.id, slot, score));
    }
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

// Номер возвращённого билета не должен достаться новому, поэтому у Tickets стоит AUTOINCREMENT.
// В старой базе таблица создана без него: один раз пересоздаём её и переносим все билеты.
function createTables() {
  const tickets = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='Tickets'").get();
  if (!tickets || /AUTOINCREMENT/i.test(tickets.sql)) return db.exec(read('./schema.sql'));
  const columns = 'Number,AccountId,ConcertId,RequestId,Title,EventDate,EventTime,City,Place';
  db.exec('BEGIN IMMEDIATE');
  try {
    db.exec('ALTER TABLE Tickets RENAME TO TicketsOld');
    db.exec(read('./schema.sql'));
    db.exec(`INSERT INTO Tickets (${columns}) SELECT ${columns} FROM TicketsOld`);
    db.exec('DROP TABLE TicketsOld');
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}
