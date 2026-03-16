import { Context } from 'telegraf';
import { Markup } from 'telegraf';
import { userRepo } from '../../db/repos/userRepo';
import { pendingActionRepo } from '../../db/repos/pendingActionRepo';
import { t, getLang, LANG_NAMES } from '../../i18n';
import { escapeMd } from '../../domain/money';
import { languageKeyboard } from '../keyboards/languageKeyboard';
import { mainReplyKeyboard } from '../keyboards/replyKeyboard';
import { householdRepo } from '../../db/repos/householdRepo';

export async function showSettingsMenu(ctx: Context, telegramId: number): Promise<void> {
  const lang = getLang(ctx);
  const user = await userRepo.getById(telegramId);

  const nickname = user?.nickname ?? (user?.username ? `@${user.username}` : user?.first_name ?? '—');
  const mode = user?.mode ?? 'button';
  const language = lang ? LANG_NAMES[lang] : LANG_NAMES['en'];

  const modeSwitch = mode === 'button'
    ? [{ text: t(lang, 'settingsSwitchLlmBtn'), callback_data: 'bm:settings:switch_llm' }]
    : [{ text: t(lang, 'settingsSwitchButtonBtn'), callback_data: 'bm:settings:switch_button' }];

  await ctx.reply(t(lang, 'settingsMenu', {
    nickname: escapeMd(nickname),
    mode: mode === 'button' ? 'Button Mode 🔘' : 'LLM Mode 🤖',
    language: escapeMd(language),
  }), {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: t(lang, 'settingsNicknameBtn'), callback_data: 'bm:settings:nickname' }],
        [{ text: t(lang, 'settingsLangBtn'), callback_data: 'bm:settings:lang' }],
        modeSwitch,
      ],
    },
  });
}

export async function startNickname(ctx: Context, telegramId: number): Promise<void> {
  const lang = getLang(ctx);
  await pendingActionRepo.create(telegramId, 'BM_NICKNAME', {});
  await ctx.answerCbQuery();
  await ctx.reply(t(lang, 'nicknamePrompt'), { reply_markup: { inline_keyboard: [[{ text: '❌ Cancel', callback_data: 'bm:cancel' }]] } });
}

export async function onNickname(ctx: Context, text: string): Promise<void> {
  const lang = getLang(ctx);
  const telegramId = ctx.from!.id;
  const nickname = text.trim().slice(0, 64); // reasonable limit
  await userRepo.setNickname(telegramId, nickname);
  await pendingActionRepo.clearForUser(telegramId);
  await ctx.reply(t(lang, 'nicknameSet', { nickname: escapeMd(nickname) }), { parse_mode: 'Markdown' });
}

export async function showLlmWarning(ctx: Context): Promise<void> {
  const lang = getLang(ctx);
  await ctx.answerCbQuery();
  await ctx.editMessageText(t(lang, 'switchToLlmWarning'), {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: t(lang, 'llmModeConfirmBtn'), callback_data: 'bm:mode_confirm:llm' }],
        [{ text: t(lang, 'llmModeBackBtn'), callback_data: 'bm:mode_cancel' }],
      ],
    },
  });
}

export async function confirmSwitchToLlm(ctx: Context, telegramId: number): Promise<void> {
  const lang = getLang(ctx);
  await userRepo.setMode(telegramId, 'llm');
  await userRepo.setActiveHousehold(telegramId, null);
  await ctx.answerCbQuery();
  await ctx.editMessageText(t(lang, 'modeChangedToLlm'), { reply_markup: undefined });
  // Remove reply keyboard
  await ctx.reply('🤖', { reply_markup: Markup.removeKeyboard().reply_markup });
}

export async function switchToButton(ctx: Context, telegramId: number): Promise<void> {
  const lang = getLang(ctx);
  const user = await userRepo.getById(telegramId);
  if (user?.mode === 'button') {
    await ctx.answerCbQuery(t(lang, 'alreadyButtonMode'));
    return;
  }
  await userRepo.setMode(telegramId, 'button');
  await ctx.answerCbQuery();
  await ctx.editMessageText(t(lang, 'modeChangedToButton'), { reply_markup: undefined });

  // Re-send reply keyboard
  const activeHousehold = user?.active_household_id
    ? await householdRepo.getById(user.active_household_id)
    : null;
  await ctx.reply('👇', {
    reply_markup: mainReplyKeyboard(activeHousehold?.name ?? null).reply_markup,
  });
}

export async function showLangPicker(ctx: Context): Promise<void> {
  const lang = getLang(ctx);
  await ctx.answerCbQuery();
  await ctx.editMessageText(t(lang, 'languagePicker'), {
    reply_markup: languageKeyboard(),
  });
}
