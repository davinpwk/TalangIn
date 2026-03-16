import { Context } from 'telegraf';
import { Telegraf } from 'telegraf';
import { householdRepo } from '../../db/repos/householdRepo';
import { pendingActionRepo, PendingAction } from '../../db/repos/pendingActionRepo';
import { confirmKeyboard } from '../keyboards/confirmKeyboard';
import { escapeMd } from '../../domain/money';
import { t, getLang } from '../../i18n';
import { executeBroadcast } from '../../flows/broadcast';
import type { BmBroadcastPayload, ConfirmBroadcastPayload, ProofInfo } from '../../types';

export async function start(ctx: Context, telegramId: number, householdId: string): Promise<void> {
  const lang = getLang(ctx);
  const household = await householdRepo.getById(householdId);
  if (!household) return;

  const allMembers = await householdRepo.getActiveMembers(householdId);
  const recipients = allMembers.filter((m) => m.telegram_id !== telegramId);

  if (recipients.length === 0) {
    await ctx.reply(t(lang, 'broadcastNoMembers'));
    return;
  }

  const payload: BmBroadcastPayload = {
    householdId,
    householdName: household.name,
  };

  await pendingActionRepo.create(telegramId, 'BM_BROADCAST_MSG', payload);
  await ctx.reply('📢 ' + t(lang, 'broadcastPreview', {
    householdName: escapeMd(household.name),
    count: String(recipients.length),
    message: '...',
  }).split('\n')[0] + `\n\nType your message or send a photo with caption (${recipients.length} recipient(s)):`, { parse_mode: 'Markdown' });
}

export async function onText(
  ctx: Context,
  text: string,
  action: PendingAction,
  bot: Telegraf
): Promise<void> {
  const lang = getLang(ctx);
  const payload = JSON.parse(action.payload_json) as BmBroadcastPayload;

  const allMembers = await householdRepo.getActiveMembers(payload.householdId);
  const telegramId = ctx.from!.id;
  const recipients = allMembers.filter((m) => m.telegram_id !== telegramId);

  const preview = t(lang, 'broadcastPreview', {
    householdName: escapeMd(payload.householdName),
    count: String(recipients.length),
    message: escapeMd(text),
  });

  const confirmPayload: ConfirmBroadcastPayload = {
    flow: 'BROADCAST',
    actorId: telegramId,
    householdId: payload.householdId,
    householdName: payload.householdName,
    message: text,
    recipientIds: recipients.map((m) => m.telegram_id),
  };

  await pendingActionRepo.markUsed(action.id);
  const pending = await pendingActionRepo.create(telegramId, 'AWAITING_CONFIRM', confirmPayload);

  await ctx.reply(preview, {
    parse_mode: 'Markdown',
    reply_markup: confirmKeyboard(pending.id, pending.token),
  });
}

export async function onPhoto(
  ctx: Context,
  proof: ProofInfo,
  caption: string | undefined,
  action: PendingAction,
  bot: Telegraf
): Promise<void> {
  const lang = getLang(ctx);

  if (!caption) {
    await ctx.reply(t(lang, 'broadcastAddCaption'));
    return;
  }

  const payload = JSON.parse(action.payload_json) as BmBroadcastPayload;
  const telegramId = ctx.from!.id;

  const allMembers = await householdRepo.getActiveMembers(payload.householdId);
  const recipients = allMembers.filter((m) => m.telegram_id !== telegramId);

  const preview = t(lang, 'broadcastPhotoPreview', {
    householdName: escapeMd(payload.householdName),
    count: String(recipients.length),
    message: escapeMd(caption),
  });

  const confirmPayload: ConfirmBroadcastPayload = {
    flow: 'BROADCAST',
    actorId: telegramId,
    householdId: payload.householdId,
    householdName: payload.householdName,
    message: caption,
    recipientIds: recipients.map((m) => m.telegram_id),
    photoFileId: proof.fileId,
    photoFileUniqueId: proof.fileUniqueId,
  };

  await pendingActionRepo.markUsed(action.id);
  const pending = await pendingActionRepo.create(telegramId, 'AWAITING_CONFIRM', confirmPayload);

  await ctx.reply(preview, {
    parse_mode: 'Markdown',
    reply_markup: confirmKeyboard(pending.id, pending.token),
  });
}
