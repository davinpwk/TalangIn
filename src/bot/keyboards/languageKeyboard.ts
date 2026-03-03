import type { InlineKeyboardMarkup } from 'telegraf/types';

export function languageKeyboard(): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        { text: '🇬🇧 English', callback_data: 'lang_set:en' },
        { text: '🇮🇩 Bahasa Indonesia', callback_data: 'lang_set:id' },
      ],
    ],
  };
}
