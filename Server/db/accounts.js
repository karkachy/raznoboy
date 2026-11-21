import { db } from './connection.js';

export function createAccount(name, email, hash) {
  return db
    .prepare(
      `INSERT INTO Accounts (Name,Email,PasswordHash) VALUES (?,?,?)
    ON CONFLICT(Email) DO NOTHING RETURNING Id AS id, Name AS name`,
    )
    .get(name, email, hash);
}
export function accountByEmail(email) {
  return db
    .prepare('SELECT Id AS id, Name AS name, PasswordHash AS hash FROM Accounts WHERE Email=?')
    .get(email);
}
export function renameAccount(id, name) {
  return db.prepare('UPDATE Accounts SET Name=? WHERE Id=? RETURNING Id AS id, Name AS name').get(name, id);
}
