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
      })
      .onConflict((oc) =>
        oc.column('telegram_id').doUpdateSet({
          username: data.username,
          first_name: data.firstName,
          last_name: data.lastName,
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
};
