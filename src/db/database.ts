import BetterSqlite3 from 'better-sqlite3';
import { Kysely, SqliteDialect } from 'kysely';
import { config } from '../utils/config';
import { logger } from '../utils/logger';
import type { Database } from './schema';
import { runMigrations } from './migrations/001_initial';

const rawDb = new BetterSqlite3(config.dbPath);

// Performance pragmas
rawDb.pragma('journal_mode = WAL');
rawDb.pragma('foreign_keys = ON');
rawDb.pragma('synchronous = NORMAL');

runMigrations(rawDb);
logger.info({ dbPath: config.dbPath }, 'Database initialized');

export const db = new Kysely<Database>({
  dialect: new SqliteDialect({ database: rawDb }),
});

export { rawDb };
