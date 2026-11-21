import { db } from './connection.js';

const fields =
  'Id AS id,title,genre,kind,city,date,time,place,cover,artist,description AS desc,source,credit,featured,ticketUrl,coverPosition,dateLabel';
export function listEvents() {
  return db
    .prepare('SELECT ' + fields + ' FROM EventDetails ORDER BY rowid')
    .all()
    .map((event) => ({ ...event, featured: Boolean(event.featured) }));
}
export function findEvent(id) {
  return db.prepare('SELECT ' + fields + ' FROM EventDetails WHERE Id=?').get(id);
}
