import { Context } from 'telegraf';
import { Telegraf } from 'telegraf';
import { householdRepo } from '../../db/repos/householdRepo';
import { pendingActionRepo, PendingAction } from '../../db/repos/pendingActionRepo';
import { confirmKeyboard } from '../keyboards/confirmKeyboard';
import { toCents, formatMoney, escapeMd } from '../../domain/money';
import { displayName } from '../../domain/displayName';
import { t, getLang } from '../../i18n';
import { executeIOwe } from '../../flows/iOwe';
import type { BmIOwePayload, ConfirmIOwePayload } from '../../types';
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

  const payload: BmIOwePayload = {
    householdId,
    householdName: household.name,
    currency: household.currency_default,
  };

  const action = await pendingActionRepo.create(telegramId, 'BM_IOWE_CREDITOR', payload);

  const buttons = otherMembers.map((m) => [
    {
      text: displayName(m as { nickname?: string | null; username?: string | null; first_name: string }),
      callback_data: `bm:member:${action.id}:${m.telegram_id}`,
    },
  ]);

  await ctx.reply(t(lang, 'iOweCreditorPrompt'), {
    reply_markup: { inline_keyboard: [...buttons, [{ text: '❌ Cancel', callback_data: 'bm:cancel' }]] },
  });
}

export async function onCreditorSelect(
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

  const payload = JSON.parse(action.payload_json) as BmIOwePayload;
  const allMembers = await householdRepo.getActiveMembers(payload.householdId) as MemberRow[];
  const creditorMember = allMembers.find((m) => m.telegram_id === creditorId);
  if (!creditorMember) {
    await ctx.answerCbQuery('Member not found.');
    return;
  }

  payload.creditorId = creditorId;
  payload.creditorDisplayName = displayName(creditorMember as { nickname?: string | null; username?: string | null; first_name: string });

  await pendingActionRepo.updateTypeAndPayload(action.id, 'BM_IOWE_DESC', payload);
  await ctx.answerCbQuery();
  await ctx.editMessageText(t(lang, 'iOweDescPrompt'), { reply_markup: cancelKeyboard });
}

export async function onDesc(ctx: Context, text: string, action: PendingAction): Promise<void> {
  const lang = getLang(ctx);
  const payload = JSON.parse(action.payload_json) as BmIOwePayload;
  payload.description = text;
  await pendingActionRepo.updateTypeAndPayload(action.id, 'BM_IOWE_AMOUNT', payload);
  await ctx.reply(t(lang, 'iOweAmountPrompt'), { reply_markup: cancelKeyboard });
}

export async function onAmount(ctx: Context, text: string, action: PendingAction, bot: Telegraf): Promise<void> {
  const lang = getLang(ctx);
  const amount = parseFloat(text.replace(',', '.'));
  if (isNaN(amount) || amount <= 0) {
    await ctx.reply('⚠️ Invalid amount. ' + t(lang, 'iOweAmountPrompt'));
    return;
  }

  const payload = JSON.parse(action.payload_json) as BmIOwePayload;
  payload.amountCents = toCents(amount);

  const preview = t(lang, 'iOwePreview', {
    creditor: escapeMd(payload.creditorDisplayName!),
    amount: formatMoney(payload.amountCents, payload.currency),
    description: escapeMd(payload.description!),
    householdName: escapeMd(payload.householdName),
  });

  const confirmPayload: ConfirmIOwePayload = {
    flow: 'IOWE',
    actorId: ctx.from!.id,
    householdId: payload.householdId,
    householdName: payload.householdName,
    creditorId: payload.creditorId!,
    creditorDisplayName: payload.creditorDisplayName!,
    amountCents: payload.amountCents,
    currency: payload.currency,
    description: payload.description!,
  };

  await pendingActionRepo.markUsed(action.id);
  const pending = await pendingActionRepo.create(ctx.from!.id, 'AWAITING_CONFIRM', confirmPayload);

  await ctx.reply(preview, {
    parse_mode: 'Markdown',
    reply_markup: confirmKeyboard(pending.id, pending.token),
  });
}
