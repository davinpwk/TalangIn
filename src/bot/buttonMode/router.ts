import { Context } from 'telegraf';
import { Telegraf } from 'telegraf';
import { userRepo } from '../../db/repos/userRepo';
import { pendingActionRepo } from '../../db/repos/pendingActionRepo';
import { householdRepo } from '../../db/repos/householdRepo';
import { t, getLang } from '../../i18n';
import { escapeMd } from '../../domain/money';
import { displayName } from '../../domain/displayName';
import * as viewBalancesFlow from '../../flows/viewBalances';
import * as expenseWizard from './expenseWizard';
import * as paymentWizard from './paymentWizard';
import * as iOweWizard from './iOweWizard';
import * as broadcastWizard from './broadcastWizard';
import * as itemTrackerWizard from './itemTrackerWizard';
import * as settingsWizard from './settingsWizard';
import { showHouseholdPicker, onCreateHouseholdName, onJoinHouseholdCode } from './household';

export async function handleButtonModeText(
  ctx: Context,
  text: string,
  telegramId: number,
  lang: ReturnType<typeof getLang>,
  bot: Telegraf
): Promise<void> {
  const user = await userRepo.getById(telegramId);
  const activeHouseholdId = user?.active_household_id ?? null;

  // Check for active BM_NICKNAME action (no household needed)
  const pending = await pendingActionRepo.getActive(telegramId);

  // Settings flows that don't need a household
  if (pending?.type === 'BM_NICKNAME') {
    await settingsWizard.onNickname(ctx, text);
    return;
  }

  // Household creation/join flows — no active household needed
  if (pending?.type === 'BM_CREATE_HH_NAME') {
    await onCreateHouseholdName(ctx, text, pending);
    return;
  }
  if (pending?.type === 'BM_JOIN_HH_CODE') {
    await onJoinHouseholdCode(ctx, text, pending, bot);
    return;
  }

  // If no active household and text doesn't trigger settings/household change
  if (!activeHouseholdId) {
    // Allow Settings button or household button
    if (text === '⚙️ Settings' || text.startsWith('🏠')) {
      // Fall through to routing below
    } else {
      await showHouseholdPicker(ctx, telegramId);
      return;
    }
  }

  // Check pending BM_* wizard steps
  if (pending) {
    switch (pending.type) {
      case 'BM_EXPENSE_DESC':
        await expenseWizard.onDesc(ctx, text, pending);
        return;
      case 'BM_EXPENSE_AMOUNT':
        await expenseWizard.onAmount(ctx, text, pending);
        return;
      case 'BM_EXPENSE_CUSTOM_AMOUNT':
        await expenseWizard.onCustomAmount(ctx, text, pending);
        return;
      case 'BM_PAYMENT_AMOUNT':
        await paymentWizard.onAmount(ctx, text, pending);
        return;
      case 'BM_IOWE_DESC':
        await iOweWizard.onDesc(ctx, text, pending);
        return;
      case 'BM_IOWE_AMOUNT':
        await iOweWizard.onAmount(ctx, text, pending, bot);
        return;
      case 'BM_BROADCAST_MSG':
        await broadcastWizard.onText(ctx, text, pending, bot);
        return;
      case 'BM_ITEM_ADD_NAME':
        await itemTrackerWizard.onAddItemName(ctx, text, pending);
        return;
      case 'BM_ITEM_QUANTITY':
        await itemTrackerWizard.onQuantity(ctx, text, pending);
        return;
      // If awaiting proof or confirm — remind user
      case 'BM_AWAITING_PROOF':
        await ctx.reply(t(lang, 'awaitingProofReminder'));
        return;
      case 'AWAITING_CONFIRM':
        await ctx.reply(t(lang, 'awaitingConfirmReminder'));
        return;
    }
  }

  // Match reply keyboard buttons
  switch (text) {
    case '💸 Log Expense':
      await expenseWizard.start(ctx, telegramId, activeHouseholdId!);
      return;
    case '💳 Log Payment':
      await paymentWizard.start(ctx, telegramId, activeHouseholdId!);
      return;
    case '📊 View Balances': {
      const fakeIntent = { intent: 'VIEW_BALANCES' as const, household_hint: undefined };
      await viewBalancesFlow.handle(ctx, fakeIntent);
      return;
    }
    case '🤝 I Owe':
      await iOweWizard.start(ctx, telegramId, activeHouseholdId!);
      return;
    case '📢 Broadcast':
      await broadcastWizard.start(ctx, telegramId, activeHouseholdId!);
      return;
    case '📦 Item Tracker':
      await itemTrackerWizard.showMenu(ctx, telegramId, activeHouseholdId!);
      return;
    case '⚙️ Settings':
      await settingsWizard.showSettingsMenu(ctx, telegramId);
      return;
    default:
      if (text.startsWith('🏠')) {
        await showHouseholdPicker(ctx, telegramId);
        return;
      }
      await ctx.reply(t(lang, 'buttonModeUseButtons'), { parse_mode: 'Markdown' });
  }
}
