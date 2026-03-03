import type BetterSqlite3 from 'better-sqlite3';

/**
 * One-time migration: net out any existing cross-debts in the ledger.
 * For every pair (A→B, B→A) where both are > 0, reduce to a single
 * net direction and zero the other side.
 */
export function migrate003(rawDb: BetterSqlite3.Database): void {
  const rows = rawDb
    .prepare(
      `SELECT household_id, debtor_telegram_id, creditor_telegram_id, amount_cents
       FROM debts_ledger
       WHERE amount_cents > 0`
    )
    .all() as Array<{
      household_id: string;
      debtor_telegram_id: number;
      creditor_telegram_id: number;
      amount_cents: number;
    }>;

  // Track which pairs we've already processed (use canonical key: lower_id:higher_id)
  const processed = new Set<string>();

  const update = rawDb.prepare(
    `UPDATE debts_ledger
     SET amount_cents = ?
     WHERE household_id = ? AND debtor_telegram_id = ? AND creditor_telegram_id = ?`
  );

  const netPair = rawDb.transaction(
    (
      householdId: string,
      aId: number,
      bId: number,
      aOwesB: number,
      bOwesA: number
    ) => {
      const net = bOwesA - aOwesB;
      if (net > 0) {
        // B still owes A the net amount; A owes B nothing
        update.run(0, householdId, aId, bId);
        update.run(net, householdId, bId, aId);
      } else if (net < 0) {
        // A still owes B the net amount; B owes A nothing
        update.run(-net, householdId, aId, bId);
        update.run(0, householdId, bId, aId);
      } else {
        // Exactly cancel out
        update.run(0, householdId, aId, bId);
        update.run(0, householdId, bId, aId);
      }
    }
  );

  for (const row of rows) {
    const { household_id, debtor_telegram_id: aId, creditor_telegram_id: bId, amount_cents: aOwesB } = row;

    // Canonical key so we only process each pair once
    const lo = Math.min(aId, bId);
    const hi = Math.max(aId, bId);
    const key = `${household_id}:${lo}:${hi}`;
    if (processed.has(key)) continue;
    processed.add(key);

    // Look up the reverse direction
    const reverse = rawDb
      .prepare(
        `SELECT amount_cents FROM debts_ledger
         WHERE household_id = ? AND debtor_telegram_id = ? AND creditor_telegram_id = ?`
      )
      .get(household_id, bId, aId) as { amount_cents: number } | undefined;

    const bOwesA = reverse?.amount_cents ?? 0;
    if (bOwesA === 0) continue; // No cross-debt, nothing to net

    netPair(household_id, aId, bId, aOwesB, bOwesA);
  }
}
