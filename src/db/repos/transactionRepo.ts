import { db } from '../database';
import { generateId } from '../../domain/money';

export interface CreateTransactionData {
  householdId: string;
  actorTelegramId: number;
  type: 'EXPENSE' | 'PAYMENT' | 'DEBT_LOG';
  description: string;
  currency: string;
  amountCentsTotal: number;
  payloadJson: string;
  proofFileId: string;
  proofFileUniqueId: string;
}

export const transactionRepo = {
  async create(data: CreateTransactionData): Promise<string> {
    const id = generateId();
    const now = Math.floor(Date.now() / 1000);
    await db
      .insertInto('transactions')
      .values({
        id,
        household_id: data.householdId,
        actor_telegram_id: data.actorTelegramId,
        type: data.type,
        description: data.description,
        currency: data.currency,
        amount_cents_total: data.amountCentsTotal,
        payload_json: data.payloadJson,
        proof_file_id: data.proofFileId,
        proof_file_unique_id: data.proofFileUniqueId,
        created_at: now,
      })
      .execute();
    return id;
  },
};
