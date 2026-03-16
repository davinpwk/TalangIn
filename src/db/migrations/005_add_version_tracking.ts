import type BetterSqlite3 from 'better-sqlite3';
import { logger } from '../../utils/logger';

export function migrate005(db: BetterSqlite3.Database): void {
  try {
    db.prepare(`ALTER TABLE users ADD COLUMN last_seen_version TEXT DEFAULT NULL`).run();
  } catch {
    // Column already exists — ignore
  }
  logger.info('Migration 005 (version tracking) applied');
}
