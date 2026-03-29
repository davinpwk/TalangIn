import { Context } from 'telegraf';
import { Telegraf } from 'telegraf';
import { householdRepo } from '../../db/repos/householdRepo';
import { debtRepo } from '../../db/repos/debtRepo';
import { userRepo } from '../../db/repos/userRepo';
import { pendingActionRepo, PendingAction } from '../../db/repos/pendingActionRepo';
import { escapeMd, formatMoney } from '../../domain/money';
import { displayName } from '../../domain/displayName';
import { t, getLang } from '../../i18n';
import { mainReplyKeyboard } from '../keyboards/replyKeyboard';
import * as joinHouseholdFlow from '../../flows/joinHousehold';
import { cancelKeyboard } from '../keyboards/cancelKeyboard';

// ── Household Management Menu ────────────────────────────────────────────────

export async function showHouseholdMenu(ctx: Context, telegramId: number): Promise<void> {
  const lang = getLang(ctx);
  const user = await userRepo.getById(telegramId);
  const activeHouseholdId = user?.active_household_id ?? null;

  if (!activeHouseholdId) {
    await showHouseholdPicker(ctx, telegramId);
    return;
  }

  const household = await householdRepo.getById(activeHouseholdId);
  if (!household) {
    await showHouseholdPicker(ctx, telegramId);
    return;
  }

  const isOwner = household.owner_telegram_id === telegramId;
  const households = await householdRepo.getActiveHouseholdsForUser(telegramId);

  const rows: Array<Array<{ text: string; callback_data: string }>> = [];

  if (households.length > 1) {
    rows.push([{ text: t(lang, 'changeHousehold'), callback_data: 'bm:hh:pick' }]);
  }

  if (isOwner) {
    rows.push([
      { text: t(lang, 'hhMenuAllDebts'), callback_data: 'bm:hh:alldebt' },
      { text: t(lang, 'hhMenuKick'), callback_data: 'bm:hh:kick' },
    ]);
    rows.push([{ text: t(lang, 'hhMenuJoinCode'), callback_data: 'bm:hh:joincode' }]);
  }

  rows.push([
    { text: t(lang, 'createHouseholdBtn'), callback_data: 'bm:hh:create' },
    { text: t(lang, 'joinHouseholdBtn'), callback_data: 'bm:hh:join' },
  ]);

  await ctx.reply(
    t(lang, 'hhMenuHeader', { name: escapeMd(household.name) }),
    { parse_mode: 'Markdown', reply_markup: { inline_keyboard: rows } }
  );
}

// ── Household Picker (switch active) ────────────────────────────────────────

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

  await ctx.reply('👇', {
    reply_markup: mainReplyKeyboard(household.name).reply_markup,
  });
}

// ── All Debts (owner only) ───────────────────────────────────────────────────

export async function showAllDebts(ctx: Context, telegramId: number): Promise<void> {
  const lang = getLang(ctx);
  const user = await userRepo.getById(telegramId);
  const householdId = user?.active_household_id;

  if (!householdId) {
    await ctx.answerCbQuery('No active household.');
    return;
  }

  const household = await householdRepo.getById(householdId);
  if (!household || household.owner_telegram_id !== telegramId) {
    await ctx.answerCbQuery(t(lang, 'notOwner'));
    return;
  }

  const allDebts = await debtRepo.getAllDebtsInHousehold(householdId);
  const members = await householdRepo.getActiveMembers(householdId) as Array<{
    telegram_id: number; username: string | null; first_name: string; nickname?: string | null;
  }>;

  await ctx.answerCbQuery();

  let text = t(lang, 'householdSummary', { householdName: escapeMd(household.name) });

  if (allDebts.length === 0) {
    text += `_${t(lang, 'allSettled').trim()}_`;
  } else {
    // Group debts by debtor
    const byDebtor = new Map<number, typeof allDebts>();
    for (const d of allDebts) {
      const list = byDebtor.get(d.debtor_telegram_id) ?? [];
      list.push(d);
      byDebtor.set(d.debtor_telegram_id, list);
    }

    for (const member of members) {
      const debts = byDebtor.get(member.telegram_id);
      if (!debts || debts.length === 0) continue;
      const memberName = escapeMd(displayName(member));
      text += `*${memberName}* ${t(lang, 'owes')}:\n`;
      for (const d of debts) {
        const creditorName = escapeMd(d.creditor_username ? `@${d.creditor_username}` : d.creditor_first_name);
        text += `  • ${creditorName}: ${formatMoney(d.amount_cents, household.currency_default)}\n`;
      }
      text += '\n';
    }
  }

  await ctx.reply(text, { parse_mode: 'Markdown' });
}

// ── Show Join Code (owner only) ──────────────────────────────────────────────

export async function showJoinCode(ctx: Context, telegramId: number): Promise<void> {
  const lang = getLang(ctx);
  const user = await userRepo.getById(telegramId);
  const householdId = user?.active_household_id;

  if (!householdId) {
    await ctx.answerCbQuery('No active household.');
    return;
  }

  const household = await householdRepo.getById(householdId);
  if (!household || household.owner_telegram_id !== telegramId) {
    await ctx.answerCbQuery(t(lang, 'notOwner'));
    return;
  }

  await ctx.answerCbQuery();
  await ctx.reply(
    t(lang, 'hhJoinCodeDisplay', { name: escapeMd(household.name), joinCode: household.join_code }),
    { parse_mode: 'Markdown' }
  );
}

// ── Kick Member Wizard ───────────────────────────────────────────────────────

export async function showKickPicker(ctx: Context, telegramId: number): Promise<void> {
  const lang = getLang(ctx);
  const user = await userRepo.getById(telegramId);
  const householdId = user?.active_household_id;

  if (!householdId) {
    await ctx.answerCbQuery('No active household.');
    return;
  }

  const household = await householdRepo.getById(householdId);
  if (!household || household.owner_telegram_id !== telegramId) {
    await ctx.answerCbQuery(t(lang, 'notOwner'));
    return;
  }

  const allMembers = await householdRepo.getActiveMembers(householdId) as Array<{
    telegram_id: number; username: string | null; first_name: string; nickname?: string | null;
  }>;
  const kickable = allMembers.filter((m) => m.telegram_id !== telegramId);

  if (kickable.length === 0) {
    await ctx.answerCbQuery();
    await ctx.reply(t(lang, 'hhNoMembersToKick'));
    return;
  }

  await ctx.answerCbQuery();
  await ctx.reply(t(lang, 'hhKickPickMember'), {
    reply_markup: {
      inline_keyboard: [
        ...kickable.map((m) => [{
          text: displayName(m),
          callback_data: `bm:kick:${m.telegram_id}`,
        }]),
        [{ text: '❌ Cancel', callback_data: 'bm:cancel' }],
      ],
    },
  });
}

export async function showKickConfirm(ctx: Context, memberId: number): Promise<void> {
  const lang = getLang(ctx);
  const telegramId = ctx.from!.id;
  const user = await userRepo.getById(telegramId);
  const householdId = user?.active_household_id;

  if (!householdId) {
    await ctx.answerCbQuery('No active household.');
    return;
  }

  const household = await householdRepo.getById(householdId);
  if (!household || household.owner_telegram_id !== telegramId) {
    await ctx.answerCbQuery(t(lang, 'notOwner'));
    return;
  }

  const allMembers = await householdRepo.getActiveMembers(householdId) as Array<{
    telegram_id: number; username: string | null; first_name: string; nickname?: string | null;
  }>;
  const member = allMembers.find((m) => m.telegram_id === memberId);
  if (!member) {
    await ctx.answerCbQuery('Member not found.');
    return;
  }

  const memberName = escapeMd(displayName(member));
  await ctx.answerCbQuery();
  await ctx.editMessageText(
    t(lang, 'hhKickConfirmPrompt', { member: memberName, householdName: escapeMd(household.name) }),
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            { text: t(lang, 'hhKickConfirmBtn'), callback_data: `bm:kick:confirm:${memberId}` },
            { text: '❌ Cancel', callback_data: 'bm:cancel' },
          ],
        ],
      },
    }
  );
}

export async function executeKick(ctx: Context, memberId: number, bot: Telegraf): Promise<void> {
  const lang = getLang(ctx);
  const telegramId = ctx.from!.id;
  const user = await userRepo.getById(telegramId);
  const householdId = user?.active_household_id;

  if (!householdId) {
    await ctx.answerCbQuery('No active household.');
    return;
  }

  const household = await householdRepo.getById(householdId);
  if (!household || household.owner_telegram_id !== telegramId) {
    await ctx.answerCbQuery(t(lang, 'notOwner'));
    return;
  }

  await householdRepo.kickMember(householdId, memberId);

  // If kicked member had this as active household, clear it
  const kickedUser = await userRepo.getById(memberId);
  if (kickedUser?.active_household_id === householdId) {
    await userRepo.setActiveHousehold(memberId, null);
  }

  const allMembers = await householdRepo.getActiveMembers(householdId) as Array<{
    telegram_id: number; username: string | null; first_name: string; nickname?: string | null;
  }>;
  const member = allMembers.find((m) => m.telegram_id === memberId);
  const memberName = member
    ? escapeMd(displayName(member))
    : `user ${memberId}`;

  await ctx.answerCbQuery();
  await ctx.editMessageText(
    t(lang, 'kickConfirmed', { member: memberName, householdName: escapeMd(household.name) }),
    { parse_mode: 'Markdown', reply_markup: undefined }
  );

  // Notify kicked member
  const kickedUserData = await userRepo.getById(memberId);
  const kickedLang = (kickedUserData?.language as import('../../i18n').Lang | null) ?? null;
  try {
    await bot.telegram.sendMessage(
      memberId,
      t(kickedLang, 'kickedNotification', { householdName: escapeMd(household.name) }),
      { parse_mode: 'Markdown' }
    );
  } catch {
    // Silently skip — user may not have started the bot
  }
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
  await joinHouseholdFlow.handleJoinByCode(ctx, text.trim(), bot);
}
