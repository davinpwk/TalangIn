import { db } from '../database';

export const debtRepo = {
  /**
   * Increase debt: debtorId owes creditorId more money.
   * Automatically nets against any reverse debt (creditorId owes debtorId).
   * e.g. if creditor already owes debtor 30 and we add 10, the result is
   * creditor still owes debtor 20 — no new row for debtor→creditor.
   */
  async addDebt(
    householdId: string,
    debtorTelegramId: number,
    creditorTelegramId: number,
    amountCents: number
  ): Promise<void> {
    // Check for an existing reverse debt (the creditor owes the debtor)
    const reverseRow = await db
      .selectFrom('debts_ledger')
      .select('amount_cents')
      .where('household_id', '=', householdId)
      .where('debtor_telegram_id', '=', creditorTelegramId)
      .where('creditor_telegram_id', '=', debtorTelegramId)
      .executeTakeFirst();

    const reverseDebt = reverseRow?.amount_cents ?? 0;

    if (reverseDebt >= amountCents) {
      // The reverse debt absorbs the new amount entirely — just reduce it
      await db
        .updateTable('debts_ledger')
        .set({ amount_cents: reverseDebt - amountCents })
        .where('household_id', '=', householdId)
        .where('debtor_telegram_id', '=', creditorTelegramId)
        .where('creditor_telegram_id', '=', debtorTelegramId)
        .execute();
      return;
    }

    // The new debt exceeds the reverse debt — zero out reverse and add remainder forward
    const remainder = amountCents - reverseDebt;

    if (reverseDebt > 0) {
      await db
        .updateTable('debts_ledger')
        .set({ amount_cents: 0 })
        .where('household_id', '=', householdId)
        .where('debtor_telegram_id', '=', creditorTelegramId)
        .where('creditor_telegram_id', '=', debtorTelegramId)
        .execute();
    }

    await db
      .insertInto('debts_ledger')
      .values({
        household_id: householdId,
        debtor_telegram_id: debtorTelegramId,
        creditor_telegram_id: creditorTelegramId,
        amount_cents: remainder,
      })
      .onConflict((oc) =>
        oc
          .columns(['household_id', 'debtor_telegram_id', 'creditor_telegram_id'])
          .doUpdateSet((eb) => ({
            amount_cents: eb('debts_ledger.amount_cents', '+', remainder),
          }))
      )
      .execute();
  },

  /**
   * Reduce debt (payment). Returns the actual amount deducted (capped at outstanding).
   * We never allow negative debts — overpayments are capped at current outstanding.
   */
  async reduceDebt(
    householdId: string,
    debtorTelegramId: number,
    creditorTelegramId: number,
    amountCents: number
  ): Promise<{ deducted: number; wasOverpayment: boolean }> {
    const existing = await db
      .selectFrom('debts_ledger')
      .select('amount_cents')
      .where('household_id', '=', householdId)
      .where('debtor_telegram_id', '=', debtorTelegramId)
      .where('creditor_telegram_id', '=', creditorTelegramId)
      .executeTakeFirst();

    const outstanding = existing?.amount_cents ?? 0;
    const deducted = Math.min(amountCents, outstanding);
    const wasOverpayment = amountCents > outstanding;

    if (outstanding === 0) {
      return { deducted: 0, wasOverpayment: true };
    }

    await db
      .updateTable('debts_ledger')
      .set({ amount_cents: outstanding - deducted })
      .where('household_id', '=', householdId)
      .where('debtor_telegram_id', '=', debtorTelegramId)
      .where('creditor_telegram_id', '=', creditorTelegramId)
      .execute();

    return { deducted, wasOverpayment };
  },

  /**
   * Get outstanding debt between two people in a household.
   */
  async getDebt(
    householdId: string,
    debtorTelegramId: number,
    creditorTelegramId: number
  ): Promise<number> {
    const row = await db
      .selectFrom('debts_ledger')
      .select('amount_cents')
      .where('household_id', '=', householdId)
      .where('debtor_telegram_id', '=', debtorTelegramId)
      .where('creditor_telegram_id', '=', creditorTelegramId)
      .executeTakeFirst();
    return row?.amount_cents ?? 0;
  },

  /**
   * All debts involving a user in a household (as debtor or creditor).
   */
  async getDebtsForUserInHousehold(householdId: string, telegramId: number) {
    return db
      .selectFrom('debts_ledger as dl')
      .innerJoin('users as debtor', 'debtor.telegram_id', 'dl.debtor_telegram_id')
      .innerJoin('users as creditor', 'creditor.telegram_id', 'dl.creditor_telegram_id')
      .select([
        'dl.household_id',
        'dl.debtor_telegram_id',
        'dl.creditor_telegram_id',
        'dl.amount_cents',
        'debtor.username as debtor_username',
        'debtor.first_name as debtor_first_name',
        'creditor.username as creditor_username',
        'creditor.first_name as creditor_first_name',
      ])
      .where('dl.household_id', '=', householdId)
      .where((eb) =>
        eb.or([
          eb('dl.debtor_telegram_id', '=', telegramId),
          eb('dl.creditor_telegram_id', '=', telegramId),
        ])
      )
      .where('dl.amount_cents', '>', 0)
      .execute();
  },

  /**
   * All debts in a household (every debtor/creditor pair with outstanding balance).
   */
  async getAllDebtsInHousehold(householdId: string) {
    return db
      .selectFrom('debts_ledger as dl')
      .innerJoin('users as debtor', 'debtor.telegram_id', 'dl.debtor_telegram_id')
      .innerJoin('users as creditor', 'creditor.telegram_id', 'dl.creditor_telegram_id')
      .select([
        'dl.debtor_telegram_id',
        'dl.creditor_telegram_id',
        'dl.amount_cents',
        'debtor.username as debtor_username',
        'debtor.first_name as debtor_first_name',
        'creditor.username as creditor_username',
        'creditor.first_name as creditor_first_name',
      ])
      .where('dl.household_id', '=', householdId)
      .where('dl.amount_cents', '>', 0)
      .execute();
  },

  /**
   * All debts for a user across all their households.
   */
  async getAllDebtsForUser(telegramId: number) {
    return db
      .selectFrom('debts_ledger as dl')
      .innerJoin('households as h', 'h.id', 'dl.household_id')
      .innerJoin('users as debtor', 'debtor.telegram_id', 'dl.debtor_telegram_id')
      .innerJoin('users as creditor', 'creditor.telegram_id', 'dl.creditor_telegram_id')
      .select([
        'dl.household_id',
        'h.name as household_name',
        'dl.debtor_telegram_id',
        'dl.creditor_telegram_id',
        'dl.amount_cents',
        'h.currency_default',
        'debtor.username as debtor_username',
        'debtor.first_name as debtor_first_name',
        'creditor.username as creditor_username',
        'creditor.first_name as creditor_first_name',
      ])
      .where((eb) =>
        eb.or([
          eb('dl.debtor_telegram_id', '=', telegramId),
          eb('dl.creditor_telegram_id', '=', telegramId),
        ])
      )
      .where('dl.amount_cents', '>', 0)
      .execute();
  },
};
