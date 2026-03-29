import { Context } from 'telegraf';
import { Telegraf } from 'telegraf';
import { pendingActionRepo } from '../db/repos/pendingActionRepo';
import { householdRepo } from '../db/repos/householdRepo';
import { userRepo } from '../db/repos/userRepo';
import { logger } from '../utils/logger';
import { executeBroadcast } from '../flows/broadcast';
import { executeIOwe } from '../flows/iOwe';
import * as joinFlow from '../flows/joinHousehold';
import * as viewBalancesFlow from '../flows/viewBalances';
import { t, getLang, LANG_NAMES, type Lang } from '../i18n';
import { languageKeyboard } from './keyboards/languageKeyboard';
import { mainReplyKeyboard } from './keyboards/replyKeyboard';
import { escapeMd } from '../domain/money';
import { handleButtonModeCallback } from './buttonMode/callbackHandler';
import type {
  ConfirmPayload,
  ConfirmBroadcastPayload,
  ConfirmIOwePayload,
} from '../types';

export async function handleCallback(ctx: Context, bot: Telegraf): Promise<void> {
  if (!ctx.callbackQuery || !('data' in ctx.callbackQuery)) {
    await ctx.answerCbQuery();
    return;
  }

  const data = ctx.callbackQuery.data;
  logger.debug({ data, userId: ctx.from?.id }, 'Callback received');

  try {
    if (data.startsWith('bm:')) {
      await handleButtonModeCallback(ctx, data, bot);
    } else if (data.startsWith('lang_set:')) {
      await handleLangSet(ctx, data);
    } else if (data.startsWith('cb:join:approve:')) {
      await joinFlow.handleApprove(ctx, data, bot);
    } else if (data.startsWith('cb:join:deny:')) {
      await joinFlow.handleDeny(ctx, data, bot);
    } else if (data.startsWith('cb:confirm:')) {
      await handleConfirm(ctx, data, bot);
    } else if (data.startsWith('cb:cancel:')) {
      await handleCancel(ctx, data);
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
  const langCode = data.replace('lang_set:', '') as Lang;
  if (langCode !== 'en' && langCode !== 'id') {
    await ctx.answerCbQuery('Unknown language.');
    return;
  }

  const telegramId = ctx.from!.id;
  const user = await userRepo.getById(telegramId);
  const isFirstTime = user?.language == null;

  await userRepo.setLanguage(telegramId, langCode);
  (ctx.state as Record<string, unknown>)['lang'] = langCode;

  await ctx.answerCbQuery();

  const langName = LANG_NAMES[langCode];

  if (isFirstTime) {
    await ctx.editMessageText(t(langCode, 'welcome'), {
      parse_mode: 'Markdown',
      reply_markup: undefined,
    });

    const updatedUser = await userRepo.getById(telegramId);
    const activeHousehold = updatedUser?.active_household_id
      ? await householdRepo.getById(updatedUser.active_household_id)
      : null;
    await ctx.reply('👇', {
      reply_markup: mainReplyKeyboard(activeHousehold?.name ?? null).reply_markup,
    });
  } else {
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
    case 'BROADCAST':
      await executeBroadcast(ctx, payload as ConfirmBroadcastPayload, bot);
      break;
    case 'IOWE':
      await executeIOwe(ctx, payload as ConfirmIOwePayload, bot);
      break;
  }
}

async function handleCancel(ctx: Context, data: string): Promise<void> {
  const id = data.replace('cb:cancel:', '');
  const action = await pendingActionRepo.getById(id);

  if (action && action.used_at === null) {
    await pendingActionRepo.markUsed(id);
  }

  const lang = getLang(ctx);
  await ctx.answerCbQuery('Cancelled.');
  await ctx.editMessageText(t(lang, 'cancelledAction'), { reply_markup: undefined });
}
