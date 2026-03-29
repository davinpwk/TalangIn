import { Context } from 'telegraf';
import { Telegraf } from 'telegraf';
import { transactionRepo } from '../db/repos/transactionRepo';
import { debtRepo } from '../db/repos/debtRepo';
import { userRepo } from '../db/repos/userRepo';
import { formatMoney, escapeMd } from '../domain/money';
import { notifyUser } from '../utils/notify';
import { t, getLang } from '../i18n';
import type { ConfirmExpensePayload } from '../types';

export async function executeExpense(
  ctx: Context,
  payload: ConfirmExpensePayload,
  bot: Telegraf
): Promise<void> {
  await transactionRepo.create({
    householdId: payload.householdId,
    actorTelegramId: payload.actorId,
    type: 'EXPENSE',
    description: payload.description,
    currency: payload.currency,
    amountCentsTotal: payload.amountCentsTotal,
    payloadJson: JSON.stringify(payload.splits),
    proofFileId: payload.proofFileId,
    proofFileUniqueId: payload.proofFileUniqueId,
  });

  for (const split of payload.splits) {
    await debtRepo.addDebt(
      payload.householdId,
      split.telegramId,
      payload.actorId,
      split.amountCents
    );
  }

  const actor = await userRepo.getById(payload.actorId);
  const actorRef = escapeMd(actor?.username ? `@${actor.username}` : actor?.first_name ?? 'Someone');

  for (const split of payload.splits) {
    const recipient = await userRepo.getById(split.telegramId);
    const recipientLang = (recipient?.language as import('../i18n').Lang | null) ?? null;

    await notifyUser(
      bot,
      split.telegramId,
      t(recipientLang, 'debtorNotification', {
        actor: actorRef,
        amount: formatMoney(split.amountCents, payload.currency),
        description: escapeMd(payload.description),
        householdName: escapeMd(payload.householdName),
      }),
      ctx
    );
    try {
      await bot.telegram.sendPhoto(split.telegramId, payload.proofFileId, {
        caption: `Receipt for: ${payload.description}`,
      });
    } catch {
      // Silently skip — user may not have started the bot
    }
  }

  const lang = getLang(ctx);
  const confirmedMsg = t(lang, 'expenseConfirmed', {
    description: escapeMd(payload.description),
    amount: formatMoney(payload.amountCentsTotal, payload.currency),
    count: String(payload.splits.length),
  });
  try {
    await ctx.editMessageText(confirmedMsg, { parse_mode: 'Markdown' });
  } catch {
    await ctx.reply(confirmedMsg, { parse_mode: 'Markdown' });
  }
}
