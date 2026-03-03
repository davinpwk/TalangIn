import { Context } from 'telegraf';
import { Telegraf } from 'telegraf';
import { householdRepo } from '../db/repos/householdRepo';
import { pendingActionRepo } from '../db/repos/pendingActionRepo';
import { userRepo } from '../db/repos/userRepo';
import { confirmKeyboard } from '../bot/keyboards/confirmKeyboard';
import { householdSelectionKeyboard } from '../bot/keyboards/householdKeyboard';
import { notifyUser } from '../utils/notify';
import { escapeMd } from '../domain/money';
import { t, getLang } from '../i18n';
import type { BroadcastIntent } from '../llm/schemas';
import type { ConfirmBroadcastPayload } from '../types';

export async function handle(ctx: Context, intent: BroadcastIntent, householdId?: string): Promise<void> {
  const telegramId = ctx.from!.id;
  const lang = getLang(ctx);

  // 1. Resolve household
  const hId = householdId ?? (await resolveHousehold(ctx, telegramId, intent, lang));
  if (!hId) return;

  const membership = await householdRepo.getMembership(hId, telegramId);
  if (!membership || membership.status !== 'ACTIVE') {
    await ctx.reply(t(lang, 'notActiveMember'));
    return;
  }

  const household = await householdRepo.getById(hId);
  if (!household) return;

  // 2. Resolve recipients (all active members except sender)
  const allMembers = await householdRepo.getActiveMembers(hId);
  const recipients = allMembers.filter((m) => m.telegram_id !== telegramId);

  if (recipients.length === 0) {
    await ctx.reply(t(lang, 'broadcastNoMembers'));
    return;
  }

  // 3. Show preview + confirm
  const escapedMsg = escapeMd(intent.message);
  const preview = t(lang, 'broadcastPreview', {
    householdName: escapeMd(household.name),
    count: String(recipients.length),
    message: escapedMsg,
  });

  const broadcastPayload: ConfirmBroadcastPayload = {
    flow: 'BROADCAST',
    actorId: telegramId,
    householdId: hId,
    householdName: household.name,
    message: intent.message,
    recipientIds: recipients.map((m) => m.telegram_id),
  };

  const pending = await pendingActionRepo.create(telegramId, 'AWAITING_CONFIRM', broadcastPayload);

  await ctx.reply(preview, {
    parse_mode: 'Markdown',
    reply_markup: confirmKeyboard(pending.id, pending.token),
  });
}

export async function executeBroadcast(
  ctx: Context,
  payload: ConfirmBroadcastPayload,
  bot: Telegraf
): Promise<void> {
  const actor = await userRepo.getById(payload.actorId);
  const actorRef = escapeMd(actor?.username ? `@${actor.username}` : actor?.first_name ?? 'Someone');

  let sent = 0;
  for (const recipientId of payload.recipientIds) {
    await notifyUser(
      bot,
      recipientId,
      t(null, 'broadcastReceived', {
        sender: actorRef,
        householdName: escapeMd(payload.householdName),
        message: payload.message,
      }),
      ctx
    );
    sent++;
  }

  await ctx.editMessageText(
    t(null, 'broadcastConfirmed', { count: String(sent) }),
    { parse_mode: 'Markdown' }
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function resolveHousehold(
  ctx: Context,
  telegramId: number,
  intent: BroadcastIntent,
  lang: ReturnType<typeof getLang>
): Promise<string | null> {
  const households = await householdRepo.getActiveHouseholdsForUser(telegramId);
  if (households.length === 0) {
    await ctx.reply(t(lang, 'notInHousehold'));
    return null;
  }
  if (households.length === 1) return households[0].id;

  if (intent.household_hint) {
    const hint = intent.household_hint.toLowerCase();
    const match = households.filter((h) => h.name.toLowerCase().includes(hint));
    if (match.length === 1) return match[0].id;
  }

  const pending = await pendingActionRepo.create(telegramId, 'AWAITING_HOUSEHOLD', {
    intent: 'BROADCAST',
    data: intent,
    proof: null,
  });

  await ctx.reply(t(lang, 'selectBroadcastHousehold'), {
    reply_markup: householdSelectionKeyboard(households, pending.id),
  });
  return null;
}
