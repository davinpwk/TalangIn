import { Context } from 'telegraf';
import { householdRepo } from '../db/repos/householdRepo';
import { debtRepo } from '../db/repos/debtRepo';
import { formatMoney, escapeMd } from '../domain/money';
import type { CheckHouseholdIntent } from '../llm/schemas';

export async function handle(ctx: Context, intent: CheckHouseholdIntent): Promise<void> {
  const telegramId = ctx.from!.id;
  const households = await householdRepo.getActiveHouseholdsForUser(telegramId);

  const owned = households.filter((h) => h.owner_telegram_id === telegramId);
  if (owned.length === 0) {
    await ctx.reply('Only household owners can use this command.');
    return;
  }

  let target = owned[0];
  if (intent.household_hint && owned.length > 1) {
    const hint = intent.household_hint.toLowerCase();
    const match = owned.find((h) => h.name.toLowerCase().includes(hint));
    if (match) target = match;
  }

  const members = await householdRepo.getActiveMembers(target.id);
  const debts = await debtRepo.getAllDebtsInHousehold(target.id);
  const currency = target.currency_default;

  // Group debts by debtor
  const byDebtor = new Map<number, typeof debts>();
  for (const d of debts) {
    if (!byDebtor.has(d.debtor_telegram_id)) byDebtor.set(d.debtor_telegram_id, []);
    byDebtor.get(d.debtor_telegram_id)!.push(d);
  }

  const householdName = escapeMd(target.name);
  let text = `📋 *Household Summary — ${householdName}*\n\n`;

  for (const member of members) {
    const memberDebts = byDebtor.get(member.telegram_id) ?? [];
    const name = escapeMd(member.username ? `@${member.username}` : member.first_name);

    if (memberDebts.length === 0) {
      text += `${name} — ✅ settled up\n`;
    } else {
      text += `${name} owes:\n`;
      for (const d of memberDebts) {
        const creditor = escapeMd(d.creditor_username ? `@${d.creditor_username}` : d.creditor_first_name);
        text += `  • ${creditor}: ${formatMoney(d.amount_cents, currency)}\n`;
      }
    }
    text += '\n';
  }

  await ctx.reply(text.trimEnd(), { parse_mode: 'Markdown' });
}
