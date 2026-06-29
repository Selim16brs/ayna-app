import { kk } from './messages/kk.js';
import { ru } from './messages/ru.js';
import { type MessageKey, tr } from './messages/tr.js';

// @ayna/i18n — Türkçe (tr, geliştirme önceliği), Kazakça (kk), Rusça (ru)
// Pazar dilleri kk/ru; tr şu an varsayılan ve kaynak dildir (docs/planning/06 §8).

export type Locale = 'tr' | 'kk' | 'ru';
export type { MessageKey };

const messages: Record<Locale, Record<string, string>> = { tr, kk, ru };

export const SUPPORTED_LOCALES: readonly Locale[] = ['tr', 'kk', 'ru'];
export const DEFAULT_LOCALE: Locale = 'tr';

export function t(locale: Locale, key: MessageKey): string {
  // Hedef dilde anahtar yoksa kaynak dile (tr) düş.
  return messages[locale]?.[key] ?? messages[DEFAULT_LOCALE][key] ?? key;
}

export { tr, kk, ru };
