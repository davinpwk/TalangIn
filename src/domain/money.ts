import crypto from 'crypto';

// ─── ID / code generation ────────────────────────────────────────────────────

/** 16-char hex ID (8 random bytes). Safe for use in callback_data. */
export function generateId(): string {
  return crypto.randomBytes(8).toString('hex');
}

/** 16-char hex token for single-use confirmation. */
export function generateToken(): string {
  return crypto.randomBytes(8).toString('hex');
}

/** 8-char uppercase alphanumeric join code. */
export function generateJoinCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const bytes = crypto.randomBytes(8);
  return Array.from(bytes, (b) => chars[b % chars.length]).join('');
}

// ─── Markdown helpers ─────────────────────────────────────────────────────────

/** Escape characters that break Telegram's legacy Markdown parser (e.g. underscores in usernames). */
export function escapeMd(text: string): string {
  return text.replace(/_/g, '\\_');
}

// ─── Money helpers ────────────────────────────────────────────────────────────

/**
 * Convert a dollar amount (float) to integer cents.
 * e.g. 35.00 → 3500,  35.5 → 3550
 */
export function toCents(amount: number): number {
  return Math.round(amount * 100);
}

/**
 * Format cents as a human-readable currency string.
 * e.g. 3500, 'AUD' → 'AUD 35.00'
 */
export function formatMoney(amountCents: number, currency: string): string {
  const dollars = (amountCents / 100).toFixed(2);
  return `${currency} ${dollars}`;
}

/**
 * Format cents as just the numeric string (no currency prefix).
 * e.g. 3500 → '35.00'
 */
export function formatCents(amountCents: number): string {
  return (amountCents / 100).toFixed(2);
}
