import { Context } from 'telegraf';
import { Telegraf } from 'telegraf';
import { transactionRepo } from '../db/repos/transactionRepo';
import { debtRepo } from '../db/repos/debtRepo';
import { userRepo } from '../db/repos/userRepo';
import { formatMoney, escapeMd } from '../domain/money';
import { notifyUser } from '../utils/notify';
import { t, getLang } from '../i18n';
import type { ConfirmPaymentPayload } from '../types';

export async function executePayment(
  ctx: Context,
  payload: ConfirmPaymentPayload,
  bot: Telegraf
): Promise<void> {
  const { deducted, wasOverpayment } = await debtRepo.reduceDebt(
    payload.householdId,
    payload.actorId,
    payload.creditorId,
    payload.amountCents
  );

  await transactionRepo.create({
    householdId: payload.householdId,
    actorTelegramId: payload.actorId,
    type: 'PAYMENT',
    description: payload.description,
    currency: payload.currency,
    amountCentsTotal: deducted,
    payloadJson: JSON.stringify({ creditorId: payload.creditorId }),
    proofFileId: payload.proofFileId,
    proofFileUniqueId: payload.proofFileUniqueId,
  });

  const actor = await userRepo.getById(payload.actorId);
  const actorRef = escapeMd(actor?.username ? `@${actor.username}` : actor?.first_name ?? 'Someone');
  const creditorRef = escapeMd(
    payload.creditorUsername ? `@${payload.creditorUsername}` : payload.creditorFirstName
  );

  const lang = getLang(ctx);
  let resultMsg = t(lang, 'paymentConfirmed', {
    creditor: creditorRef,
    amount: formatMoney(deducted, payload.currency),
  });

  if (wasOverpayment && deducted < payload.amountCents) {
    resultMsg += t(lang, 'paymentCapped');
  }

  try {
    await ctx.editMessageText(resultMsg, { parse_mode: 'Markdown' });
  } catch {
    await ctx.reply(resultMsg, { parse_mode: 'Markdown' });
  }

  const creditor = await userRepo.getById(payload.creditorId);
  const creditorLang = (creditor?.language as import('../i18n').Lang | null) ?? null;

  await notifyUser(
    bot,
    payload.creditorId,
    t(creditorLang, 'creditorNotification', {
      actor: actorRef,
      amount: formatMoney(deducted, payload.currency),
      householdName: escapeMd(payload.householdName),
    }),
    ctx
  );
  try {
    await bot.telegram.sendPhoto(payload.creditorId, payload.proofFileId, {
      caption: `Payment proof from ${actorRef.replace(/\\_/g, '_')}`,
    });
  } catch {
    // Silently skip — user may not have started the bot
  }
}
