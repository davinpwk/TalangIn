import { db } from '../database';
import { sql } from 'kysely';
import { generateId } from '../../domain/money';

export interface Item {
  id: string;
  household_id: string;
  name: string;
  created_by_telegram_id: number;
  created_at: number;
  is_active: number;
}

export interface ItemCount {
  itemId: string;
  itemName: string;
  counts: Array<{ telegramId: number; displayName: string; quantity: number }>;
}

export const itemRepo = {
  async addItem(
    householdId: string,
    name: string,
    createdBy: number
  ): Promise<{ id: string }> {
    const id = generateId();
    const now = Math.floor(Date.now() / 1000);
    await db
      .insertInto('items')
      .values({ id, household_id: householdId, name, created_by_telegram_id: createdBy, created_at: now, is_active: 1 })
      .execute();
    return { id };
  },

  async getItemsForHousehold(householdId: string): Promise<Item[]> {
    return db
      .selectFrom('items')
      .selectAll()
      .where('household_id', '=', householdId)
      .where('is_active', '=', 1)
      .orderBy('created_at', 'asc')
      .execute() as Promise<Item[]>;
  },

  async deactivateItem(itemId: string): Promise<void> {
    await db
      .updateTable('items')
      .set({ is_active: 0 })
      .where('id', '=', itemId)
      .execute();
  },

  async logUsage(itemId: string, userTelegramId: number, quantity: number): Promise<void> {
    const id = generateId();
    const now = Math.floor(Date.now() / 1000);
    await db
      .insertInto('item_usage_log')
      .values({ id, item_id: itemId, user_telegram_id: userTelegramId, quantity, logged_at: now })
      .execute();
  },

  async getCountsForHousehold(householdId: string): Promise<ItemCount[]> {
    // Get active items
    const items = await this.getItemsForHousehold(householdId);
    if (items.length === 0) return [];

    // Get usage log joined with users for display names
    const logs = await db
      .selectFrom('item_usage_log as ul')
      .innerJoin('items as i', 'i.id', 'ul.item_id')
      .leftJoin('users as u', 'u.telegram_id', 'ul.user_telegram_id')
      .select([
        'i.id as item_id',
        'i.name as item_name',
        'ul.user_telegram_id',
        'u.nickname',
        'u.username',
        'u.first_name',
        sql<number>`sum(ul.quantity)`.as('total_quantity'),
      ])
      .where('i.household_id', '=', householdId)
      .where('i.is_active', '=', 1)
      .groupBy(['i.id', 'ul.user_telegram_id'])
      .execute();

    const result: ItemCount[] = items.map((item) => {
      const itemLogs = logs.filter((l) => l.item_id === item.id);
      return {
        itemId: item.id,
        itemName: item.name,
        counts: itemLogs.map((l) => ({
          telegramId: l.user_telegram_id,
          displayName: (l.nickname as string | null) ?? (l.username ? `@${l.username}` : (l.first_name as string) ?? `user ${l.user_telegram_id}`),
          quantity: Number(l.total_quantity),
        })),
      };
    });

    return result;
  },

  async resetItemCounts(itemId: string): Promise<void> {
    await db
      .deleteFrom('item_usage_log')
      .where('item_id', '=', itemId)
      .execute();
  },
};
