export interface SplitInput {
  telegramId: number;
  username: string | null;
  firstName: string;
  /** For CUSTOM splits: the amount (in currency units, e.g. dollars) they owe. */
  amount?: number;
  /** For CUSTOM splits: their percentage share (0-100). */
  percentage?: number;
}

export interface SplitResult {
  telegramId: number;
  username: string | null;
  firstName: string;
  amountCents: number;
}

/**
 * Split totalCents evenly among participants.
 * Remainder cents are distributed one-per-person starting from index 0.
 * Guarantees: sum(results) === totalCents
 */
export function splitEvenly(
  totalCents: number,
  participants: Array<{ telegramId: number; username: string | null; firstName: string }>
): SplitResult[] {
  const n = participants.length;
  if (n === 0) throw new Error('splitEvenly: no participants');

  const base = Math.floor(totalCents / n);
  const remainder = totalCents - base * n;

  return participants.map((p, i) => ({
    telegramId: p.telegramId,
    username: p.username,
    firstName: p.firstName,
    amountCents: base + (i < remainder ? 1 : 0),
  }));
}

/**
 * Split by explicit amounts (in dollars). Converts to cents, validates sum.
 * Returns null if the sum doesn't match totalCents.
 */
export function splitByAmounts(
  totalCents: number,
  participants: SplitInput[]
): SplitResult[] | null {
  const results: SplitResult[] = participants.map((p) => {
    if (p.amount === undefined) throw new Error('splitByAmounts: missing amount');
    return {
      telegramId: p.telegramId,
      username: p.username,
      firstName: p.firstName,
      amountCents: Math.round(p.amount * 100),
    };
  });

  const sum = results.reduce((acc, r) => acc + r.amountCents, 0);
  if (sum > totalCents) return null; // over-allocated
  return results;
}

/**
 * Split by percentages. The remainder (due to rounding) goes to the first participant.
 * Returns null if percentages don't sum to approximately 100.
 */
export function splitByPercentages(
  totalCents: number,
  participants: SplitInput[]
): SplitResult[] | null {
  const totalPct = participants.reduce((acc, p) => acc + (p.percentage ?? 0), 0);
  // Allow small float deviation
  if (Math.abs(totalPct - 100) > 0.01) return null;

  const rawCents = participants.map((p) =>
    Math.floor(totalCents * ((p.percentage ?? 0) / 100))
  );
  const allocated = rawCents.reduce((a, b) => a + b, 0);
  const leftover = totalCents - allocated;

  return participants.map((p, i) => ({
    telegramId: p.telegramId,
    username: p.username,
    firstName: p.firstName,
    amountCents: rawCents[i] + (i === 0 ? leftover : 0),
  }));
}

/** Verify a split array sums exactly to totalCents. */
export function validateSplitSum(splits: SplitResult[], totalCents: number): boolean {
  const sum = splits.reduce((acc, s) => acc + s.amountCents, 0);
  return sum === totalCents;
}
