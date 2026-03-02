import { Context } from 'telegraf';
import { Telegraf } from 'telegraf';
import { householdRepo } from '../db/repos/householdRepo';
import { transactionRepo } from '../db/repos/transactionRepo';
import { debtRepo } from '../db/repos/debtRepo';
import { pendingActionRepo } from '../db/repos/pendingActionRepo';
import { userRepo } from '../db/repos/userRepo';
import { confirmKeyboard } from '../bot/keyboards/confirmKeyboard';
import { householdSelectionKeyboard } from '../bot/keyboards/householdKeyboard';
import { splitEvenly, splitByAmounts, splitByPercentages } from '../domain/splits';
import { toCents, formatMoney, escapeMd } from '../domain/money';
import { notifyUser } from '../utils/notify';
import type { LogExpenseIntent } from '../llm/schemas';
import type { ProofInfo, SplitEntry, ConfirmExpensePayload } from '../types';

export async function handle(
  ctx: Context,
  intent: LogExpenseIntent,
  proof: ProofInfo | null,
  householdId?: string
): Promise<void> {
  const telegramId = ctx.from!.id;

  // 1. Resolve household
  const hId = householdId ?? (await resolveHousehold(ctx, telegramId, intent, proof));
  if (!hId) return; // asked user to select

  // 2. Verify membership
  const membership = await householdRepo.getMembership(hId, telegramId);
  if (!membership || membership.status !== 'ACTIVE') {
    await ctx.reply('You are not an active member of that household.');
    return;
  }

  const household = await householdRepo.getById(hId);
  if (!household) return;
  const currency = (intent.currency ?? household.currency_default).toUpperCase();

  // 3. Resolve participants
  const allMembers = await householdRepo.getActiveMembers(hId);
  const otherMembers = allMembers.filter((m) => m.telegram_id !== telegramId);
  const payer = allMembers.find((m) => m.telegram_id === telegramId)!;

  const resolvedParticipants = await resolveParticipants(
    ctx,
    intent.participants,
    otherMembers
  );
  if (!resolvedParticipants) return; // couldn't resolve

  // 4. Calculate splits
  const totalCents = toCents(intent.amount);
  let splits: SplitEntry[];

  try {
    splits = calcSplits(intent, totalCents, resolvedParticipants, payer);
  } catch (e: unknown) {
    await ctx.reply(`Split error: ${(e as Error).message}`);
    return;
  }

  // 5. Require proof
  if (!proof) {
    await pendingActionRepo.create(telegramId, 'AWAITING_PROOF', {
      intent: 'LOG_EXPENSE',
      data: intent,
      householdId: hId,
    });
    await ctx.reply(
      '🧾 Got it! Please send your *invoice or receipt* as a photo or document.',
      { parse_mode: 'Markdown' }
    );
    return;
  }

  // 6. Show preview + confirm
  await showPreview(ctx, {
    actorId: telegramId,
    householdId: hId,
    householdName: household.name,
    description: intent.description,
    currency,
    amountCentsTotal: totalCents,
    splits,
    proofFileId: proof.fileId,
    proofFileUniqueId: proof.fileUniqueId,
  });
}

export async function proceedWithProof(
  ctx: Context,
  savedData: { data: LogExpenseIntent; householdId: string },
  proof: ProofInfo
): Promise<void> {
  await handle(ctx, savedData.data, proof, savedData.householdId);
}

async function showPreview(
  ctx: Context,
  payload: Omit<ConfirmExpensePayload, 'flow'>
): Promise<void> {
  const telegramId = ctx.from!.id;
  const splitLines = payload.splits
    .map((s) => {
      const ref = escapeMd(s.username ? `@${s.username}` : s.firstName);
      return `  • ${ref} owes you ${formatMoney(s.amountCents, payload.currency)}`;
    })
    .join('\n');

  const preview =
    `📋 *Expense Preview*\n\n` +
    `Description: *${payload.description}*\n` +
    `Total: *${formatMoney(payload.amountCentsTotal, payload.currency)}*\n` +
    `Household: *${payload.householdName}*\n\n` +
    `*Debts to be created:*\n${splitLines}`;

  const fullPayload: ConfirmExpensePayload = { flow: 'EXPENSE', ...payload };
  const pending = await pendingActionRepo.create(telegramId, 'AWAITING_CONFIRM', fullPayload);

  await ctx.reply(preview, {
    parse_mode: 'Markdown',
    reply_markup: confirmKeyboard(pending.id, pending.token),
  });
}

export async function executeExpense(
  ctx: Context,
  payload: ConfirmExpensePayload,
  bot: Telegraf
): Promise<void> {
  // Write transaction
  await transactionRepo.create({
    householdId: payload.householdId,
    actorTelegramId: payload.actorId,
    type: 'EXPENSE',
    description: payload.description,
    currency: payload.currency,
    amountCentsTotal: payload.amountCentsTotal,
    payloadJson: JSON.stringify(payload.splits),
    proofFileId: payload.proofFileId,
    proofFileUniqueId: payload.proofFileUniqueId,
  });

  // Update debts ledger
  for (const split of payload.splits) {
    await debtRepo.addDebt(
      payload.householdId,
      split.telegramId,
      payload.actorId,
      split.amountCents
    );
  }

  // Notify debtors
  const actor = await userRepo.getById(payload.actorId);
  const actorRef = escapeMd(actor?.username ? `@${actor.username}` : actor?.first_name ?? 'Someone');

  for (const split of payload.splits) {
    await notifyUser(
      bot,
      split.telegramId,
      `💸 You owe ${actorRef} *${formatMoney(split.amountCents, payload.currency)}* for *${payload.description}* (Household: ${payload.householdName})`,
      ctx
    );
    try {
      await bot.telegram.sendPhoto(split.telegramId, payload.proofFileId, {
        caption: `Receipt for: ${payload.description}`,
      });
    } catch {
      // Silently skip — user may not have started the bot
    }
  }

  await ctx.editMessageText(
    `✅ Expense recorded!\n\n` +
      `*${payload.description}* — ${formatMoney(payload.amountCentsTotal, payload.currency)}\n` +
      `${payload.splits.length} debt(s) created.`,
    { parse_mode: 'Markdown' }
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function resolveHousehold(
  ctx: Context,
  telegramId: number,
  intent: LogExpenseIntent,
  proof: ProofInfo | null
): Promise<string | null> {
  const households = await householdRepo.getActiveHouseholdsForUser(telegramId);
  if (households.length === 0) {
    await ctx.reply('You are not in any household. Create or join one first.');
    return null;
  }
  if (households.length === 1) return households[0].id;

  // Try to match hint
  if (intent.household_hint) {
    const hint = intent.household_hint.toLowerCase();
    const match = households.filter((h) => h.name.toLowerCase().includes(hint));
    if (match.length === 1) return match[0].id;
  }

  // Need to ask
  const pending = await pendingActionRepo.create(telegramId, 'AWAITING_HOUSEHOLD', {
    intent: 'LOG_EXPENSE',
    data: intent,
    proof,
  });

  await ctx.reply('Which household is this for?', {
    reply_markup: householdSelectionKeyboard(households, pending.id),
  });
  return null;
}

async function resolveParticipants(
  ctx: Context,
  rawParticipants: LogExpenseIntent['participants'],
  members: Array<{ telegram_id: number; username: string | null; first_name: string; last_name: string | null }>
) {
  const resolved: Array<{
    telegramId: number;
    username: string | null;
    firstName: string;
    amount?: number;
    percentage?: number;
  }> = [];

  for (const p of rawParticipants) {
    const ident = p.identifier.replace(/^@/, '').toLowerCase();
    const match = members.find(
      (m) =>
        m.username?.toLowerCase() === ident ||
        m.first_name.toLowerCase() === ident ||
        (m.first_name + ' ' + (m.last_name ?? '')).toLowerCase().trim() === ident
    );
    if (!match) {
      await ctx.reply(
        `❓ I couldn't find member "${p.identifier}" in this household. Use their @username or exact first name.`
      );
      return null;
    }
    resolved.push({
      telegramId: match.telegram_id,
      username: match.username,
      firstName: match.first_name,
      amount: p.amount,
      percentage: p.percentage,
    });
  }
  return resolved;
}

function calcSplits(
  intent: LogExpenseIntent,
  totalCents: number,
  participants: Array<{ telegramId: number; username: string | null; firstName: string; amount?: number; percentage?: number }>,
  payer: { telegram_id: number; username: string | null; first_name: string }
): SplitEntry[] {
  switch (intent.split_type) {
    case 'EVEN_INCLUDING_PAYER': {
      const all = [
        { telegramId: payer.telegram_id, username: payer.username, firstName: payer.first_name },
        ...participants,
      ];
      const even = splitEvenly(totalCents, all);
      // Only the non-payer entries become debts
      return even.filter((s) => s.telegramId !== payer.telegram_id);
    }
    case 'EVEN_EXCLUDING_PAYER': {
      return splitEvenly(totalCents, participants);
    }
    case 'CUSTOM': {
      // Try amounts first
      if (participants.every((p) => p.amount !== undefined)) {
        const result = splitByAmounts(totalCents, participants as Parameters<typeof splitByAmounts>[1]);
        if (!result) throw new Error('Custom amounts exceed the total expense amount.');
        return result;
      }
      // Try percentages
      if (participants.every((p) => p.percentage !== undefined)) {
        const result = splitByPercentages(totalCents, participants as Parameters<typeof splitByPercentages>[1]);
        if (!result) throw new Error('Percentages must sum to 100.');
        return result;
      }
      throw new Error('For CUSTOM split, all participants must have either an amount or a percentage.');
    }
  }
}
