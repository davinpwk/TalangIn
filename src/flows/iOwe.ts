import { Context } from 'telegraf';
import { Telegraf } from 'telegraf';
import { debtRepo } from '../db/repos/debtRepo';
import { transactionRepo } from '../db/repos/transactionRepo';
import { userRepo } from '../db/repos/userRepo';
import { notifyUser } from '../utils/notify';
import { formatMoney, escapeMd, generateId } from '../domain/money';
import { t, getLang } from '../i18n';
import type { ConfirmIOwePayload } from '../types';

export async function executeIOwe(
  ctx: Context,
  payload: ConfirmIOwePayload,
  bot: Telegraf
): Promise<void> {
  // Actor is the DEBTOR — they owe the creditor
  await debtRepo.addDebt(
    payload.householdId,
    payload.actorId,        // debtor
    payload.creditorId,     // creditor
    payload.amountCents
  );

  await transactionRepo.create({
    householdId: payload.householdId,
    actorTelegramId: payload.actorId,
    type: 'DEBT_LOG',
    description: payload.description,
    currency: payload.currency,
    amountCentsTotal: payload.amountCents,
    payloadJson: JSON.stringify({ creditorId: payload.creditorId }),
    proofFileId: '',
    proofFileUniqueId: '',
  });

  const actor = await userRepo.getById(payload.actorId);
  const actorRef = escapeMd(
    actor?.nickname ?? (actor?.username ? `@${actor.username}` : actor?.first_name ?? 'Someone')
  );

  // Notify creditor
  const creditor = await userRepo.getById(payload.creditorId);
  const creditorLang = (creditor?.language as import('../i18n').Lang | null) ?? null;

  await notifyUser(
    bot,
    payload.creditorId,
    t(creditorLang, 'iOweNotification', {
      debtor: actorRef,
      amount: formatMoney(payload.amountCents, payload.currency),
      description: escapeMd(payload.description),
      householdName: escapeMd(payload.householdName),
    }),
    ctx
  );

  const lang = getLang(ctx);
  await ctx.reply(
    t(lang, 'iOweConfirmed', { creditor: escapeMd(payload.creditorDisplayName) }),
    { parse_mode: 'Markdown' }
  );
}
