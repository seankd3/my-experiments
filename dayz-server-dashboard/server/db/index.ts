// Database connection singleton using better-sqlite3

import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', '..', 'data', 'dayz-dashboard.db');

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    // Ensure the data directory exists
    const dir = path.dirname(DB_PATH);
    const fs = require('fs');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    db.pragma('busy_timeout = 5000');
  }
  return db;
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}

// Helper: run a query and return all rows
export function queryAll<T = Record<string, unknown>>(sql: string, params?: unknown[]): T[] {
  const stmt = getDb().prepare(sql);
  return (params ? stmt.all(...params) : stmt.all()) as T[];
}

// Helper: run a query and return the first row
export function queryOne<T = Record<string, unknown>>(sql: string, params?: unknown[]): T | undefined {
  const stmt = getDb().prepare(sql);
  return (params ? stmt.get(...params) : stmt.get()) as T | undefined;
}

// Helper: run an insert/update/delete and return info
export function run(sql: string, params?: unknown[]): Database.RunResult {
  const stmt = getDb().prepare(sql);
  return params ? stmt.run(...params) : stmt.run();
}

// Helper: run multiple statements in a transaction
export function transaction<T>(fn: () => T): T {
  const txn = getDb().transaction(fn);
  return txn();
}

export default getDb;
