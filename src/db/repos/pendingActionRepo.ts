import { db } from '../database';
import { generateId, generateToken } from '../../domain/money';

// Expiry windows in seconds
const EXPIRY = {
  AWAITING_PROOF: 30 * 60,      // 30 minutes
  AWAITING_CONFIRM: 10 * 60,    // 10 minutes
  AWAITING_HOUSEHOLD: 5 * 60,   // 5 minutes
  // Button mode wizard steps — 30 minutes each
  BM_EXPENSE_DESC: 30 * 60,
  BM_EXPENSE_AMOUNT: 30 * 60,
  BM_EXPENSE_MEMBERS: 30 * 60,
  BM_EXPENSE_CUSTOM_AMOUNT: 30 * 60,
  BM_PAYMENT_MEMBER: 30 * 60,
  BM_PAYMENT_AMOUNT: 30 * 60,
  BM_IOWE_CREDITOR: 30 * 60,
  BM_IOWE_DESC: 30 * 60,
  BM_IOWE_AMOUNT: 30 * 60,
  BM_BROADCAST_MSG: 30 * 60,
  BM_ITEM_QUANTITY: 30 * 60,
  BM_ITEM_ADD_NAME: 30 * 60,
  BM_NICKNAME: 30 * 60,
  BM_AWAITING_PROOF: 30 * 60,
} as const;

type ActionType = keyof typeof EXPIRY;

export interface PendingAction {
  id: string;
  telegram_id: number;
  type: string;
  payload_json: string;
  token: string;
  expires_at: number;
  used_at: number | null;
  created_at: number;
}

export const pendingActionRepo = {
  async create(
    telegramId: number,
    type: ActionType,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    payload: any
  ): Promise<PendingAction> {
    // Clear any existing active actions for this user first
    await this.clearForUser(telegramId);

    const id = generateId();
    const token = generateToken();
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = now + EXPIRY[type];

    const row = {
      id,
      telegram_id: telegramId,
      type,
      payload_json: JSON.stringify(payload),
      token,
      expires_at: expiresAt,
      used_at: null,
      created_at: now,
    };

    await db.insertInto('pending_actions').values(row).execute();
    return row;
  },

  async getActive(telegramId: number): Promise<PendingAction | undefined> {
    const now = Math.floor(Date.now() / 1000);
    return db
      .selectFrom('pending_actions')
      .selectAll()
      .where('telegram_id', '=', telegramId)
      .where('used_at', 'is', null)
      .where('expires_at', '>', now)
      .orderBy('created_at', 'desc')
      .limit(1)
      .executeTakeFirst() as Promise<PendingAction | undefined>;
  },

  async getById(id: string): Promise<PendingAction | undefined> {
    return db
      .selectFrom('pending_actions')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst() as Promise<PendingAction | undefined>;
  },

  async markUsed(id: string): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    await db
      .updateTable('pending_actions')
      .set({ used_at: now })
      .where('id', '=', id)
      .execute();
  },

  async clearForUser(telegramId: number): Promise<void> {
    await db
      .deleteFrom('pending_actions')
      .where('telegram_id', '=', telegramId)
      .where('used_at', 'is', null)
      .execute();
  },

  /**
   * Update the payload of an existing pending action (keeps same id/token/type).
   * Used by button mode wizards to advance state without recreating.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async updatePayload(id: string, newPayload: any): Promise<void> {
    await db
      .updateTable('pending_actions')
      .set({ payload_json: JSON.stringify(newPayload) })
      .where('id', '=', id)
      .execute();
  },

  /**
   * Update both type and payload of an existing pending action.
   * Extends expiry to match new type. Used by button mode wizards.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async updateTypeAndPayload(id: string, newType: ActionType, newPayload: any): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = now + EXPIRY[newType];
    await db
      .updateTable('pending_actions')
      .set({
        type: newType,
        payload_json: JSON.stringify(newPayload),
        expires_at: expiresAt,
      })
      .where('id', '=', id)
      .execute();
  },

  /**
   * Validate and consume a pending action by id+token.
   * Returns the action if valid, null if invalid/expired/used.
   */
  async consume(id: string, token: string): Promise<PendingAction | null> {
    const action = await this.getById(id);
    if (!action) return null;

    const now = Math.floor(Date.now() / 1000);
    if (action.used_at !== null) return null;
    if (action.expires_at < now) return null;
    if (action.token !== token) return null;

    await this.markUsed(id);
    return action;
  },
};
