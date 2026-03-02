import type BetterSqlite3 from 'better-sqlite3';

export function runMigrations(rawDb: BetterSqlite3.Database): void {
  rawDb.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS users (
      telegram_id  INTEGER PRIMARY KEY,
      username     TEXT,
      first_name   TEXT NOT NULL,
      last_name    TEXT,
      started_at   INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS households (
      id                  TEXT PRIMARY KEY,
      name                TEXT NOT NULL,
      owner_telegram_id   INTEGER NOT NULL REFERENCES users(telegram_id),
      join_code           TEXT UNIQUE NOT NULL,
      currency_default    TEXT NOT NULL DEFAULT 'AUD',
      created_at          INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS household_members (
      household_id  TEXT    NOT NULL REFERENCES households(id),
      telegram_id   INTEGER NOT NULL REFERENCES users(telegram_id),
      role          TEXT    NOT NULL CHECK(role IN ('OWNER','MEMBER')),
      status        TEXT    NOT NULL CHECK(status IN ('ACTIVE','KICKED')),
      joined_at     INTEGER NOT NULL,
      PRIMARY KEY (household_id, telegram_id)
    );

    CREATE TABLE IF NOT EXISTS join_requests (
      id                    TEXT PRIMARY KEY,
      household_id          TEXT    NOT NULL REFERENCES households(id),
      requester_telegram_id INTEGER NOT NULL REFERENCES users(telegram_id),
      status                TEXT    NOT NULL CHECK(status IN ('PENDING','APPROVED','DENIED')),
      created_at            INTEGER NOT NULL,
      decided_at            INTEGER,
      decided_by            INTEGER REFERENCES users(telegram_id)
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id                  TEXT PRIMARY KEY,
      household_id        TEXT    NOT NULL REFERENCES households(id),
      actor_telegram_id   INTEGER NOT NULL REFERENCES users(telegram_id),
      type                TEXT    NOT NULL CHECK(type IN ('EXPENSE','PAYMENT')),
      description         TEXT    NOT NULL,
      currency            TEXT    NOT NULL,
      amount_cents_total  INTEGER NOT NULL,
      payload_json        TEXT    NOT NULL,
      proof_file_id       TEXT    NOT NULL,
      proof_file_unique_id TEXT   NOT NULL,
      created_at          INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS debts_ledger (
      household_id         TEXT    NOT NULL,
      debtor_telegram_id   INTEGER NOT NULL,
      creditor_telegram_id INTEGER NOT NULL,
      amount_cents         INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (household_id, debtor_telegram_id, creditor_telegram_id)
    );

    CREATE TABLE IF NOT EXISTS pending_actions (
      id           TEXT PRIMARY KEY,
      telegram_id  INTEGER NOT NULL REFERENCES users(telegram_id),
      type         TEXT    NOT NULL,
      payload_json TEXT    NOT NULL,
      token        TEXT    UNIQUE NOT NULL,
      expires_at   INTEGER NOT NULL,
      used_at      INTEGER,
      created_at   INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_pending_actions_user
      ON pending_actions(telegram_id, used_at, expires_at);

    CREATE TABLE IF NOT EXISTS pending_notifications (
      id                TEXT PRIMARY KEY,
      target_telegram_id INTEGER NOT NULL,
      message           TEXT    NOT NULL,
      created_at        INTEGER NOT NULL,
      sent_at           INTEGER
    );

    CREATE INDEX IF NOT EXISTS idx_pending_notifications_target
      ON pending_notifications(target_telegram_id, sent_at);
  `);
}
