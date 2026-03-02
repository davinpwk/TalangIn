import { Context } from 'telegraf';
import { Telegraf } from 'telegraf';
import { householdRepo } from '../db/repos/householdRepo';
import { pendingActionRepo } from '../db/repos/pendingActionRepo';
import { confirmKeyboard } from '../bot/keyboards/confirmKeyboard';
import { notifyUser } from '../utils/notify';
import type { KickMemberIntent } from '../llm/schemas';
import type { ConfirmKickPayload } from '../types';

export async function handle(ctx: Context, intent: KickMemberIntent): Promise<void> {
  const telegramId = ctx.from!.id;

  // Find which households where this user is the owner
  const households = await householdRepo.getActiveHouseholdsForUser(telegramId);
  const ownedHouseholds = households.filter((h) => h.role === 'OWNER');

  if (ownedHouseholds.length === 0) {
    await ctx.reply('You are not the owner of any household. Only owners can kick members.');
    return;
  }

  // Resolve target household
  let targetHousehold = ownedHouseholds[0];
  if (intent.household_hint && ownedHouseholds.length > 1) {
    const hint = intent.household_hint.toLowerCase();
    const match = ownedHouseholds.find((h) => h.name.toLowerCase().includes(hint));
    if (match) targetHousehold = match;
    else {
      await ctx.reply(
        `Which household? You own: ${ownedHouseholds.map((h) => h.name).join(', ')}`
      );
      return;
    }
  }

  // Resolve the target member
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
      `❓ I couldn't find member "${intent.member_identifier}" in *${targetHousehold.name}*. Use their @username or exact first name.`,
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
    `⚠️ *Kick Member Preview*\n\nRemove ${memberRef} from *${targetHousehold.name}*?\n\n_This cannot be undone. Their history will be kept._`,
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

  await ctx.editMessageText(
    `✅ ${memberRef} has been removed from *${payload.householdName}*.`,
    { parse_mode: 'Markdown' }
  );

  await notifyUser(
    bot,
    payload.memberId,
    `You have been removed from the household *${payload.householdName}* by the owner.`,
    ctx
  );
}
