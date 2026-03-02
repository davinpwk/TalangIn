import { Telegraf, Context } from 'telegraf';
import { message } from 'telegraf/filters';
import { config } from '../utils/config';
import { logger } from '../utils/logger';
import { rateLimiter } from '../utils/rateLimit';
import { deliverPending } from '../utils/notify';
import { errorHandler } from './middleware/errorHandler';
import { handleCallback } from './callbackHandlers';
import { userRepo } from '../db/repos/userRepo';
import { householdRepo } from '../db/repos/householdRepo';
import { pendingActionRepo } from '../db/repos/pendingActionRepo';
import { classifyIntent } from '../llm/provider';
import { buildMessages } from '../llm/prompt';
import * as createHouseholdFlow from '../flows/createHousehold';
import * as joinHouseholdFlow from '../flows/joinHousehold';
import * as logExpenseFlow from '../flows/logExpense';
import * as logPaymentFlow from '../flows/logPayment';
import * as viewBalancesFlow from '../flows/viewBalances';
import * as kickMemberFlow from '../flows/kickMember';
import * as checkHouseholdFlow from '../flows/checkHousehold';
import { handleAttachment } from '../flows/handleProof';
import { joinRequestKeyboard } from './keyboards/joinKeyboard';
import { escapeMd } from '../domain/money';
import type { ProofInfo } from '../types';

const HELP_TEXT =
  `🏠 *TalangIn — Household Debt Manager*\n\n` +
  `Just type naturally! Examples:\n\n` +
  `*Household*\n` +
  `• "Create a household called Smith Family"\n` +
  `• "Join ABCD1234"\n\n` +
  `*Expenses*\n` +
  `• "I spent AUD 35 for dinner, split with @alice and @bob"\n` +
  `• "Paid 60 for groceries, alice pays 20 bob pays 40"\n\n` +
  `*Payments*\n` +
  `• "I paid @alice $50"\n\n` +
  `*Balances*\n` +
  `• "Show my balance" / "What do I owe?"\n\n` +
  `*Other*\n` +
  `• "Kick @alice from Smith Family" (owner only)\n\n` +
  `For LOG_EXPENSE and LOG_PAYMENT, attach a photo/receipt as proof.\n` +
  `Type "cancel" at any time to abort a pending action.`;

async function upsertUser(ctx: Context): Promise<void> {
  if (!ctx.from) return;
  await userRepo.upsert({
    telegramId: ctx.from.id,
    username: ctx.from.username ?? null,
    firstName: ctx.from.first_name,
    lastName: ctx.from.last_name ?? null,
  });
}

export function createBot(): Telegraf {
  const bot = new Telegraf(config.telegramBotToken);

  // ── Private-chat-only guard ─────────────────────────────────────────────────
  bot.use(async (ctx, next) => {
    if (ctx.chat?.type !== 'private') return; // silently ignore group/channel messages
    return next();
  });

  // ── Rate limiting ────────────────────────────────────────────────────────────
  bot.use(async (ctx, next) => {
    const userId = ctx.from?.id;
    if (userId && !rateLimiter.check(userId)) {
      await ctx.reply('⏳ Slow down! You are sending messages too quickly.');
      return;
    }
    return next();
  });

  // ── /start ───────────────────────────────────────────────────────────────────
  bot.start(async (ctx) => {
    await upsertUser(ctx);
    await ctx.reply(
      `👋 Welcome to *TalangIn*!\n\n` +
        `I help households track shared expenses and debts.\n\n` +
        HELP_TEXT,
      { parse_mode: 'Markdown' }
    );
    // Deliver any pending notifications that were queued before they started the bot
    await deliverPending(bot, ctx.from.id);

    // Re-surface any pending join requests for households this user owns
    const pendingRequests = await householdRepo.getPendingJoinRequestsForOwner(ctx.from.id);
    for (const req of pendingRequests) {
      const requesterRef = escapeMd(req.username ? `@${req.username}` : req.first_name ?? `user ${req.requester_telegram_id}`);
      const householdName = escapeMd(req.household_name);
      await ctx.reply(
        `👋 *Pending join request*\n\n${requesterRef} wants to join *${householdName}*.\n\nApprove or deny:`,
        { parse_mode: 'Markdown', reply_markup: joinRequestKeyboard(req.id) }
      );
    }
  });

  // ── /help ────────────────────────────────────────────────────────────────────
  bot.help(async (ctx) => {
    await ctx.reply(HELP_TEXT, { parse_mode: 'Markdown' });
  });

  // ── Text messages ────────────────────────────────────────────────────────────
  bot.on(message('text'), async (ctx) => {
    await upsertUser(ctx);
    const text = ctx.message.text.trim();
    const telegramId = ctx.from.id;

    // Cancel command
    if (text.toLowerCase() === 'cancel' || text === '/cancel') {
      await pendingActionRepo.clearForUser(telegramId);
      await ctx.reply('❌ Cancelled. What would you like to do?');
      return;
    }

    // State machine: check for pending action
    const pending = await pendingActionRepo.getActive(telegramId);

    if (pending?.type === 'AWAITING_PROOF') {
      await ctx.reply(
        '📎 I\'m waiting for your invoice/proof. Please send it as a photo or document.\n\nType "cancel" to abort.'
      );
      return;
    }

    if (pending?.type === 'AWAITING_CONFIRM') {
      await ctx.reply('👆 Please use the buttons above to confirm or cancel.');
      return;
    }

    if (pending?.type === 'AWAITING_HOUSEHOLD') {
      await ctx.reply('👆 Please select a household using the buttons above, or type "cancel" to abort.');
      return;
    }

    // Classify via LLM
    let intent;
    try {
      const messages = await buildMessages(telegramId, text);
      intent = await classifyIntent(messages);
    } catch (err) {
      logger.error({ err }, 'LLM classification failed');
      await ctx.reply('Sorry, I had trouble understanding that. Please try again.');
      return;
    }

    logger.debug({ intent, userId: telegramId }, 'Classified intent');

    switch (intent.intent) {
      case 'CREATE_HOUSEHOLD':
        await createHouseholdFlow.handle(ctx, intent);
        break;
      case 'JOIN_HOUSEHOLD':
        await joinHouseholdFlow.handle(ctx, intent, bot);
        break;
      case 'LOG_EXPENSE':
        await logExpenseFlow.handle(ctx, intent, null);
        break;
      case 'LOG_PAYMENT':
        await logPaymentFlow.handle(ctx, intent, null);
        break;
      case 'VIEW_BALANCES':
        await viewBalancesFlow.handle(ctx, intent);
        break;
      case 'CHECK_HOUSEHOLD':
        await checkHouseholdFlow.handle(ctx, intent);
        break;
      case 'KICK_MEMBER':
        await kickMemberFlow.handle(ctx, intent);
        break;
      case 'HELP':
        await ctx.reply(HELP_TEXT, { parse_mode: 'Markdown' });
        break;
      case 'UNKNOWN':
        await ctx.reply("🤔 I didn't understand that. Type /help to see what I can do.");
        break;
    }
  });

  // ── Photos ───────────────────────────────────────────────────────────────────
  bot.on(message('photo'), async (ctx) => {
    await upsertUser(ctx);
    const photo = ctx.message.photo[ctx.message.photo.length - 1];
    const proof: ProofInfo = {
      fileId: photo.file_id,
      fileUniqueId: photo.file_unique_id,
    };
    await handleAttachment(ctx, proof, ctx.message.caption, bot);
  });

  // ── Documents ────────────────────────────────────────────────────────────────
  bot.on(message('document'), async (ctx) => {
    await upsertUser(ctx);
    const doc = ctx.message.document;
    const proof: ProofInfo = {
      fileId: doc.file_id,
      fileUniqueId: doc.file_unique_id,
    };
    await handleAttachment(ctx, proof, ctx.message.caption, bot);
  });

  // ── Callback queries ─────────────────────────────────────────────────────────
  bot.on('callback_query', async (ctx) => {
    await handleCallback(ctx, bot);
    // answerCbQuery is called within handleCallback for each branch
    // but if it wasn't (e.g. unknown path), answer now
  });

  // ── Error handler ─────────────────────────────────────────────────────────────
  bot.catch(errorHandler);

  return bot;
}
