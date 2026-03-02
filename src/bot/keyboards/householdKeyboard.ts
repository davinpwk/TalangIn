import { InlineKeyboardMarkup } from 'telegraf/types';

/**
 * Keyboard for selecting which household to use when the user is in multiple.
 * callback_data: cb:hs:<householdId>:<pendingActionId>
 */
export function householdSelectionKeyboard(
  households: Array<{ id: string; name: string }>,
  pendingActionId: string
): InlineKeyboardMarkup {
  return {
    inline_keyboard: households.map((h) => [
      {
        text: h.name,
        callback_data: `cb:hs:${h.id}:${pendingActionId}`,
      },
    ]),
  };
}

/**
 * Keyboard for switching between household views in VIEW_BALANCES.
 * callback_data: cb:bal:<householdId>
 */
export function balanceNavKeyboard(
  households: Array<{ id: string; name: string }>,
  currentHouseholdId: string
): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      households
        .filter((h) => h.id !== currentHouseholdId)
        .map((h) => ({ text: h.name, callback_data: `cb:bal:${h.id}` })),
    ].filter((row) => row.length > 0),
  };
}
