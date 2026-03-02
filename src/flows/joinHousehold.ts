import { Context } from 'telegraf';
import { Telegraf } from 'telegraf';
import { householdRepo } from '../db/repos/householdRepo';
import { userRepo } from '../db/repos/userRepo';
import { joinRequestKeyboard } from '../bot/keyboards/joinKeyboard';
import { notifyUser } from '../utils/notify';
import { logger } from '../utils/logger';
import { escapeMd } from '../domain/money';
import type { JoinHouseholdIntent } from '../llm/schemas';

export async function handle(ctx: Context, intent: JoinHouseholdIntent, bot: Telegraf): Promise<void> {
  const telegramId = ctx.from!.id;
  const code = intent.join_code.toUpperCase();

  const household = await householdRepo.getByJoinCode(code);
  if (!household) {
    await ctx.reply(`❌ No household found with join code \`${code}\`. Double-check the code and try again.`, {
      parse_mode: 'Markdown',
    });
    return;
  }

  // Check if already a member
  const existing = await householdRepo.getMembership(household.id, telegramId);
  if (existing?.status === 'ACTIVE') {
    await ctx.reply(`You are already a member of *${household.name}*.`, { parse_mode: 'Markdown' });
    return;
  }
  if (existing?.status === 'KICKED') {
    await ctx.reply(`You were removed from *${household.name}* and cannot rejoin.`, { parse_mode: 'Markdown' });
    return;
  }

  // Check for existing pending request
  const existingReq = await householdRepo.getPendingJoinRequest(household.id, telegramId);
  if (existingReq) {
    await ctx.reply(`You already have a pending join request for *${household.name}*. Please wait for the owner to respond.`, {
      parse_mode: 'Markdown',
    });
    return;
  }

  const requestId = await householdRepo.createJoinRequest(household.id, telegramId);
  await ctx.reply(
    `✅ Join request sent to *${household.name}*\\! Waiting for the owner to approve.`,
    { parse_mode: 'Markdown' }
  );

  // Notify owner
  const requester = await userRepo.getById(telegramId);
  const requesterRef = escapeMd(requester?.username
    ? `@${requester.username}`
    : requester?.first_name ?? `user ${telegramId}`);
  const householdName = escapeMd(household.name);

  const ownerMessage =
    `👋 *New join request*\n\n` +
    `${requesterRef} wants to join *${householdName}*.\n\n` +
    `Approve or deny:`;

  try {
    await bot.telegram.sendMessage(household.owner_telegram_id, ownerMessage, {
      parse_mode: 'Markdown',
      reply_markup: joinRequestKeyboard(requestId),
    });
  } catch (err) {
    logger.warn({ err, ownerId: household.owner_telegram_id }, 'Could not notify owner of join request');
    await ctx.reply(`⚠️ The household owner couldn't be notified right now. They'll see the request when they next interact with the bot.`);
  }
}

export async function handleApprove(ctx: Context, data: string, bot: Telegraf): Promise<void> {
  const requestId = data.replace('cb:join:approve:', '');
  await _decideRequest(ctx, requestId, 'APPROVED', bot);
}

export async function handleDeny(ctx: Context, data: string, bot: Telegraf): Promise<void> {
  const requestId = data.replace('cb:join:deny:', '');
  await _decideRequest(ctx, requestId, 'DENIED', bot);
}

async function _decideRequest(
  ctx: Context,
  requestId: string,
  decision: 'APPROVED' | 'DENIED',
  bot: Telegraf
): Promise<void> {
  const deciderId = ctx.from!.id;
  const request = await householdRepo.getJoinRequest(requestId);

  if (!request) {
    await ctx.answerCbQuery('Request not found.');
    return;
  }
  if (request.status !== 'PENDING') {
    await ctx.answerCbQuery('This request has already been decided.');
    await ctx.editMessageReplyMarkup(undefined);
    return;
  }

  const household = await householdRepo.getById(request.household_id);
  if (!household || household.owner_telegram_id !== deciderId) {
    await ctx.answerCbQuery('Only the household owner can decide join requests.');
    return;
  }

  await householdRepo.decideJoinRequest(requestId, decision, deciderId);

  const requester = await userRepo.getById(request.requester_telegram_id);
  const requesterRef = requester?.username
    ? `@${requester.username}`
    : requester?.first_name ?? String(request.requester_telegram_id);

  if (decision === 'APPROVED') {
    await householdRepo.addMember(household.id, request.requester_telegram_id);
    await ctx.answerCbQuery('Approved!');
    await ctx.editMessageText(
      `✅ ${requesterRef} has been added to *${household.name}*.`,
      { parse_mode: 'Markdown' }
    );
    await notifyUser(
      bot,
      request.requester_telegram_id,
      `🎉 Your request to join *${household.name}* has been *approved*\\! You are now a member.`,
      ctx
    );
  } else {
    await ctx.answerCbQuery('Denied.');
    await ctx.editMessageText(
      `❌ ${requesterRef}'s request to join *${household.name}* was denied.`,
      { parse_mode: 'Markdown' }
    );
    await notifyUser(
      bot,
      request.requester_telegram_id,
      `😞 Your request to join *${household.name}* was denied by the owner.`,
      ctx
    );
  }
}
