import { Context } from 'telegraf';
import { Telegraf } from 'telegraf';
import { pendingActionRepo } from '../db/repos/pendingActionRepo';
import { userRepo } from '../db/repos/userRepo';
import { classifyIntent } from '../llm/provider';
import { buildMessages } from '../llm/prompt';
import * as logExpenseFlow from './logExpense';
import * as logPaymentFlow from './logPayment';
import { t, getLang } from '../i18n';
import type { ProofInfo } from '../types';
import type { LogExpenseIntent, LogPaymentIntent } from '../llm/schemas';

export async function handleAttachment(
  ctx: Context,
  proof: ProofInfo,
  caption: string | undefined,
  bot: Telegraf
): Promise<void> {
  const telegramId = ctx.from!.id;
  const lang = getLang(ctx);

  // 1. Is there a pending AWAITING_PROOF state for this user?
  const pending = await pendingActionRepo.getActive(telegramId);
  if (pending?.type === 'AWAITING_PROOF') {
    await pendingActionRepo.markUsed(pending.id);
    const savedData = JSON.parse(pending.payload_json) as {
      intent: 'LOG_EXPENSE' | 'LOG_PAYMENT';
      data: LogExpenseIntent | LogPaymentIntent;
      householdId: string;
    };

    if (savedData.intent === 'LOG_EXPENSE') {
      await logExpenseFlow.proceedWithProof(
        ctx,
        { data: savedData.data as LogExpenseIntent, householdId: savedData.householdId },
        proof
      );
    } else if (savedData.intent === 'LOG_PAYMENT') {
      await logPaymentFlow.proceedWithProof(
        ctx,
        { data: savedData.data as LogPaymentIntent, householdId: savedData.householdId },
        proof
      );
    }
    return;
  }

  // 2. Classify the caption (if any) via LLM
  if (caption) {
    await userRepo.upsert({
      telegramId,
      username: ctx.from?.username ?? null,
      firstName: ctx.from?.first_name ?? '',
      lastName: ctx.from?.last_name ?? null,
    });

    const messages = await buildMessages(telegramId, caption);
    const intent = await classifyIntent(messages);

    if (intent.intent === 'LOG_EXPENSE') {
      await logExpenseFlow.handle(ctx, intent, proof);
    } else if (intent.intent === 'LOG_PAYMENT') {
      await logPaymentFlow.handle(ctx, intent, proof);
    } else {
      await ctx.reply(t(lang, 'attachmentNoCaption'));
    }
    return;
  }

  // 3. No pending state, no caption
  await ctx.reply(t(lang, 'attachmentUnknown'), { parse_mode: 'Markdown' });
}
