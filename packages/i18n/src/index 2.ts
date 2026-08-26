import { kk } from './messages/kk.js';
import { ru } from './messages/ru.js';
import { type MessageKey, tr } from './messages/tr.js';

// @ayna/i18n — Türkçe (tr, kaynak + varsayılan), Kazakça (kk), Rusça (ru)
// Pazar dilleri kk/ru; tr şu an varsayılan ve kaynak. Eksik kk/ru anahtarı tr'ye düşer.

export type Locale = 'tr' | 'kk' | 'ru';
export type { MessageKey };

const messages: Record<Locale, Partial<Record<MessageKey, string>>> = { tr, kk, ru };

export const SUPPORTED_LOCALES: readonly Locale[] = ['tr', 'kk', 'ru'];
export const DEFAULT_LOCALE: Locale = 'tr';

export function t(locale: Locale, key: MessageKey): string {
  return messages[locale]?.[key] ?? tr[key] ?? key;
}

export { tr, kk, ru };
