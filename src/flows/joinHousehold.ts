import { Context } from 'telegraf';
import { Telegraf } from 'telegraf';
import { householdRepo } from '../db/repos/householdRepo';
import { userRepo } from '../db/repos/userRepo';
import { joinRequestKeyboard } from '../bot/keyboards/joinKeyboard';
import { notifyUser } from '../utils/notify';
import { escapeMd } from '../domain/money';
import { t, getLang } from '../i18n';

export async function handleJoinByCode(ctx: Context, code: string, bot: Telegraf): Promise<void> {
  const telegramId = ctx.from!.id;
  const lang = getLang(ctx);
  const upperCode = code.toUpperCase();

  const household = await householdRepo.getByJoinCode(upperCode);
  if (!household) {
    await ctx.reply(t(lang, 'joinInvalidCode', { code: upperCode }), { parse_mode: 'Markdown' });
    return;
  }

  const existing = await householdRepo.getMembership(household.id, telegramId);
  if (existing?.status === 'ACTIVE') {
    await ctx.reply(t(lang, 'alreadyMember', { householdName: escapeMd(household.name) }), {
      parse_mode: 'Markdown',
    });
    return;
  }
  if (existing?.status === 'KICKED') {
    await ctx.reply(t(lang, 'kickedCannotRejoin', { householdName: escapeMd(household.name) }), {
      parse_mode: 'Markdown',
    });
    return;
  }

  const existingReq = await householdRepo.getPendingJoinRequest(household.id, telegramId);
  if (existingReq) {
    await ctx.reply(
      t(lang, 'pendingRequestExists', { householdName: escapeMd(household.name) }),
      { parse_mode: 'Markdown' }
    );
    return;
  }

  const requestId = await householdRepo.createJoinRequest(household.id, telegramId);
  await ctx.reply(
    t(lang, 'joinRequestSent', { householdName: escapeMd(household.name) }),
    { parse_mode: 'Markdown' }
  );

  const requester = await userRepo.getById(telegramId);
  const requesterRef = escapeMd(
    requester?.username ? `@${requester.username}` : requester?.first_name ?? `user ${telegramId}`
  );
  const householdName = escapeMd(household.name);

  const owner = await userRepo.getById(household.owner_telegram_id);
  const ownerLang = (owner?.language as import('../i18n').Lang | null) ?? null;

  const ownerMessage = t(ownerLang, 'joinRequestReceived', {
    requester: requesterRef,
    householdName,
  });

  try {
    await bot.telegram.sendMessage(household.owner_telegram_id, ownerMessage, {
      parse_mode: 'Markdown',
      reply_markup: joinRequestKeyboard(requestId),
    });
  } catch {
    await ctx.reply(t(lang, 'ownerNotNotified'));
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
  const lang = getLang(ctx);
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

  const requesterLang = (requester?.language as import('../i18n').Lang | null) ?? null;
  const householdName = escapeMd(household.name);

  if (decision === 'APPROVED') {
    await householdRepo.addMember(household.id, request.requester_telegram_id);
    await ctx.answerCbQuery('Approved!');
    await ctx.editMessageText(
      t(lang, 'memberApproved', { member: requesterRef, householdName }),
      { parse_mode: 'Markdown' }
    );
    await notifyUser(
      bot,
      request.requester_telegram_id,
      t(requesterLang, 'approvalNotify', { householdName }),
      ctx
    );
  } else {
    await ctx.answerCbQuery('Denied.');
    await ctx.editMessageText(
      t(lang, 'memberDenied', { member: requesterRef, householdName }),
      { parse_mode: 'Markdown' }
    );
    await notifyUser(
      bot,
      request.requester_telegram_id,
      t(requesterLang, 'denialNotify', { householdName }),
      ctx
    );
  }
}

