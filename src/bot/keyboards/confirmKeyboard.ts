import { InlineKeyboardMarkup } from 'telegraf/types';

/**
 * Returns the inline keyboard for confirm/cancel actions.
 * callback_data format: cb:confirm:<id>:<token>  /  cb:cancel:<id>
 * Both fit within Telegram's 64-byte callback_data limit.
 */
export function confirmKeyboard(
  pendingActionId: string,
  token: string
): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        {
          text: '✅ Confirm',
          callback_data: `cb:confirm:${pendingActionId}:${token}`,
        },
        {
          text: '❌ Cancel',
          callback_data: `cb:cancel:${pendingActionId}`,
        },
      ],
    ],
  };
}
