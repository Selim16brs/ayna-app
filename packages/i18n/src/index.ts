import kk from './messages/kk.json';
import ru from './messages/ru.json';

// @ayna/i18n — Kazakça (kk) ve Rusça (ru) metinler
// Kural: kullanıcıya görünen her metin burada (docs/planning/06-coding-standards.md §8)

export type Locale = 'kk' | 'ru';
export type MessageKey = keyof typeof kk;

const messages: Record<Locale, Record<string, string>> = { kk, ru };

export const SUPPORTED_LOCALES: readonly Locale[] = ['kk', 'ru'];
export const DEFAULT_LOCALE: Locale = 'ru';

export function t(locale: Locale, key: MessageKey): string {
  return messages[locale]?.[key] ?? messages[DEFAULT_LOCALE][key] ?? key;
}

export { kk, ru };
