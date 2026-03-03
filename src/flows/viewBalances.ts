import { Context } from 'telegraf';
import { householdRepo } from '../db/repos/householdRepo';
import { debtRepo } from '../db/repos/debtRepo';
import { balanceNavKeyboard } from '../bot/keyboards/householdKeyboard';
import { formatMoney, escapeMd } from '../domain/money';
import { t, getLang } from '../i18n';
import type { ViewBalancesIntent } from '../llm/schemas';

export async function handle(ctx: Context, intent: ViewBalancesIntent): Promise<void> {
  const telegramId = ctx.from!.id;
  const lang = getLang(ctx);
  const households = await householdRepo.getActiveHouseholdsForUser(telegramId);

  if (households.length === 0) {
    await ctx.reply(t(lang, 'notInAnyHousehold'));
    return;
  }

  let targetHousehold = households[0];
  if (intent.household_hint && households.length > 1) {
    const hint = intent.household_hint.toLowerCase();
    const match = households.find((h) => h.name.toLowerCase().includes(hint));
    if (match) targetHousehold = match;
  }

  await sendBalanceView(ctx, telegramId, targetHousehold, households);
}

export async function handleHouseholdSelect(ctx: Context, data: string): Promise<void> {
  const householdId = data.replace('cb:bal:', '');
  const telegramId = ctx.from!.id;

  const households = await householdRepo.getActiveHouseholdsForUser(telegramId);
  const target = households.find((h) => h.id === householdId);
  if (!target) {
    await ctx.answerCbQuery('Household not found.');
    return;
  }

  await ctx.answerCbQuery();
  await sendBalanceView(ctx, telegramId, target, households, true);
}

async function sendBalanceView(
  ctx: Context,
  telegramId: number,
  household: { id: string; name: string; currency_default: string },
  allHouseholds: Array<{ id: string; name: string }>,
  editMessage = false
): Promise<void> {
  const lang = getLang(ctx);
  const debts = await debtRepo.getDebtsForUserInHousehold(household.id, telegramId);
  const currency = household.currency_default;

  const iOwe = debts.filter((d) => d.debtor_telegram_id === telegramId);
  const owedToMe = debts.filter((d) => d.creditor_telegram_id === telegramId);

  let text = t(lang, 'balancesHeader', { householdName: escapeMd(household.name) });

  if (iOwe.length === 0 && owedToMe.length === 0) {
    text += t(lang, 'allSettled');
  } else {
    if (iOwe.length > 0) {
      text += t(lang, 'youOwe');
      for (const d of iOwe) {
        const ref = escapeMd(d.creditor_username ? `@${d.creditor_username}` : d.creditor_first_name);
        text += `  • ${ref}: ${formatMoney(d.amount_cents, currency)}\n`;
      }
      text += '\n';
    }
    if (owedToMe.length > 0) {
      text += t(lang, 'youAreOwed');
      for (const d of owedToMe) {
        const ref = escapeMd(d.debtor_username ? `@${d.debtor_username}` : d.debtor_first_name);
        text += `  • ${ref}: ${formatMoney(d.amount_cents, currency)}\n`;
      }
    }
  }

  const navKeyboard =
    allHouseholds.length > 1
      ? balanceNavKeyboard(allHouseholds, household.id)
      : undefined;

  const opts = {
    parse_mode: 'Markdown' as const,
    reply_markup: navKeyboard,
  };

  if (editMessage) {
    await ctx.editMessageText(text, opts);
  } else {
    await ctx.reply(text, opts);
  }
}
