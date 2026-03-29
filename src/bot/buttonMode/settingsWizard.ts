import { Context } from 'telegraf';
import { userRepo } from '../../db/repos/userRepo';
import { pendingActionRepo } from '../../db/repos/pendingActionRepo';
import { t, getLang, LANG_NAMES } from '../../i18n';
import { escapeMd } from '../../domain/money';
import { languageKeyboard } from '../keyboards/languageKeyboard';

export async function showSettingsMenu(ctx: Context, telegramId: number): Promise<void> {
  const lang = getLang(ctx);
  const user = await userRepo.getById(telegramId);

  const nickname = user?.nickname ?? (user?.username ? `@${user.username}` : user?.first_name ?? '—');
  const language = lang ? LANG_NAMES[lang] : LANG_NAMES['en'];

  await ctx.reply(t(lang, 'settingsMenu', {
    nickname: escapeMd(nickname),
    language: escapeMd(language),
  }), {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: t(lang, 'settingsNicknameBtn'), callback_data: 'bm:settings:nickname' }],
        [{ text: t(lang, 'settingsLangBtn'), callback_data: 'bm:settings:lang' }],
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
  const nickname = text.trim().slice(0, 64);
  await userRepo.setNickname(telegramId, nickname);
  await pendingActionRepo.clearForUser(telegramId);
  await ctx.reply(t(lang, 'nicknameSet', { nickname: escapeMd(nickname) }), { parse_mode: 'Markdown' });
}

export async function showLangPicker(ctx: Context): Promise<void> {
  const lang = getLang(ctx);
  await ctx.answerCbQuery();
  await ctx.editMessageText(t(lang, 'languagePicker'), {
    reply_markup: languageKeyboard(),
  });
}
