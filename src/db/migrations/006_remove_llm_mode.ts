import type BetterSqlite3 from 'better-sqlite3';
import { logger } from '../../utils/logger';

export function migrate006(db: BetterSqlite3.Database): void {
  // LLM mode has been removed. Migrate any remaining LLM-mode users to button mode.
  db.prepare(`UPDATE users SET mode = 'button' WHERE mode = 'llm' OR mode IS NULL`).run();
  logger.info('Migration 006 (remove LLM mode): all users set to button mode');
}
