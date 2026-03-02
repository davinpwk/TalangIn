import { db } from '../database';
import { generateId } from '../../domain/money';

export const pendingNotificationRepo = {
  async create(targetTelegramId: number, message: string): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    await db
      .insertInto('pending_notifications')
      .values({
        id: generateId(),
        target_telegram_id: targetTelegramId,
        message,
        created_at: now,
        sent_at: null,
      })
      .execute();
  },

  async getUnsent(targetTelegramId: number) {
    return db
      .selectFrom('pending_notifications')
      .selectAll()
      .where('target_telegram_id', '=', targetTelegramId)
      .where('sent_at', 'is', null)
      .orderBy('created_at', 'asc')
      .execute();
  },

  async markSent(id: string): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    await db
      .updateTable('pending_notifications')
      .set({ sent_at: now })
      .where('id', '=', id)
      .execute();
  },
};
