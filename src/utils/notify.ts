import { Telegraf, Context } from 'telegraf';
import { logger } from './logger';
import { pendingNotificationRepo } from '../db/repos/pendingNotificationRepo';
import { userRepo } from '../db/repos/userRepo';

/**
 * Try to send a message to a user proactively.
 * If it fails (user never started the bot), store as a pending notification
 * and optionally inform the actor via ctx.
 */
export async function notifyUser(
  bot: Telegraf,
  targetTelegramId: number,
  message: string,
  ctx?: Context
): Promise<void> {
  try {
    await bot.telegram.sendMessage(targetTelegramId, message, {
      parse_mode: 'Markdown',
    });
    logger.debug({ targetTelegramId }, 'Notification sent');
  } catch (err) {
    logger.warn({ err, targetTelegramId }, 'Could not DM user; storing pending notification');
    await pendingNotificationRepo.create(targetTelegramId, message);

    if (ctx) {
      const targetUser = await userRepo.getById(targetTelegramId);
      const ref = targetUser?.username
        ? `@${targetUser.username}`
        : `user ${targetTelegramId}`;
      await ctx.reply(
        `⚠️ Couldn't send a notification to ${ref}. Ask them to start the bot with /start first.`
      );
    }
  }
}

/**
 * Try to send a photo message to a user proactively.
 * Falls back to text notification on failure.
 */
export async function notifyUserWithPhoto(
  bot: Telegraf,
  targetTelegramId: number,
  photoFileId: string,
  caption: string,
  ctx?: Context
): Promise<void> {
  try {
    await bot.telegram.sendPhoto(targetTelegramId, photoFileId, {
      caption,
      parse_mode: 'Markdown',
    });
    logger.debug({ targetTelegramId }, 'Photo notification sent');
  } catch (err) {
    logger.warn({ err, targetTelegramId }, 'Could not send photo DM; falling back to text');
    await notifyUser(bot, targetTelegramId, caption + '\n_[📷 photo attached — see original]_', ctx);
  }
}

/**
 * Deliver any stored pending notifications to a user (called on /start).
 */
export async function deliverPending(
  bot: Telegraf,
  telegramId: number
): Promise<void> {
  const pending = await pendingNotificationRepo.getUnsent(telegramId);
  for (const n of pending) {
    try {
      await bot.telegram.sendMessage(telegramId, n.message, { parse_mode: 'Markdown' });
      await pendingNotificationRepo.markSent(n.id);
    } catch (err) {
      logger.warn({ err, id: n.id }, 'Failed to deliver pending notification');
    }
  }
}
