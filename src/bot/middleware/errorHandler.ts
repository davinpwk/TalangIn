import { Context } from 'telegraf';
import { logger } from '../../utils/logger';

export async function errorHandler(err: unknown, ctx: Context): Promise<void> {
  logger.error({ err, userId: ctx.from?.id, update: ctx.update }, 'Unhandled bot error');
  try {
    await ctx.reply(
      'Something went wrong on my end. Please try again in a moment.'
    );
  } catch {
    // If we can't even reply, just log it
  }
}
