import type { Context } from 'telegraf';
import { strings, type Lang } from './strings';

export type { Lang };

export const LANG_NAMES: Record<Lang, string> = {
  en: '🇬🇧 English',
  id: '🇮🇩 Bahasa Indonesia',
};

export function t(
  lang: Lang | null | undefined,
  key: keyof typeof strings.en,
  vars?: Record<string, string>
): string {
  const effective: Lang = lang === 'id' ? 'id' : 'en';
  const s = strings[effective][key] ?? strings.en[key];
  if (!vars) return s;
  return s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`);
}

/** Read the current language from ctx.state (set by bot middleware). */
export function getLang(ctx: Context): Lang | null {
  return ((ctx.state as Record<string, unknown>)['lang'] as Lang | null) ?? null;
}
