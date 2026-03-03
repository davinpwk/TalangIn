import { Context } from 'telegraf';
import { Telegraf } from 'telegraf';
import { pendingActionRepo } from '../db/repos/pendingActionRepo';
import { householdRepo } from '../db/repos/householdRepo';
import { userRepo } from '../db/repos/userRepo';
import { logger } from '../utils/logger';
import { executeExpense } from '../flows/logExpense';
import { executePayment } from '../flows/logPayment';
import { executeKick } from '../flows/kickMember';
import { executeBroadcast } from '../flows/broadcast';
import * as joinFlow from '../flows/joinHousehold';
import * as viewBalancesFlow from '../flows/viewBalances';
import { t, getLang, LANG_NAMES, type Lang } from '../i18n';
import { languageKeyboard } from './keyboards/languageKeyboard';
import { escapeMd } from '../domain/money';
import type {
  ConfirmPayload,
  ConfirmExpensePayload,
  ConfirmPaymentPayload,
  ConfirmKickPayload,
  ConfirmBroadcastPayload,
  AwaitingHouseholdPayload,
} from '../types';
import type { LogExpenseIntent, LogPaymentIntent, BroadcastIntent } from '../llm/schemas';
import * as logExpenseFlow from '../flows/logExpense';
import * as logPaymentFlow from '../flows/logPayment';
import * as broadcastFlow from '../flows/broadcast';

export async function handleCallback(ctx: Context, bot: Telegraf): Promise<void> {
  if (!ctx.callbackQuery || !('data' in ctx.callbackQuery)) {
    await ctx.answerCbQuery();
    return;
  }

  const data = ctx.callbackQuery.data;
  logger.debug({ data, userId: ctx.from?.id }, 'Callback received');

  try {
    if (data.startsWith('lang_set:')) {
      await handleLangSet(ctx, data);
    } else if (data.startsWith('cb:join:approve:')) {
      await joinFlow.handleApprove(ctx, data, bot);
    } else if (data.startsWith('cb:join:deny:')) {
      await joinFlow.handleDeny(ctx, data, bot);
    } else if (data.startsWith('cb:confirm:')) {
      await handleConfirm(ctx, data, bot);
    } else if (data.startsWith('cb:cancel:')) {
      await handleCancel(ctx, data);
    } else if (data.startsWith('cb:hs:')) {
      await handleHouseholdSelect(ctx, data, bot);
    } else if (data.startsWith('cb:bal:')) {
      await viewBalancesFlow.handleHouseholdSelect(ctx, data);
    } else {
      await ctx.answerCbQuery('Unknown action.');
    }
  } catch (err) {
    logger.error({ err, data }, 'Error handling callback');
    await ctx.answerCbQuery('Something went wrong. Please try again.');
  }
}

async function handleLangSet(ctx: Context, data: string): Promise<void> {
  // data = "lang_set:en" or "lang_set:id"
  const langCode = data.replace('lang_set:', '') as Lang;
  if (langCode !== 'en' && langCode !== 'id') {
    await ctx.answerCbQuery('Unknown language.');
    return;
  }

  const telegramId = ctx.from!.id;

  // Check if this is first-time setup (language was NULL before)
  const user = await userRepo.getById(telegramId);
  const isFirstTime = user?.language == null;

  await userRepo.setLanguage(telegramId, langCode);
  // Update state so subsequent t() calls in this request use the new language
  (ctx.state as Record<string, unknown>)['lang'] = langCode;

  await ctx.answerCbQuery();

  const langName = LANG_NAMES[langCode];

  if (isFirstTime) {
    // Show full welcome in chosen language
    const welcomeText =
      t(langCode, 'welcome') + t(langCode, 'helpText');
    await ctx.editMessageText(welcomeText, {
      parse_mode: 'Markdown',
      reply_markup: undefined,
    });
  } else {
    // From /settings — just confirm the change
    await ctx.editMessageText(
      t(langCode, 'languageChanged', { language: escapeMd(langName) }),
      { parse_mode: 'Markdown', reply_markup: undefined }
    );
  }
}

async function handleConfirm(ctx: Context, data: string, bot: Telegraf): Promise<void> {
  // data = "cb:confirm:<id>:<token>"
  const parts = data.split(':');
  if (parts.length !== 4) {
    await ctx.answerCbQuery('Invalid confirmation data.');
    return;
  }
  const [, , id, token] = parts;

  const action = await pendingActionRepo.consume(id, token);
  if (!action) {
    await ctx.answerCbQuery('This confirmation has expired or was already used.');
    await ctx.editMessageReplyMarkup(undefined);
    return;
  }

  if (action.type !== 'AWAITING_CONFIRM') {
    await ctx.answerCbQuery('Invalid action type.');
    return;
  }

  const payload = JSON.parse(action.payload_json) as ConfirmPayload;
  await ctx.answerCbQuery('Processing...');

  switch (payload.flow) {
    case 'EXPENSE':
      await executeExpense(ctx, payload as ConfirmExpensePayload, bot);
      break;
    case 'PAYMENT':
      await executePayment(ctx, payload as ConfirmPaymentPayload, bot);
      break;
    case 'KICK':
      await executeKick(ctx, payload as ConfirmKickPayload, bot);
      break;
    case 'BROADCAST':
      await executeBroadcast(ctx, payload as ConfirmBroadcastPayload, bot);
      break;
  }
}

async function handleCancel(ctx: Context, data: string): Promise<void> {
  // data = "cb:cancel:<id>"
  const id = data.replace('cb:cancel:', '');
  const action = await pendingActionRepo.getById(id);

  if (action && action.used_at === null) {
    await pendingActionRepo.markUsed(id);
  }

  const lang = getLang(ctx);
  await ctx.answerCbQuery('Cancelled.');
  await ctx.editMessageText(t(lang, 'cancelledAction'), { reply_markup: undefined });
}

async function handleHouseholdSelect(ctx: Context, data: string, bot: Telegraf): Promise<void> {
  // data = "cb:hs:<householdId>:<pendingActionId>"
  const parts = data.split(':');
  if (parts.length !== 4) {
    await ctx.answerCbQuery('Invalid data.');
    return;
  }
  const [, , householdId, pendingActionId] = parts;

  const action = await pendingActionRepo.getById(pendingActionId);
  if (!action || action.used_at !== null) {
    await ctx.answerCbQuery('This selection has expired.');
    await ctx.editMessageReplyMarkup(undefined);
    return;
  }

  // Verify the household is valid and user is still a member
  const membership = await householdRepo.getMembership(householdId, ctx.from!.id);
  if (!membership || membership.status !== 'ACTIVE') {
    await ctx.answerCbQuery('You are not a member of that household.');
    return;
  }

  await pendingActionRepo.markUsed(action.id);
  await ctx.answerCbQuery();
  await ctx.editMessageReplyMarkup(undefined);

  const saved = JSON.parse(action.payload_json) as AwaitingHouseholdPayload;

  if (saved.intent === 'LOG_EXPENSE') {
    await logExpenseFlow.handle(ctx, saved.data as LogExpenseIntent, saved.proof, householdId);
  } else if (saved.intent === 'LOG_PAYMENT') {
    await logPaymentFlow.handle(ctx, saved.data as LogPaymentIntent, saved.proof, householdId);
  } else if (saved.intent === 'BROADCAST') {
    await broadcastFlow.handle(ctx, saved.data as BroadcastIntent, householdId);
  }
}
