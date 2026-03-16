import { Context } from 'telegraf';
import { Telegraf } from 'telegraf';
import { householdRepo } from '../../db/repos/householdRepo';
import { userRepo } from '../../db/repos/userRepo';
import { pendingActionRepo, PendingAction } from '../../db/repos/pendingActionRepo';
import { escapeMd } from '../../domain/money';
import { t, getLang } from '../../i18n';
import { mainReplyKeyboard } from '../keyboards/replyKeyboard';
import * as joinHouseholdFlow from '../../flows/joinHousehold';
import { cancelKeyboard } from '../keyboards/cancelKeyboard';

export async function showHouseholdPicker(ctx: Context, telegramId: number): Promise<void> {
  const lang = getLang(ctx);
  const households = await householdRepo.getActiveHouseholdsForUser(telegramId);

  if (households.length === 0) {
    await ctx.reply(t(lang, 'noHouseholds'), {
      reply_markup: {
        inline_keyboard: [
          [
            { text: t(lang, 'createHouseholdBtn'), callback_data: 'bm:hh:create' },
            { text: t(lang, 'joinHouseholdBtn'), callback_data: 'bm:hh:join' },
          ],
        ],
      },
    });
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

// ── Create Household Wizard ──────────────────────────────────────────────────

export async function startCreateHousehold(ctx: Context, telegramId: number): Promise<void> {
  const lang = getLang(ctx);
  await pendingActionRepo.create(telegramId, 'BM_CREATE_HH_NAME', {});
  await ctx.answerCbQuery();
  await ctx.reply(t(lang, 'createHouseholdNamePrompt'), { reply_markup: cancelKeyboard });
}

export async function onCreateHouseholdName(
  ctx: Context,
  text: string,
  pending: PendingAction
): Promise<void> {
  const lang = getLang(ctx);
  const name = text.trim();

  await pendingActionRepo.updateTypeAndPayload(pending.id, 'BM_CREATE_HH_CURRENCY', { name });

  await ctx.reply(t(lang, 'createHouseholdCurrencyPrompt', { name: escapeMd(name) }), {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [
          { text: 'IDR 🇮🇩', callback_data: 'bm:hh:currency:IDR' },
          { text: 'AUD 🇦🇺', callback_data: 'bm:hh:currency:AUD' },
          { text: 'USD 🇺🇸', callback_data: 'bm:hh:currency:USD' },
          { text: 'SGD 🇸🇬', callback_data: 'bm:hh:currency:SGD' },
        ],
        [{ text: '❌ Cancel', callback_data: 'bm:cancel' }],
      ],
    },
  });
}

export async function onCreateHouseholdCurrency(
  ctx: Context,
  currency: string
): Promise<void> {
  const telegramId = ctx.from!.id;
  const lang = getLang(ctx);

  const pending = await pendingActionRepo.getActive(telegramId);
  if (!pending || pending.type !== 'BM_CREATE_HH_CURRENCY') {
    await ctx.answerCbQuery('Session expired. Please try again.');
    return;
  }

  const { name } = JSON.parse(pending.payload_json);
  await pendingActionRepo.markUsed(pending.id);

  const { joinCode } = await householdRepo.create({
    name,
    ownerTelegramId: telegramId,
    currency,
  });

  // Fetch the new household and set it as active
  const households = await householdRepo.getActiveHouseholdsForUser(telegramId);
  const newHousehold = households.find((h) => h.name === name);
  if (newHousehold) {
    await userRepo.setActiveHousehold(telegramId, newHousehold.id);
  }

  await ctx.answerCbQuery();
  await ctx.editMessageText(
    t(lang, 'householdCreated', { name: escapeMd(name), currency, joinCode }),
    { parse_mode: 'Markdown', reply_markup: undefined }
  );

  await ctx.reply('👇', {
    reply_markup: mainReplyKeyboard(name).reply_markup,
  });
}

// ── Join Household Wizard ────────────────────────────────────────────────────

export async function startJoinHousehold(ctx: Context, telegramId: number): Promise<void> {
  const lang = getLang(ctx);
  await pendingActionRepo.create(telegramId, 'BM_JOIN_HH_CODE', {});
  await ctx.answerCbQuery();
  await ctx.reply(t(lang, 'joinHouseholdCodePrompt'), { reply_markup: cancelKeyboard });
}

export async function onJoinHouseholdCode(
  ctx: Context,
  text: string,
  pending: PendingAction,
  bot: Telegraf
): Promise<void> {
  await pendingActionRepo.markUsed(pending.id);
  await joinHouseholdFlow.handle(ctx, { intent: 'JOIN_HOUSEHOLD', join_code: text.trim() }, bot);
}
