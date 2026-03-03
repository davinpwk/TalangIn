import { Context } from 'telegraf';
import { Telegraf } from 'telegraf';
import { householdRepo } from '../db/repos/householdRepo';
import { userRepo } from '../db/repos/userRepo';
import { pendingActionRepo } from '../db/repos/pendingActionRepo';
import { confirmKeyboard } from '../bot/keyboards/confirmKeyboard';
import { notifyUser } from '../utils/notify';
import { escapeMd } from '../domain/money';
import { t, getLang } from '../i18n';
import type { KickMemberIntent } from '../llm/schemas';
import type { ConfirmKickPayload } from '../types';

export async function handle(ctx: Context, intent: KickMemberIntent): Promise<void> {
  const telegramId = ctx.from!.id;
  const lang = getLang(ctx);

  const households = await householdRepo.getActiveHouseholdsForUser(telegramId);
  const ownedHouseholds = households.filter((h) => h.role === 'OWNER');

  if (ownedHouseholds.length === 0) {
    await ctx.reply(t(lang, 'notHouseholdOwner'));
    return;
  }

  let targetHousehold = ownedHouseholds[0];
  if (intent.household_hint && ownedHouseholds.length > 1) {
    const hint = intent.household_hint.toLowerCase();
    const match = ownedHouseholds.find((h) => h.name.toLowerCase().includes(hint));
    if (match) {
      targetHousehold = match;
    } else {
      await ctx.reply(
        t(lang, 'whichHousehold', { households: ownedHouseholds.map((h) => h.name).join(', ') })
      );
      return;
    }
  }

  const ident = intent.member_identifier.replace(/^@/, '').toLowerCase();
  const members = await householdRepo.getActiveMembers(targetHousehold.id);
  const target = members.find(
    (m) =>
      m.telegram_id !== telegramId &&
      m.role !== 'OWNER' &&
      (m.username?.toLowerCase() === ident ||
        m.first_name.toLowerCase() === ident ||
        (m.first_name + ' ' + (m.last_name ?? '')).toLowerCase().trim() === ident)
  );

  if (!target) {
    await ctx.reply(
      t(lang, 'kickMemberNotFound', {
        identifier: intent.member_identifier,
        householdName: escapeMd(targetHousehold.name),
      }),
      { parse_mode: 'Markdown' }
    );
    return;
  }

  const memberRef = target.username ? `@${target.username}` : target.first_name;

  const kickPayload: ConfirmKickPayload = {
    flow: 'KICK',
    actorId: telegramId,
    householdId: targetHousehold.id,
    householdName: targetHousehold.name,
    memberId: target.telegram_id,
    memberUsername: target.username,
    memberFirstName: target.first_name,
  };

  const pending = await pendingActionRepo.create(telegramId, 'AWAITING_CONFIRM', kickPayload);

  await ctx.reply(
    t(lang, 'kickPreview', {
      member: memberRef,
      householdName: escapeMd(targetHousehold.name),
    }),
    {
      parse_mode: 'Markdown',
      reply_markup: confirmKeyboard(pending.id, pending.token),
    }
  );
}

export async function executeKick(
  ctx: Context,
  payload: ConfirmKickPayload,
  bot: Telegraf
): Promise<void> {
  await householdRepo.kickMember(payload.householdId, payload.memberId);

  const memberRef = payload.memberUsername
    ? `@${payload.memberUsername}`
    : payload.memberFirstName;

  const lang = getLang(ctx);
  await ctx.editMessageText(
    t(lang, 'kickConfirmed', {
      member: memberRef,
      householdName: escapeMd(payload.householdName),
    }),
    { parse_mode: 'Markdown' }
  );

  // Notify kicked member in their language
  const member = await userRepo.getById(payload.memberId);
  const memberLang = (member?.language as import('../i18n').Lang | null) ?? null;

  await notifyUser(
    bot,
    payload.memberId,
    t(memberLang, 'kickedNotification', { householdName: escapeMd(payload.householdName) }),
    ctx
  );
}
