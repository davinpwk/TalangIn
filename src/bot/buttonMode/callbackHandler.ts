import { Context } from 'telegraf';
import { Telegraf } from 'telegraf';
import { userRepo } from '../../db/repos/userRepo';
import { pendingActionRepo } from '../../db/repos/pendingActionRepo';
import { executeExpense } from '../../flows/logExpense';
import { executePayment } from '../../flows/logPayment';
import { executeIOwe } from '../../flows/iOwe';
import { t, getLang } from '../../i18n';
import { handleHouseholdSelect, showHouseholdPicker, showAllDebts, showJoinCode, showKickPicker, showKickConfirm, executeKick, startCreateHousehold, startJoinHousehold, onCreateHouseholdCurrency } from './household';
import * as expenseWizard from './expenseWizard';
import * as paymentWizard from './paymentWizard';
import * as itemTrackerWizard from './itemTrackerWizard';
import * as settingsWizard from './settingsWizard';
import type { ConfirmIOwePayload } from '../../types';

/**
 * Handle all bm:* callback data from button mode
 */
export async function handleButtonModeCallback(
  ctx: Context,
  data: string,
  bot: Telegraf
): Promise<void> {
  const telegramId = ctx.from!.id;
  const lang = getLang(ctx);

  // bm:hs:<householdId>
  if (data.startsWith('bm:hs:')) {
    const householdId = data.slice('bm:hs:'.length);
    await handleHouseholdSelect(ctx, householdId);
    return;
  }

  // bm:hh:* — household management actions
  if (data === 'bm:hh:create') {
    await startCreateHousehold(ctx, telegramId);
    return;
  }
  if (data === 'bm:hh:join') {
    await startJoinHousehold(ctx, telegramId);
    return;
  }
  if (data === 'bm:hh:pick') {
    await ctx.answerCbQuery();
    await showHouseholdPicker(ctx, telegramId);
    return;
  }
  if (data === 'bm:hh:alldebt') {
    await showAllDebts(ctx, telegramId);
    return;
  }
  if (data === 'bm:hh:joincode') {
    await showJoinCode(ctx, telegramId);
    return;
  }
  if (data === 'bm:hh:kick') {
    await showKickPicker(ctx, telegramId);
    return;
  }
  if (data.startsWith('bm:hh:currency:')) {
    const currency = data.slice('bm:hh:currency:'.length);
    await onCreateHouseholdCurrency(ctx, currency);
    return;
  }

  // bm:kick:<memberId> / bm:kick:confirm:<memberId>
  if (data.startsWith('bm:kick:confirm:')) {
    const memberId = parseInt(data.slice('bm:kick:confirm:'.length));
    await executeKick(ctx, memberId, bot);
    return;
  }
  if (data.startsWith('bm:kick:')) {
    const memberId = parseInt(data.slice('bm:kick:'.length));
    await showKickConfirm(ctx, memberId);
    return;
  }

  // bm:split:<pendingId>:<type>
  if (data.startsWith('bm:split:')) {
    const parts = data.split(':');
    // bm:split:<pendingId>:<type>
    const pendingId = parts[2];
    const type = parts[3] as 'even' | 'custom';
    await expenseWizard.onSplitType(ctx, type, pendingId);
    return;
  }

  // bm:toggle:<pendingId>:<userId>
  if (data.startsWith('bm:toggle:')) {
    const parts = data.split(':');
    const pendingId = parts[2];
    const userId = parseInt(parts[3]);
    await expenseWizard.onMemberToggle(ctx, userId, pendingId);
    return;
  }

  // bm:done:<pendingId>
  if (data.startsWith('bm:done:')) {
    const pendingId = data.slice('bm:done:'.length);
    await expenseWizard.onMembersDone(ctx, pendingId, bot);
    return;
  }

  // bm:member:<pendingId>:<userId>
  if (data.startsWith('bm:member:')) {
    const parts = data.split(':');
    const pendingId = parts[2];
    const userId = parseInt(parts[3]);

    const action = await pendingActionRepo.getById(pendingId);
    if (!action || action.used_at !== null) {
      await ctx.answerCbQuery('Session expired.');
      return;
    }

    if (action.type === 'BM_PAYMENT_MEMBER') {
      await paymentWizard.onMemberSelect(ctx, userId, pendingId);
    } else if (action.type === 'BM_IOWE_CREDITOR') {
      // I Owe wizard uses bm:member too
      const { onCreditorSelect } = await import('./iOweWizard');
      await onCreditorSelect(ctx, userId, pendingId);
    }
    return;
  }

  // bm:full_pay:<pendingId>
  if (data.startsWith('bm:full_pay:')) {
    const pendingId = data.slice('bm:full_pay:'.length);
    await paymentWizard.onFullPay(ctx, pendingId);
    return;
  }

  // bm:custom_pay:<pendingId>
  if (data.startsWith('bm:custom_pay:')) {
    const pendingId = data.slice('bm:custom_pay:'.length);
    await paymentWizard.onCustomPay(ctx, pendingId);
    return;
  }

  // bm:item:<pendingId>:<itemId>
  if (data.startsWith('bm:item:')) {
    const parts = data.split(':');
    const pendingId = parts[2];
    const itemId = parts[3];

    const action = await pendingActionRepo.getById(pendingId);
    if (!action || action.used_at !== null) {
      await ctx.answerCbQuery('Session expired.');
      return;
    }

    const payload = JSON.parse(action.payload_json);
    const itemAction = payload.action as string;

    if (itemAction === 'log') {
      await itemTrackerWizard.onItemSelect(ctx, itemId, pendingId);
    } else if (itemAction === 'remove') {
      await itemTrackerWizard.onRemoveItem(ctx, itemId, pendingId);
    } else if (itemAction === 'reset') {
      await itemTrackerWizard.onResetItem(ctx, itemId, pendingId);
    }
    return;
  }

  // bm:item_manage:<action>:<_>
  if (data.startsWith('bm:item_manage:')) {
    const parts = data.split(':');
    const action = parts[2];
    const user = await userRepo.getById(telegramId);
    const householdId = user?.active_household_id;
    if (!householdId) {
      await ctx.answerCbQuery('No active household.');
      return;
    }

    switch (action) {
      case 'view':
        await itemTrackerWizard.showCounts(ctx, householdId);
        break;
      case 'log':
        await itemTrackerWizard.showLogUsage(ctx, telegramId, householdId);
        break;
      case 'manage':
        await itemTrackerWizard.showManageMenu(ctx, telegramId, householdId);
        break;
      case 'add':
        await itemTrackerWizard.startAddItem(ctx, telegramId, householdId);
        break;
      case 'remove':
        await itemTrackerWizard.showRemoveItem(ctx, telegramId, householdId);
        break;
      case 'reset':
        await itemTrackerWizard.showResetItem(ctx, telegramId, householdId);
        break;
    }
    return;
  }

  // bm:settings:<action>
  if (data.startsWith('bm:settings:')) {
    const action = data.slice('bm:settings:'.length);
    switch (action) {
      case 'nickname':
        await settingsWizard.startNickname(ctx, telegramId);
        break;
      case 'lang':
        await settingsWizard.showLangPicker(ctx);
        break;
    }
    return;
  }

  // bm:cancel — universal cancel for any wizard step
  if (data === 'bm:cancel') {
    await pendingActionRepo.clearForUser(telegramId);
    await ctx.answerCbQuery('Cancelled.');
    await ctx.editMessageText(t(lang, 'cancelledAction'), { reply_markup: undefined });
    return;
  }

  await ctx.answerCbQuery('Unknown button mode action.');
}
