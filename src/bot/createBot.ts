import { Telegraf, Context, Markup } from 'telegraf';
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
import * as broadcastFlow from '../flows/broadcast';
import { handleAttachment } from '../flows/handleProof';
import { joinRequestKeyboard } from './keyboards/joinKeyboard';
import { languageKeyboard } from './keyboards/languageKeyboard';
import { mainReplyKeyboard } from './keyboards/replyKeyboard';
import { escapeMd } from '../domain/money';
import { t, getLang, LANG_NAMES, type Lang } from '../i18n';
import { APP_VERSION } from '../utils/version';
import { handleButtonModeText } from './buttonMode/router';
import * as broadcastWizard from './buttonMode/broadcastWizard';
import type { ProofInfo } from '../types';

async function upsertAndLoadLang(ctx: Context): Promise<void> {
  if (!ctx.from) return;
  await userRepo.upsert({
    telegramId: ctx.from.id,
    username: ctx.from.username ?? null,
    firstName: ctx.from.first_name,
    lastName: ctx.from.last_name ?? null,
  });
  const user = await userRepo.getById(ctx.from.id);
  (ctx.state as Record<string, unknown>)['lang'] = (user?.language as Lang | null) ?? null;

  // Send "What's New" once per version to returning users (language already set)
  if (user?.language && user.last_seen_version !== APP_VERSION) {
    await userRepo.setLastSeenVersion(ctx.from.id, APP_VERSION);
    const lang = (user.language as Lang | null) ?? null;
    try {
      await ctx.reply(t(lang, 'whatsNew'), { parse_mode: 'MarkdownV2' });
    } catch {
      // Silently skip if reply fails in this context
    }
  }
}

export function createBot(): Telegraf {
  const bot = new Telegraf(config.telegramBotToken);

  // ── Private-chat-only guard ─────────────────────────────────────────────────
  bot.use(async (ctx, next) => {
    if (ctx.chat?.type !== 'private') return;
    return next();
  });

  // ── Rate limiting ────────────────────────────────────────────────────────────
  bot.use(async (ctx, next) => {
    const userId = ctx.from?.id;
    if (userId && !rateLimiter.check(userId)) {
      const lang = getLang(ctx);
      await ctx.reply(t(lang, 'rateLimited'));
      return;
    }
    return next();
  });

  // ── /start ───────────────────────────────────────────────────────────────────
  bot.start(async (ctx) => {
    await upsertAndLoadLang(ctx);
    const lang = getLang(ctx);

    if (lang === null) {
      // First time — show language picker only
      await ctx.reply('🌐 Please choose your language:\n\nSilakan pilih bahasa kamu:', {
        reply_markup: languageKeyboard(),
      });
      return;
    }

    // Language already set — show welcome
    const user = await userRepo.getById(ctx.from.id);
    const mode = user?.mode ?? 'button';
    const isReturning = !!user?.active_household_id || (user?.started_at ?? 0) < Math.floor(Date.now() / 1000) - 60;

    if (mode === 'button') {
      const activeHousehold = user?.active_household_id
        ? await householdRepo.getById(user.active_household_id)
        : null;

      const welcomeMsg = isReturning ? t(lang, 'welcomeBack') : t(lang, 'welcome');
      await ctx.reply(welcomeMsg, {
        parse_mode: 'Markdown',
        reply_markup: mainReplyKeyboard(activeHousehold?.name ?? null).reply_markup,
      });
    } else {
      // LLM mode — show full help
      await ctx.reply(t(lang, 'welcome') + '\n\n' + t(lang, 'helpText'), {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '⚙️ Change language', callback_data: 'lang_settings' }],
          ],
        },
      });
    }

    // Deliver any pending notifications
    await deliverPending(bot, ctx.from.id);

    // Re-surface any pending join requests for households this user owns
    const pendingRequests = await householdRepo.getPendingJoinRequestsForOwner(ctx.from.id);
    for (const req of pendingRequests) {
      const requesterRef = escapeMd(
        req.username ? `@${req.username}` : req.first_name ?? `user ${req.requester_telegram_id}`
      );
      const householdName = escapeMd(req.household_name);
      await ctx.reply(
        t(lang, 'pendingJoinRequest', { requester: requesterRef, householdName }),
        { parse_mode: 'Markdown', reply_markup: joinRequestKeyboard(req.id) }
      );
    }
  });

  // ── /help ────────────────────────────────────────────────────────────────────
  bot.help(async (ctx) => {
    await upsertAndLoadLang(ctx);
    const lang = getLang(ctx);
    await ctx.reply(t(lang, 'helpText'), { parse_mode: 'Markdown' });
  });

  // ── /settings ────────────────────────────────────────────────────────────────
  bot.command('settings', async (ctx) => {
    await upsertAndLoadLang(ctx);
    const lang = getLang(ctx);
    const langName = escapeMd(lang ? LANG_NAMES[lang] : LANG_NAMES['en']);
    await ctx.reply(
      t(lang, 'settingsHeader', { language: langName }),
      { parse_mode: 'Markdown', reply_markup: languageKeyboard() }
    );
  });

  // ── Text messages ────────────────────────────────────────────────────────────
  bot.on(message('text'), async (ctx) => {
    await upsertAndLoadLang(ctx);
    const lang = getLang(ctx);
    const text = ctx.message.text.trim();
    const telegramId = ctx.from.id;

    // Cancel command — works in both modes
    if (text.toLowerCase() === 'cancel' || text === '/cancel') {
      await pendingActionRepo.clearForUser(telegramId);
      await ctx.reply(t(lang, 'cancel'));
      return;
    }

    // Check user mode
    const user = await userRepo.getById(telegramId);
    const mode = user?.mode ?? 'button';

    if (mode === 'button') {
      await handleButtonModeText(ctx, text, telegramId, lang, bot);
      return;
    }

    // ── LLM mode ──────────────────────────────────────────────────────────────

    // State machine: check for pending action
    const pending = await pendingActionRepo.getActive(telegramId);

    if (pending?.type === 'AWAITING_PROOF') {
      await ctx.reply(t(lang, 'awaitingProofReminder'));
      return;
    }

    if (pending?.type === 'AWAITING_CONFIRM') {
      await ctx.reply(t(lang, 'awaitingConfirmReminder'));
      return;
    }

    if (pending?.type === 'AWAITING_HOUSEHOLD') {
      await ctx.reply(t(lang, 'awaitingHouseholdReminder'));
      return;
    }

    // Classify via LLM
    let intent;
    try {
      const messages = await buildMessages(telegramId, text);
      intent = await classifyIntent(messages);
    } catch (err) {
      logger.error({ err }, 'LLM classification failed');
      await ctx.reply(t(lang, 'classifyError'));
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
      case 'BROADCAST':
        await broadcastFlow.handle(ctx, intent);
        break;
      case 'HELP':
        await ctx.reply(t(lang, 'helpText'), { parse_mode: 'Markdown' });
        break;
      case 'UNKNOWN':
        await ctx.reply(t(lang, 'unknownIntent') + t(lang, 'llmSwitchTip'), { parse_mode: 'Markdown' });
        break;
    }
  });

  // ── Photos ───────────────────────────────────────────────────────────────────
  bot.on(message('photo'), async (ctx) => {
    await upsertAndLoadLang(ctx);
    const photo = ctx.message.photo[ctx.message.photo.length - 1];
    const proof: ProofInfo = {
      fileId: photo.file_id,
      fileUniqueId: photo.file_unique_id,
    };

    // Button mode: check if pending broadcast message (to allow photo+caption broadcast)
    const telegramId = ctx.from.id;
    const pending = await pendingActionRepo.getActive(telegramId);
    if (pending?.type === 'BM_BROADCAST_MSG') {
      await broadcastWizard.onPhoto(ctx, proof, ctx.message.caption, pending, bot);
      return;
    }

    await handleAttachment(ctx, proof, ctx.message.caption, bot);
  });

  // ── Documents ────────────────────────────────────────────────────────────────
  bot.on(message('document'), async (ctx) => {
    await upsertAndLoadLang(ctx);
    const doc = ctx.message.document;
    const proof: ProofInfo = {
      fileId: doc.file_id,
      fileUniqueId: doc.file_unique_id,
    };
    await handleAttachment(ctx, proof, ctx.message.caption, bot);
  });

  // ── Callback queries ─────────────────────────────────────────────────────────
  bot.on('callback_query', async (ctx) => {
    // Load lang for callback context too (needed for cancel message etc.)
    if (ctx.from) {
      const user = await userRepo.getById(ctx.from.id);
      (ctx.state as Record<string, unknown>)['lang'] = (user?.language as Lang | null) ?? null;
    }
    // Handle lang_settings shortcut (from /start "change language" button)
    if ('data' in ctx.callbackQuery && ctx.callbackQuery.data === 'lang_settings') {
      const lang = getLang(ctx);
      const langName = escapeMd(lang ? LANG_NAMES[lang] : LANG_NAMES['en']);
      await ctx.answerCbQuery();
      await ctx.editMessageText(
        t(lang, 'settingsHeader', { language: langName }),
        { parse_mode: 'Markdown', reply_markup: languageKeyboard() }
      );
      return;
    }
    await handleCallback(ctx, bot);
  });

  // ── Error handler ─────────────────────────────────────────────────────────────
  bot.catch(errorHandler);

  return bot;
}
