import { db } from '../database';

export interface UpsertUserData {
  telegramId: number;
  username: string | null;
  firstName: string;
  lastName: string | null;
}

export const userRepo = {
  async upsert(data: UpsertUserData): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    await db
      .insertInto('users')
      .values({
        telegram_id: data.telegramId,
        username: data.username,
        first_name: data.firstName,
        last_name: data.lastName,
        started_at: now,
        nickname: null,
        active_household_id: null,
      })
      .onConflict((oc) =>
        oc.column('telegram_id').doUpdateSet({
          username: data.username,
          first_name: data.firstName,
          last_name: data.lastName,
          // NOTE: do NOT overwrite nickname, active_household_id, language
        })
      )
      .execute();
  },

  async getById(telegramId: number) {
    return db
      .selectFrom('users')
      .selectAll()
      .where('telegram_id', '=', telegramId)
      .executeTakeFirst();
  },

  async getByUsername(username: string) {
    return db
      .selectFrom('users')
      .selectAll()
      .where('username', '=', username.replace(/^@/, ''))
      .executeTakeFirst();
  },

  async setLanguage(telegramId: number, lang: string): Promise<void> {
    await db
      .updateTable('users')
      .set({ language: lang })
      .where('telegram_id', '=', telegramId)
      .execute();
  },

  async setNickname(telegramId: number, nickname: string | null): Promise<void> {
    await db
      .updateTable('users')
      .set({ nickname })
      .where('telegram_id', '=', telegramId)
      .execute();
  },

  async setActiveHousehold(telegramId: number, householdId: string | null): Promise<void> {
    await db
      .updateTable('users')
      .set({ active_household_id: householdId })
      .where('telegram_id', '=', telegramId)
      .execute();
  },

  async getAllWithLanguage() {
    return db
      .selectFrom('users')
      .selectAll()
      .where('language', 'is not', null)
      .execute();
  },

  async setLastSeenVersion(telegramId: number, version: string): Promise<void> {
    await db
      .updateTable('users')
      .set({ last_seen_version: version })
      .where('telegram_id', '=', telegramId)
      .execute();
  },
};
