import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { databaseFile } from '../config.js';

// Файл базы: Server/db/afisha.db. Таблицы описаны в schema.sql рядом.
mkdirSync(path.dirname(databaseFile), { recursive: true });
export const db = new DatabaseSync(databaseFile);
db.exec('PRAGMA busy_timeout=5000; PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;');
