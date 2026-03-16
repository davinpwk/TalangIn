import { Context } from 'telegraf';
import { householdRepo } from '../../db/repos/householdRepo';
import { userRepo } from '../../db/repos/userRepo';
import { escapeMd } from '../../domain/money';
import { t, getLang } from '../../i18n';
import { mainReplyKeyboard } from '../keyboards/replyKeyboard';

export async function showHouseholdPicker(ctx: Context, telegramId: number): Promise<void> {
  const lang = getLang(ctx);
  const households = await householdRepo.getActiveHouseholdsForUser(telegramId);

  if (households.length === 0) {
    await ctx.reply(t(lang, 'noHouseholds'));
    return;
  }

  await ctx.reply(t(lang, 'pickHousehold'), {
    reply_markup: {
      inline_keyboard: households.map((h) => [
        { text: h.name, callback_data: `bm:hs:${h.id}` },
      ]),
    },
  });
}

export async function handleHouseholdSelect(
  ctx: Context,
  householdId: string
): Promise<void> {
  const telegramId = ctx.from!.id;
  const lang = getLang(ctx);

  const membership = await householdRepo.getMembership(householdId, telegramId);
  if (!membership || membership.status !== 'ACTIVE') {
    await ctx.answerCbQuery('Not a member of that household.');
    return;
  }

  const household = await householdRepo.getById(householdId);
  if (!household) {
    await ctx.answerCbQuery('Household not found.');
    return;
  }

  await userRepo.setActiveHousehold(telegramId, householdId);
  await ctx.answerCbQuery();

  await ctx.editMessageText(
    t(lang, 'activeHouseholdSet', { name: escapeMd(household.name) }),
    { parse_mode: 'Markdown', reply_markup: undefined }
  );

  // Re-send reply keyboard with updated household name
  await ctx.reply('👇', {
    reply_markup: mainReplyKeyboard(household.name).reply_markup,
  });
}
