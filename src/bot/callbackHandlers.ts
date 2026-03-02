import { Context } from 'telegraf';
import { Telegraf } from 'telegraf';
import { pendingActionRepo } from '../db/repos/pendingActionRepo';
import { householdRepo } from '../db/repos/householdRepo';
import { logger } from '../utils/logger';
import { executeExpense } from '../flows/logExpense';
import { executePayment } from '../flows/logPayment';
import { executeKick } from '../flows/kickMember';
import * as joinFlow from '../flows/joinHousehold';
import * as viewBalancesFlow from '../flows/viewBalances';
import type { ConfirmPayload, ConfirmExpensePayload, ConfirmPaymentPayload, ConfirmKickPayload, AwaitingHouseholdPayload } from '../types';
import type { LogExpenseIntent, LogPaymentIntent } from '../llm/schemas';
import * as logExpenseFlow from '../flows/logExpense';
import * as logPaymentFlow from '../flows/logPayment';

export async function handleCallback(ctx: Context, bot: Telegraf): Promise<void> {
  if (!ctx.callbackQuery || !('data' in ctx.callbackQuery)) {
    await ctx.answerCbQuery();
    return;
  }

  const data = ctx.callbackQuery.data;
  logger.debug({ data, userId: ctx.from?.id }, 'Callback received');

  try {
    if (data.startsWith('cb:join:approve:')) {
      await joinFlow.handleApprove(ctx, data, bot);
    } else if (data.startsWith('cb:join:deny:')) {
      await joinFlow.handleDeny(ctx, data, bot);
    } else if (data.startsWith('cb:confirm:')) {
      await handleConfirm(ctx, data, bot);
    } else if (data.startsWith('cb:cancel:')) {
      await handleCancel(ctx, data);
    } else if (data.startsWith('cb:hs:')) {
      await handleHouseholdSelect(ctx, data, bot);
    } else if (data.startsWith('cb:bal:')) {
      await viewBalancesFlow.handleHouseholdSelect(ctx, data);
    } else {
      await ctx.answerCbQuery('Unknown action.');
    }
  } catch (err) {
    logger.error({ err, data }, 'Error handling callback');
    await ctx.answerCbQuery('Something went wrong. Please try again.');
  }
}

async function handleConfirm(ctx: Context, data: string, bot: Telegraf): Promise<void> {
  // data = "cb:confirm:<id>:<token>"
  const parts = data.split(':');
  if (parts.length !== 4) {
    await ctx.answerCbQuery('Invalid confirmation data.');
    return;
  }
  const [, , id, token] = parts;

  const action = await pendingActionRepo.consume(id, token);
  if (!action) {
    await ctx.answerCbQuery('This confirmation has expired or was already used.');
    await ctx.editMessageReplyMarkup(undefined);
    return;
  }

  if (action.type !== 'AWAITING_CONFIRM') {
    await ctx.answerCbQuery('Invalid action type.');
    return;
  }

  const payload = JSON.parse(action.payload_json) as ConfirmPayload;
  await ctx.answerCbQuery('Processing...');

  switch (payload.flow) {
    case 'EXPENSE':
      await executeExpense(ctx, payload as ConfirmExpensePayload, bot);
      break;
    case 'PAYMENT':
      await executePayment(ctx, payload as ConfirmPaymentPayload, bot);
      break;
    case 'KICK':
      await executeKick(ctx, payload as ConfirmKickPayload, bot);
      break;
  }
}

async function handleCancel(ctx: Context, data: string): Promise<void> {
  // data = "cb:cancel:<id>"
  const id = data.replace('cb:cancel:', '');
  const action = await pendingActionRepo.getById(id);

  if (action && action.used_at === null) {
    await pendingActionRepo.markUsed(id);
  }

  await ctx.answerCbQuery('Cancelled.');
  await ctx.editMessageText('❌ Action cancelled.', { reply_markup: undefined });
}

async function handleHouseholdSelect(ctx: Context, data: string, bot: Telegraf): Promise<void> {
  // data = "cb:hs:<householdId>:<pendingActionId>"
  const parts = data.split(':');
  if (parts.length !== 4) {
    await ctx.answerCbQuery('Invalid data.');
    return;
  }
  const [, , householdId, pendingActionId] = parts;

  const action = await pendingActionRepo.getById(pendingActionId);
  if (!action || action.used_at !== null) {
    await ctx.answerCbQuery('This selection has expired.');
    await ctx.editMessageReplyMarkup(undefined);
    return;
  }

  // Verify the household is valid and user is still a member
  const membership = await householdRepo.getMembership(householdId, ctx.from!.id);
  if (!membership || membership.status !== 'ACTIVE') {
    await ctx.answerCbQuery('You are not a member of that household.');
    return;
  }

  await pendingActionRepo.markUsed(action.id);
  await ctx.answerCbQuery();
  await ctx.editMessageReplyMarkup(undefined);

  const saved = JSON.parse(action.payload_json) as AwaitingHouseholdPayload;

  if (saved.intent === 'LOG_EXPENSE') {
    await logExpenseFlow.handle(ctx, saved.data as LogExpenseIntent, saved.proof, householdId);
  } else if (saved.intent === 'LOG_PAYMENT') {
    await logPaymentFlow.handle(ctx, saved.data as LogPaymentIntent, saved.proof, householdId);
  }
}
