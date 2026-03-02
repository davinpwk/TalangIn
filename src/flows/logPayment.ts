import { Context } from 'telegraf';
import { Telegraf } from 'telegraf';
import { householdRepo } from '../db/repos/householdRepo';
import { transactionRepo } from '../db/repos/transactionRepo';
import { debtRepo } from '../db/repos/debtRepo';
import { pendingActionRepo } from '../db/repos/pendingActionRepo';
import { userRepo } from '../db/repos/userRepo';
import { confirmKeyboard } from '../bot/keyboards/confirmKeyboard';
import { householdSelectionKeyboard } from '../bot/keyboards/householdKeyboard';
import { toCents, formatMoney, escapeMd } from '../domain/money';
import { notifyUser } from '../utils/notify';
import type { LogPaymentIntent } from '../llm/schemas';
import type { ProofInfo, ConfirmPaymentPayload } from '../types';

export async function handle(
  ctx: Context,
  intent: LogPaymentIntent,
  proof: ProofInfo | null,
  householdId?: string
): Promise<void> {
  const telegramId = ctx.from!.id;

  // 1. Resolve household
  const hId = householdId ?? (await resolveHousehold(ctx, telegramId, intent, proof));
  if (!hId) return;

  const membership = await householdRepo.getMembership(hId, telegramId);
  if (!membership || membership.status !== 'ACTIVE') {
    await ctx.reply('You are not an active member of that household.');
    return;
  }

  const household = await householdRepo.getById(hId);
  if (!household) return;
  const currency = (intent.currency ?? household.currency_default).toUpperCase();

  // 2. Resolve payee (creditor)
  const allMembers = await householdRepo.getActiveMembers(hId);
  const ident = intent.payee_identifier.replace(/^@/, '').toLowerCase();
  const creditorMember = allMembers.find(
    (m) =>
      m.telegram_id !== telegramId &&
      (m.username?.toLowerCase() === ident ||
        m.first_name.toLowerCase() === ident ||
        (m.first_name + ' ' + (m.last_name ?? '')).toLowerCase().trim() === ident)
  );

  if (!creditorMember) {
    await ctx.reply(
      `❓ I couldn't find member "${intent.payee_identifier}" in this household. Use their @username or exact first name.`
    );
    return;
  }

  const amountCents = toCents(intent.amount);

  // 3. Check outstanding debt
  const outstanding = await debtRepo.getDebt(hId, telegramId, creditorMember.telegram_id);
  let overpaymentWarning = '';
  if (amountCents > outstanding) {
    overpaymentWarning =
      outstanding === 0
        ? `\n⚠️ You have no recorded debt to ${escapeMd(creditorMember.username ? `@${creditorMember.username}` : creditorMember.first_name)} in this household. Payment will be capped at 0.`
        : `\n⚠️ Payment exceeds your outstanding debt of ${formatMoney(outstanding, currency)}. It will be capped at that amount.`;
  }

  // 4. Require proof
  if (!proof) {
    await pendingActionRepo.create(telegramId, 'AWAITING_PROOF', {
      intent: 'LOG_PAYMENT',
      data: intent,
      householdId: hId,
    });
    await ctx.reply(
      '🧾 Got it! Please send your *payment receipt or proof* as a photo or document.',
      { parse_mode: 'Markdown' }
    );
    return;
  }

  // 5. Show preview
  const creditorRef = escapeMd(creditorMember.username
    ? `@${creditorMember.username}`
    : creditorMember.first_name);

  const preview =
    `💳 *Payment Preview*\n\n` +
    `You paid: *${creditorRef}*\n` +
    `Amount: *${formatMoney(amountCents, currency)}*\n` +
    `Household: *${household.name}*\n` +
    `Description: ${intent.description ?? 'Payment'}` +
    overpaymentWarning;

  const paymentPayload: ConfirmPaymentPayload = {
    flow: 'PAYMENT',
    actorId: telegramId,
    householdId: hId,
    householdName: household.name,
    creditorId: creditorMember.telegram_id,
    creditorUsername: creditorMember.username,
    creditorFirstName: creditorMember.first_name,
    amountCents,
    currency,
    description: intent.description ?? 'Payment',
    proofFileId: proof.fileId,
    proofFileUniqueId: proof.fileUniqueId,
  };

  const pending = await pendingActionRepo.create(telegramId, 'AWAITING_CONFIRM', paymentPayload);

  await ctx.reply(preview, {
    parse_mode: 'Markdown',
    reply_markup: confirmKeyboard(pending.id, pending.token),
  });
}

export async function proceedWithProof(
  ctx: Context,
  savedData: { data: LogPaymentIntent; householdId: string },
  proof: ProofInfo
): Promise<void> {
  await handle(ctx, savedData.data, proof, savedData.householdId);
}

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
  const creditorRef = escapeMd(payload.creditorUsername
    ? `@${payload.creditorUsername}`
    : payload.creditorFirstName);

  let resultMsg =
    `✅ Payment recorded!\n\n` +
    `You paid ${creditorRef} *${formatMoney(deducted, payload.currency)}*`;

  if (wasOverpayment && deducted < payload.amountCents) {
    resultMsg += `\n_(Capped at your outstanding balance)_`;
  }

  await ctx.editMessageText(resultMsg, { parse_mode: 'Markdown' });

  // Notify creditor
  await notifyUser(
    bot,
    payload.creditorId,
    `💰 ${actorRef} recorded a payment of *${formatMoney(deducted, payload.currency)}* to you (Household: ${payload.householdName})`,
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

async function resolveHousehold(
  ctx: Context,
  telegramId: number,
  intent: LogPaymentIntent,
  proof: ProofInfo | null
): Promise<string | null> {
  const households = await householdRepo.getActiveHouseholdsForUser(telegramId);
  if (households.length === 0) {
    await ctx.reply('You are not in any household. Create or join one first.');
    return null;
  }
  if (households.length === 1) return households[0].id;

  if (intent.household_hint) {
    const hint = intent.household_hint.toLowerCase();
    const match = households.filter((h) => h.name.toLowerCase().includes(hint));
    if (match.length === 1) return match[0].id;
  }

  const pending = await pendingActionRepo.create(telegramId, 'AWAITING_HOUSEHOLD', {
    intent: 'LOG_PAYMENT',
    data: intent,
    proof,
  });

  await ctx.reply('Which household is this payment for?', {
    reply_markup: householdSelectionKeyboard(households, pending.id),
  });
  return null;
}
