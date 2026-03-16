import type BetterSqlite3 from 'better-sqlite3';
import { logger } from '../../utils/logger';

export function migrate004(db: BetterSqlite3.Database): void {
  // Idempotent: each ALTER wrapped in try/catch
  const alterUsers = [
    `ALTER TABLE users ADD COLUMN nickname TEXT DEFAULT NULL`,
    `ALTER TABLE users ADD COLUMN mode TEXT DEFAULT 'button'`,
    `ALTER TABLE users ADD COLUMN active_household_id TEXT DEFAULT NULL`,
  ];

  for (const sql of alterUsers) {
    try {
      db.prepare(sql).run();
    } catch {
      // Column already exists — ignore
    }
  }

  db.prepare(`
    CREATE TABLE IF NOT EXISTS items (
      id TEXT PRIMARY KEY,
      household_id TEXT NOT NULL REFERENCES households(id),
      name TEXT NOT NULL,
      created_by_telegram_id INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS item_usage_log (
      id TEXT PRIMARY KEY,
      item_id TEXT NOT NULL REFERENCES items(id),
      user_telegram_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      logged_at INTEGER NOT NULL
    )
  `).run();

  logger.info('Migration 004 (button mode features) applied');
}
