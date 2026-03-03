import type BetterSqlite3 from 'better-sqlite3';

export function migrate002(rawDb: BetterSqlite3.Database): void {
  try {
    rawDb.exec(`ALTER TABLE users ADD COLUMN language TEXT DEFAULT NULL`);
  } catch {
    // Column already exists — idempotent
  }
}
