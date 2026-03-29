import { Context } from 'telegraf';
import { Telegraf } from 'telegraf';
import { pendingActionRepo } from '../db/repos/pendingActionRepo';
import { executeExpense } from './logExpense';
import { executePayment } from './logPayment';
import { t, getLang } from '../i18n';
import type { ProofInfo, BmAwaitingProofPayload, ConfirmExpensePayload, ConfirmPaymentPayload } from '../types';

export async function handleAttachment(
  ctx: Context,
  proof: ProofInfo,
  caption: string | undefined,
  bot: Telegraf
): Promise<void> {
  const telegramId = ctx.from!.id;
  const lang = getLang(ctx);

  const pending = await pendingActionRepo.getActive(telegramId);

  if (pending?.type === 'BM_AWAITING_PROOF') {
    await pendingActionRepo.markUsed(pending.id);
    const data = JSON.parse(pending.payload_json) as BmAwaitingProofPayload;

    if (data.flow === 'EXPENSE') {
      const fullPayload: ConfirmExpensePayload = {
        ...(data.confirmPayload as Omit<ConfirmExpensePayload, 'proofFileId' | 'proofFileUniqueId'>),
        proofFileId: proof.fileId,
        proofFileUniqueId: proof.fileUniqueId,
      };
      await executeExpense(ctx, fullPayload, bot);
    } else if (data.flow === 'PAYMENT') {
      const fullPayload: ConfirmPaymentPayload = {
        ...(data.confirmPayload as Omit<ConfirmPaymentPayload, 'proofFileId' | 'proofFileUniqueId'>),
        proofFileId: proof.fileId,
        proofFileUniqueId: proof.fileUniqueId,
      };
      await executePayment(ctx, fullPayload, bot);
    }
    return;
  }

  // No pending proof state — remind user to use the buttons
  await ctx.reply(t(lang, 'awaitingProofReminder'));
}
