import { Context } from 'telegraf';
import { Telegraf } from 'telegraf';
import { householdRepo } from '../../db/repos/householdRepo';
import { userRepo } from '../../db/repos/userRepo';
import { pendingActionRepo, PendingAction } from '../../db/repos/pendingActionRepo';
import { confirmKeyboard } from '../keyboards/confirmKeyboard';
import { toCents, formatMoney, escapeMd } from '../../domain/money';
import { displayName } from '../../domain/displayName';
import { splitEvenly } from '../../domain/splits';
import { t, getLang } from '../../i18n';
import type { BmExpensePayload, ConfirmExpensePayload, SplitEntry, BmAwaitingProofPayload } from '../../types';

type MemberRow = {
  telegram_id: number;
  username: string | null;
  first_name: string;
  last_name: string | null;
  nickname?: string | null;
};

export async function start(ctx: Context, telegramId: number, householdId: string): Promise<void> {
  const lang = getLang(ctx);
  const household = await householdRepo.getById(householdId);
  if (!household) return;

  const payload: BmExpensePayload = {
    householdId,
    householdName: household.name,
    currency: household.currency_default,
  };

  await pendingActionRepo.create(telegramId, 'BM_EXPENSE_DESC', payload);
  await ctx.reply(t(lang, 'descPrompt'));
}

export async function onDesc(ctx: Context, text: string, action: PendingAction): Promise<void> {
  const lang = getLang(ctx);
  const payload = JSON.parse(action.payload_json) as BmExpensePayload;
  payload.description = text;
  await pendingActionRepo.updateTypeAndPayload(action.id, 'BM_EXPENSE_AMOUNT', payload);
  await ctx.reply(t(lang, 'amountPrompt'));
}

export async function onAmount(ctx: Context, text: string, action: PendingAction): Promise<void> {
  const lang = getLang(ctx);
  const amount = parseFloat(text.replace(',', '.'));
  if (isNaN(amount) || amount <= 0) {
    await ctx.reply('⚠️ Invalid amount. ' + t(lang, 'amountPrompt'));
    return;
  }

  const payload = JSON.parse(action.payload_json) as BmExpensePayload;
  payload.totalCents = toCents(amount);

  // Show split type picker
  await pendingActionRepo.updatePayload(action.id, payload);
  await ctx.reply(t(lang, 'splitTypePick'), {
    reply_markup: {
      inline_keyboard: [
        [
          { text: t(lang, 'splitEvenBtn'), callback_data: `bm:split:${action.id}:even` },
          { text: t(lang, 'splitCustomBtn'), callback_data: `bm:split:${action.id}:custom` },
        ],
      ],
    },
  });
}

export async function onSplitType(
  ctx: Context,
  type: 'even' | 'custom',
  pendingId: string
): Promise<void> {
  const lang = getLang(ctx);
  const action = await pendingActionRepo.getById(pendingId);
  if (!action || action.used_at !== null) {
    await ctx.answerCbQuery('Session expired.');
    return;
  }

  const payload = JSON.parse(action.payload_json) as BmExpensePayload;
  const telegramId = ctx.from!.id;

  const allMembers = await householdRepo.getActiveMembers(payload.householdId) as MemberRow[];
  const otherMembers = allMembers.filter((m) => m.telegram_id !== telegramId);

  await ctx.answerCbQuery();

  if (type === 'even') {
    payload.splitType = 'EVEN';
    // Pre-select everyone including the payer (user can uncheck themselves to treat)
    payload.selectedMembers = allMembers.map((m) => m.telegram_id);
    await pendingActionRepo.updateTypeAndPayload(action.id, 'BM_EXPENSE_MEMBERS', payload);

    // Show member toggle keyboard with all members (including payer)
    await ctx.editMessageText(t(lang, 'membersPick'), {
      parse_mode: 'Markdown',
      reply_markup: buildMemberToggleKeyboard(allMembers, payload.selectedMembers, pendingId, telegramId),
    });
  } else {
    payload.splitType = 'CUSTOM';
    payload.memberIds = otherMembers.map((m) => m.telegram_id);
    payload.customAmounts = {};
    payload.currentIndex = 0;
    await pendingActionRepo.updateTypeAndPayload(action.id, 'BM_EXPENSE_CUSTOM_AMOUNT', payload);

    if (otherMembers.length === 0) {
      await ctx.editMessageText('No other members in this household.');
      return;
    }
    const firstMember = otherMembers[0];
    const memberName = escapeMd(displayName(firstMember as { nickname?: string | null; username?: string | null; first_name: string }));
    await ctx.editMessageText(t(lang, 'customAmountPrompt', { member: memberName }), { parse_mode: 'Markdown' });
  }
}

export async function onMemberToggle(
  ctx: Context,
  userId: number,
  pendingId: string
): Promise<void> {
  const lang = getLang(ctx);
  const action = await pendingActionRepo.getById(pendingId);
  if (!action || action.used_at !== null) {
    await ctx.answerCbQuery('Session expired.');
    return;
  }

  const payload = JSON.parse(action.payload_json) as BmExpensePayload;
  const selected = payload.selectedMembers ?? [];

  const idx = selected.indexOf(userId);
  if (idx >= 0) {
    selected.splice(idx, 1);
  } else {
    selected.push(userId);
  }
  payload.selectedMembers = selected;
  await pendingActionRepo.updatePayload(action.id, payload);

  const telegramId = ctx.from!.id;
  const allMembers = await householdRepo.getActiveMembers(payload.householdId) as MemberRow[];

  await ctx.answerCbQuery();
  await ctx.editMessageReplyMarkup(buildMemberToggleKeyboard(allMembers, selected, pendingId, telegramId));
}

export async function onMembersDone(ctx: Context, pendingId: string, bot: Telegraf): Promise<void> {
  const lang = getLang(ctx);
  const action = await pendingActionRepo.getById(pendingId);
  if (!action || action.used_at !== null) {
    await ctx.answerCbQuery('Session expired.');
    return;
  }

  const payload = JSON.parse(action.payload_json) as BmExpensePayload;
  const selected = payload.selectedMembers ?? [];

  if (selected.length === 0) {
    await ctx.answerCbQuery('Select at least one member.');
    return;
  }

  const telegramId = ctx.from!.id;
  const allMembers = await householdRepo.getActiveMembers(payload.householdId) as MemberRow[];
  const otherMembers = allMembers.filter((m) => m.telegram_id !== telegramId);
  const payer = allMembers.find((m) => m.telegram_id === telegramId)!;

  const selectedOthers = otherMembers.filter((m) => selected.includes(m.telegram_id));
  const payerIsSelected = selected.includes(telegramId);

  // If payer is checked: split total among payer + selectedOthers (each pays total/n)
  // If payer is unchecked: split total only among selectedOthers (payer treats)
  const allForSplit = payerIsSelected ? [payer, ...selectedOthers] : selectedOthers;
  const splitResults = splitEvenly(payload.totalCents!, allForSplit.map((m) => ({
    telegramId: m.telegram_id,
    username: m.username ?? null,
    firstName: m.first_name,
  })));
  const splits: SplitEntry[] = splitResults.filter((s) => s.telegramId !== telegramId);

  await ctx.answerCbQuery();
  await showExpensePreview(ctx, action.id, payload, splits, lang);
}

export async function onCustomAmount(
  ctx: Context,
  text: string,
  action: PendingAction
): Promise<void> {
  const lang = getLang(ctx);
  const payload = JSON.parse(action.payload_json) as BmExpensePayload;
  const telegramId = ctx.from!.id;

  const amount = parseFloat(text.replace(',', '.'));
  if (isNaN(amount) || amount < 0) {
    await ctx.reply('⚠️ Invalid amount. Please enter a number.');
    return;
  }

  const allMembers = await householdRepo.getActiveMembers(payload.householdId) as MemberRow[];
  const otherMembers = allMembers.filter((m) => m.telegram_id !== telegramId);

  const memberIds = payload.memberIds ?? otherMembers.map((m) => m.telegram_id);
  const currentIndex = payload.currentIndex ?? 0;
  const currentMemberId = memberIds[currentIndex];

  payload.customAmounts = payload.customAmounts ?? {};
  payload.customAmounts[String(currentMemberId)] = toCents(amount);

  const nextIndex = currentIndex + 1;

  if (nextIndex < memberIds.length) {
    payload.currentIndex = nextIndex;
    await pendingActionRepo.updatePayload(action.id, payload);
    const nextMember = otherMembers.find((m) => m.telegram_id === memberIds[nextIndex]);
    const memberName = nextMember ? escapeMd(displayName(nextMember as { nickname?: string | null; username?: string | null; first_name: string })) : `member ${nextIndex + 1}`;
    await ctx.reply(t(lang, 'customAmountPrompt', { member: memberName }), { parse_mode: 'Markdown' });
  } else {
    // All collected — validate sum <= total
    const totalAssigned = Object.values(payload.customAmounts).reduce((a, b) => a + b, 0);
    if (totalAssigned > payload.totalCents!) {
      await ctx.reply(`⚠️ Custom amounts sum (${formatMoney(totalAssigned, payload.currency)}) exceeds total (${formatMoney(payload.totalCents!, payload.currency)}). Please re-enter amounts.`);
      // Reset
      payload.customAmounts = {};
      payload.currentIndex = 0;
      await pendingActionRepo.updatePayload(action.id, payload);
      const firstMember = otherMembers.find((m) => m.telegram_id === memberIds[0]);
      const memberName = firstMember ? escapeMd(displayName(firstMember as { nickname?: string | null; username?: string | null; first_name: string })) : 'first member';
      await ctx.reply(t(lang, 'customAmountPrompt', { member: memberName }), { parse_mode: 'Markdown' });
      return;
    }

    // Build splits
    const splits: SplitEntry[] = memberIds.map((id) => {
      const member = otherMembers.find((m) => m.telegram_id === id)!;
      return {
        telegramId: id,
        username: member?.username ?? null,
        firstName: member?.first_name ?? `user ${id}`,
        amountCents: payload.customAmounts![String(id)] ?? 0,
      };
    }).filter((s) => s.amountCents > 0);

    await showExpensePreview(ctx, action.id, payload, splits, lang);
  }
}

async function showExpensePreview(
  ctx: Context,
  actionId: string,
  payload: BmExpensePayload,
  splits: SplitEntry[],
  lang: ReturnType<typeof getLang>
): Promise<void> {
  const splitLines = splits
    .map((s) => {
      const ref = escapeMd(s.username ? `@${s.username}` : s.firstName);
      return t(lang, 'expenseSplitLine', {
        member: ref,
        amount: formatMoney(s.amountCents, payload.currency),
      });
    })
    .join('\n');

  const preview = t(lang, 'expensePreview', {
    description: escapeMd(payload.description!),
    amount: formatMoney(payload.totalCents!, payload.currency),
    householdName: escapeMd(payload.householdName),
    splits: splitLines,
  });

  const confirmPayload: Omit<ConfirmExpensePayload, 'proofFileId' | 'proofFileUniqueId'> = {
    flow: 'EXPENSE',
    actorId: ctx.from!.id,
    householdId: payload.householdId,
    householdName: payload.householdName,
    description: payload.description!,
    currency: payload.currency,
    amountCentsTotal: payload.totalCents!,
    splits,
    isLlm: false,
  };

  const bmProofPayload: BmAwaitingProofPayload = {
    flow: 'EXPENSE',
    confirmPayload,
  };

  // Mark old action used, create BM_AWAITING_PROOF
  await pendingActionRepo.markUsed(actionId);
  const telegramId = ctx.from!.id;
  await pendingActionRepo.create(telegramId, 'BM_AWAITING_PROOF', bmProofPayload);

  await ctx.reply(preview + '\n\n' + t(lang, 'proofPrompt'), { parse_mode: 'Markdown' });
}

function buildMemberToggleKeyboard(
  members: MemberRow[],
  selected: number[],
  pendingId: string,
  payerTelegramId?: number
): { inline_keyboard: Array<Array<{ text: string; callback_data: string }>> } {
  const rows = members.map((m) => {
    const isSelected = selected.includes(m.telegram_id);
    const isPayer = m.telegram_id === payerTelegramId;
    const name = displayName(m as { nickname?: string | null; username?: string | null; first_name: string });
    const label = isPayer ? `${name} (you)` : name;
    return [
      {
        text: (isSelected ? '✅ ' : '☐ ') + label,
        callback_data: `bm:toggle:${pendingId}:${m.telegram_id}`,
      },
    ];
  });
  rows.push([{ text: '✅ Done', callback_data: `bm:done:${pendingId}` }]);
  return { inline_keyboard: rows };
}
