import { Context } from 'telegraf';
import { Telegraf } from 'telegraf';
import { userRepo } from '../db/repos/userRepo';
import { notifyUser, notifyUserWithPhoto } from '../utils/notify';
import { escapeMd } from '../domain/money';
import { t, getLang } from '../i18n';
import type { ConfirmBroadcastPayload } from '../types';

export async function executeBroadcast(
  ctx: Context,
  payload: ConfirmBroadcastPayload,
  bot: Telegraf
): Promise<void> {
  const actor = await userRepo.getById(payload.actorId);
  const actorRef = escapeMd(actor?.username ? `@${actor.username}` : actor?.first_name ?? 'Someone');

  let sent = 0;
  for (const recipientId of payload.recipientIds) {
    const recipient = await userRepo.getById(recipientId);
    const recipientLang = (recipient?.language as import('../i18n').Lang | null) ?? null;

    if (payload.photoFileId) {
      const caption = t(recipientLang, 'broadcastPhotoCaption', {
        sender: actorRef,
        householdName: escapeMd(payload.householdName),
      }) + `\n\n${escapeMd(payload.message)}`;
      await notifyUserWithPhoto(bot, recipientId, payload.photoFileId, caption, ctx);
    } else {
      await notifyUser(
        bot,
        recipientId,
        t(recipientLang, 'broadcastReceived', {
          sender: actorRef,
          householdName: escapeMd(payload.householdName),
          message: payload.message,
        }),
        ctx
      );
    }
    sent++;
  }

  await ctx.editMessageText(
    t(null, 'broadcastConfirmed', { count: String(sent) }),
    { parse_mode: 'Markdown' }
  );
}
