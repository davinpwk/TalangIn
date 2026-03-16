import { Markup } from 'telegraf';

export function mainReplyKeyboard(householdName: string | null) {
  const householdLabel = householdName ? `🏠 ${householdName}` : '🏠 Set Household';
  return Markup.keyboard([
    ['💸 Log Expense',   '💳 Log Payment'],
    ['📊 View Balances', '🤝 I Owe'],
    ['📢 Broadcast',     '📦 Item Tracker'],
    ['⚙️ Settings',      householdLabel],
  ]).resize();
}
