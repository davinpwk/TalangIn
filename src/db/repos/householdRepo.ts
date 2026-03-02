import { db } from '../database';
import { generateId, generateJoinCode } from '../../domain/money';

export const householdRepo = {
  async create(data: { name: string; ownerTelegramId: number; currency: string }) {
    const id = generateId();
    const joinCode = generateJoinCode();
    const now = Math.floor(Date.now() / 1000);

    await db
      .insertInto('households')
      .values({
        id,
        name: data.name,
        owner_telegram_id: data.ownerTelegramId,
        join_code: joinCode,
        currency_default: data.currency,
        created_at: now,
      })
      .execute();

    await db
      .insertInto('household_members')
      .values({
        household_id: id,
        telegram_id: data.ownerTelegramId,
        role: 'OWNER',
        status: 'ACTIVE',
        joined_at: now,
      })
      .execute();

    return { id, joinCode };
  },

  async getById(id: string) {
    return db
      .selectFrom('households')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();
  },

  async getByJoinCode(joinCode: string) {
    return db
      .selectFrom('households')
      .selectAll()
      .where('join_code', '=', joinCode.toUpperCase())
      .executeTakeFirst();
  },

  async getActiveHouseholdsForUser(telegramId: number) {
    return db
      .selectFrom('household_members as hm')
      .innerJoin('households as h', 'h.id', 'hm.household_id')
      .select([
        'h.id',
        'h.name',
        'h.currency_default',
        'h.join_code',
        'h.owner_telegram_id',
        'hm.role',
      ])
      .where('hm.telegram_id', '=', telegramId)
      .where('hm.status', '=', 'ACTIVE')
      .execute();
  },

  async getMembership(householdId: string, telegramId: number) {
    return db
      .selectFrom('household_members')
      .selectAll()
      .where('household_id', '=', householdId)
      .where('telegram_id', '=', telegramId)
      .executeTakeFirst();
  },

  async getActiveMembers(householdId: string) {
    return db
      .selectFrom('household_members as hm')
      .innerJoin('users as u', 'u.telegram_id', 'hm.telegram_id')
      .select([
        'u.telegram_id',
        'u.username',
        'u.first_name',
        'u.last_name',
        'hm.role',
        'hm.status',
      ])
      .where('hm.household_id', '=', householdId)
      .where('hm.status', '=', 'ACTIVE')
      .execute();
  },

  async kickMember(householdId: string, telegramId: number) {
    await db
      .updateTable('household_members')
      .set({ status: 'KICKED' })
      .where('household_id', '=', householdId)
      .where('telegram_id', '=', telegramId)
      .execute();
  },

  // Join requests
  async createJoinRequest(householdId: string, requesterTelegramId: number) {
    const id = generateId();
    const now = Math.floor(Date.now() / 1000);
    await db
      .insertInto('join_requests')
      .values({
        id,
        household_id: householdId,
        requester_telegram_id: requesterTelegramId,
        status: 'PENDING',
        created_at: now,
        decided_at: null,
        decided_by: null,
      })
      .execute();
    return id;
  },

  async getJoinRequest(id: string) {
    return db
      .selectFrom('join_requests')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();
  },

  async getPendingJoinRequest(householdId: string, requesterTelegramId: number) {
    return db
      .selectFrom('join_requests')
      .selectAll()
      .where('household_id', '=', householdId)
      .where('requester_telegram_id', '=', requesterTelegramId)
      .where('status', '=', 'PENDING')
      .executeTakeFirst();
  },

  async decideJoinRequest(
    id: string,
    status: 'APPROVED' | 'DENIED',
    decidedBy: number
  ) {
    const now = Math.floor(Date.now() / 1000);
    await db
      .updateTable('join_requests')
      .set({ status, decided_at: now, decided_by: decidedBy })
      .where('id', '=', id)
      .execute();
  },

  async getPendingJoinRequestsForOwner(ownerTelegramId: number) {
    return db
      .selectFrom('join_requests as jr')
      .innerJoin('households as h', 'h.id', 'jr.household_id')
      .innerJoin('users as u', 'u.telegram_id', 'jr.requester_telegram_id')
      .select([
        'jr.id',
        'jr.requester_telegram_id',
        'h.name as household_name',
        'u.username',
        'u.first_name',
      ])
      .where('h.owner_telegram_id', '=', ownerTelegramId)
      .where('jr.status', '=', 'PENDING')
      .execute();
  },

  async addMember(householdId: string, telegramId: number) {
    const now = Math.floor(Date.now() / 1000);
    await db
      .insertInto('household_members')
      .values({
        household_id: householdId,
        telegram_id: telegramId,
        role: 'MEMBER',
        status: 'ACTIVE',
        joined_at: now,
      })
      .onConflict((oc) =>
        oc
          .columns(['household_id', 'telegram_id'])
          .doUpdateSet({ status: 'ACTIVE', role: 'MEMBER' })
      )
      .execute();
  },
};
