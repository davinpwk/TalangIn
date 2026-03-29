import { Context } from 'telegraf';
import { householdRepo } from '../../db/repos/householdRepo';
import { debtRepo } from '../../db/repos/debtRepo';
import { pendingActionRepo, PendingAction } from '../../db/repos/pendingActionRepo';
import { toCents, formatMoney, escapeMd } from '../../domain/money';
import { displayName } from '../../domain/displayName';
import { t, getLang } from '../../i18n';
import type { BmPaymentPayload, ConfirmPaymentPayload, BmAwaitingProofPayload } from '../../types';
import { cancelKeyboard } from '../keyboards/cancelKeyboard';

type MemberRow = {
  telegram_id: number;
  username: string | null;
  first_name: string;
  last_name: string | null;
  nickname?: string | null;
};

export async function start(ctx: Context, telegramId: number, householdId: string): Promise<void> {
  const lang = getLang(ctx);
  const household = await householdRepo.getById(householdId);
  if (!household) return;

  const allMembers = await householdRepo.getActiveMembers(householdId) as MemberRow[];
  const otherMembers = allMembers.filter((m) => m.telegram_id !== telegramId);

  if (otherMembers.length === 0) {
    await ctx.reply('No other members in this household.');
    return;
  }

  // Only show members with whom there's outstanding debt
  const membersWithDebt: Array<{ member: MemberRow; outstanding: number }> = [];
  for (const m of otherMembers) {
    const outstanding = await debtRepo.getDebt(householdId, telegramId, m.telegram_id);
    if (outstanding > 0) {
      membersWithDebt.push({ member: m, outstanding });
    }
  }

  const payload: BmPaymentPayload = {
    householdId,
    householdName: household.name,
    currency: household.currency_default,
  };

  const action = await pendingActionRepo.create(telegramId, 'BM_PAYMENT_MEMBER', payload);

  const memberButtons = (membersWithDebt.length > 0 ? membersWithDebt.map((x) => x.member) : otherMembers).map((m) => [
    {
      text: displayName(m as { nickname?: string | null; username?: string | null; first_name: string }),
      callback_data: `bm:member:${action.id}:${m.telegram_id}`,
    },
  ]);

  await ctx.reply(t(lang, 'creditorPick'), {
    reply_markup: { inline_keyboard: [...memberButtons, [{ text: '❌ Cancel', callback_data: 'bm:cancel' }]] },
  });
}

export async function onMemberSelect(
  ctx: Context,
  creditorId: number,
  pendingId: string
): Promise<void> {
  const lang = getLang(ctx);
  const action = await pendingActionRepo.getById(pendingId);
  if (!action || action.used_at !== null) {
    await ctx.answerCbQuery('Session expired.');
    return;
  }

  const payload = JSON.parse(action.payload_json) as BmPaymentPayload;
  const telegramId = ctx.from!.id;

  const allMembers = await householdRepo.getActiveMembers(payload.householdId) as MemberRow[];
  const creditorMember = allMembers.find((m) => m.telegram_id === creditorId);
  if (!creditorMember) {
    await ctx.answerCbQuery('Member not found.');
    return;
  }

  const outstanding = await debtRepo.getDebt(payload.householdId, telegramId, creditorId);
  const creditorName = displayName(creditorMember as { nickname?: string | null; username?: string | null; first_name: string });

  payload.creditorId = creditorId;
  payload.creditorDisplayName = creditorName;

  await pendingActionRepo.updatePayload(action.id, payload);
  await ctx.answerCbQuery();

  const buttons = [
    [{ text: t(lang, 'fullPayBtn', { amount: formatMoney(outstanding, payload.currency) }), callback_data: `bm:full_pay:${pendingId}` }],
    [{ text: t(lang, 'customPayBtn'), callback_data: `bm:custom_pay:${pendingId}` }],
    [{ text: '❌ Cancel', callback_data: 'bm:cancel' }],
  ];

  if (outstanding === 0) {
    await ctx.editMessageText(t(lang, 'noDebtToMember', { name: escapeMd(creditorName) }), { parse_mode: 'Markdown' });
    return;
  }

  await ctx.editMessageText(t(lang, 'fullOrCustom'), {
    reply_markup: { inline_keyboard: buttons },
  });
}

export async function onFullPay(ctx: Context, pendingId: string): Promise<void> {
  const lang = getLang(ctx);
  const action = await pendingActionRepo.getById(pendingId);
  if (!action || action.used_at !== null) {
    await ctx.answerCbQuery('Session expired.');
    return;
  }

  const payload = JSON.parse(action.payload_json) as BmPaymentPayload;
  const telegramId = ctx.from!.id;
  const outstanding = await debtRepo.getDebt(payload.householdId, telegramId, payload.creditorId!);

  if (outstanding === 0) {
    await ctx.answerCbQuery('No outstanding debt.');
    return;
  }

  payload.amountCents = outstanding;
  await ctx.answerCbQuery();
  await showPaymentPreview(ctx, action.id, payload, lang);
}

export async function onCustomPay(ctx: Context, pendingId: string): Promise<void> {
  const lang = getLang(ctx);
  const action = await pendingActionRepo.getById(pendingId);
  if (!action || action.used_at !== null) {
    await ctx.answerCbQuery('Session expired.');
    return;
  }

  const payload = JSON.parse(action.payload_json) as BmPaymentPayload;
  await pendingActionRepo.updateTypeAndPayload(action.id, 'BM_PAYMENT_AMOUNT', payload);
  await ctx.answerCbQuery();
  await ctx.editMessageText(t(lang, 'payAmountPrompt'), { reply_markup: cancelKeyboard });
}

export async function onAmount(ctx: Context, text: string, action: PendingAction): Promise<void> {
  const lang = getLang(ctx);
  const amount = parseFloat(text.replace(',', '.'));
  if (isNaN(amount) || amount <= 0) {
    await ctx.reply('⚠️ Invalid amount. ' + t(lang, 'payAmountPrompt'));
    return;
  }

  const payload = JSON.parse(action.payload_json) as BmPaymentPayload;
  payload.amountCents = toCents(amount);
  await showPaymentPreview(ctx, action.id, payload, lang);
}

async function showPaymentPreview(
  ctx: Context,
  actionId: string,
  payload: BmPaymentPayload,
  lang: ReturnType<typeof getLang>
): Promise<void> {
  const creditorRef = escapeMd(payload.creditorDisplayName!);
  const preview = t(lang, 'paymentPreview', {
    creditor: creditorRef,
    amount: formatMoney(payload.amountCents!, payload.currency),
    householdName: escapeMd(payload.householdName),
    description: 'Payment',
  });

  const allMembers = await householdRepo.getActiveMembers(payload.householdId) as MemberRow[];
  const creditorMember = allMembers.find((m) => m.telegram_id === payload.creditorId);

  const confirmPayload: Omit<ConfirmPaymentPayload, 'proofFileId' | 'proofFileUniqueId'> = {
    flow: 'PAYMENT',
    actorId: ctx.from!.id,
    householdId: payload.householdId,
    householdName: payload.householdName,
    creditorId: payload.creditorId!,
    creditorUsername: creditorMember?.username ?? null,
    creditorFirstName: creditorMember?.first_name ?? payload.creditorDisplayName!,
    amountCents: payload.amountCents!,
    currency: payload.currency,
    description: 'Payment',
  };

  const bmProofPayload: BmAwaitingProofPayload = {
    flow: 'PAYMENT',
    confirmPayload,
  };

  await pendingActionRepo.markUsed(actionId);
  const telegramId = ctx.from!.id;
  await pendingActionRepo.create(telegramId, 'BM_AWAITING_PROOF', bmProofPayload);

  await ctx.reply(preview + '\n\n' + t(lang, 'proofPrompt'), { parse_mode: 'Markdown', reply_markup: cancelKeyboard });
}
