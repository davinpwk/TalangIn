import { InlineKeyboardMarkup } from 'telegraf/types';

/**
 * Approve / Deny buttons sent to the household owner when a join request comes in.
 * callback_data: cb:join:approve:<requestId>  /  cb:join:deny:<requestId>
 */
export function joinRequestKeyboard(joinRequestId: string): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        {
          text: '✅ Approve',
          callback_data: `cb:join:approve:${joinRequestId}`,
        },
        {
          text: '❌ Deny',
          callback_data: `cb:join:deny:${joinRequestId}`,
        },
      ],
    ],
  };
}
