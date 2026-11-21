import { db } from './connection.js';

export function snapshot(user) {
  const ratings = db
    .prepare(
      `WITH AllVotes AS (
    SELECT ConcertId, Score, NULL AS AccountId FROM SeedVotes
    UNION ALL SELECT ConcertId, Score, AccountId FROM Votes
  ) SELECT ConcertId AS eventId, ROUND(AVG(Score),1) AS average, COUNT(*) AS count,
      MAX(CASE WHEN AccountId=? THEN Score END) AS mine FROM AllVotes GROUP BY ConcertId`,
    )
    .all(user?.id ?? null);
  const tickets = user
    ? db
        .prepare(
          `SELECT Number AS number, ConcertId AS eventId, Title AS title,
    EventDate AS date, EventTime AS time, City AS city, Place AS place, RequestId AS requestId
    FROM Tickets WHERE AccountId=? ORDER BY Number DESC`,
        )
        .all(user.id)
    : [];
  return { user: user ? { name: user.name } : null, ratings, tickets };
}

export function saveRating(eventId, accountId, score) {
  db.prepare(
    `INSERT INTO Votes (ConcertId, AccountId, Score) VALUES (?,?,?)
    ON CONFLICT(ConcertId,AccountId) DO UPDATE SET Score=excluded.Score`,
  ).run(eventId, accountId, score);
}
export function issueTicket(event, accountId, requestId) {
  db.prepare(
    `INSERT INTO Tickets (AccountId,ConcertId,RequestId,Title,EventDate,EventTime,City,Place)
    VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(AccountId,ConcertId,RequestId) DO NOTHING`,
  ).run(accountId, event.id, requestId, event.title, event.date, event.time, event.city, event.place);
}
export function deleteRating(eventId, accountId) {
  db.prepare('DELETE FROM Votes WHERE ConcertId=? AND AccountId=?').run(eventId, accountId);
}
export function findTicket(number, accountId) {
  return db
    .prepare('SELECT Number AS number, EventDate AS date FROM Tickets WHERE Number=? AND AccountId=?')
    .get(number, accountId);
}
export function deleteTicket(number, accountId) {
  db.prepare('DELETE FROM Tickets WHERE Number=? AND AccountId=?').run(number, accountId);
}
