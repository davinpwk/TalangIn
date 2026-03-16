import BetterSqlite3 from 'better-sqlite3';
import { Kysely, SqliteDialect } from 'kysely';
import { config } from '../utils/config';
import { logger } from '../utils/logger';
import type { Database } from './schema';
import { runMigrations } from './migrations/001_initial';
import { migrate002 } from './migrations/002_add_language';
import { migrate003 } from './migrations/003_net_existing_debts';
import { migrate004 } from './migrations/004_button_mode_features';

const rawDb = new BetterSqlite3(config.dbPath);

// Performance pragmas
rawDb.pragma('journal_mode = WAL');
rawDb.pragma('foreign_keys = ON');
rawDb.pragma('synchronous = NORMAL');

runMigrations(rawDb);
migrate002(rawDb);
migrate003(rawDb);
migrate004(rawDb);
logger.info({ dbPath: config.dbPath }, 'Database initialized');

export const db = new Kysely<Database>({
  dialect: new SqliteDialect({ database: rawDb }),
});

export { rawDb };
