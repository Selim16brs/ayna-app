'use client';
import type { I18nOverride } from '../lib/api';

/**
 * §14.5 — 3 DİL form yardımcıları.
 * App'e ulaşan içerik tr (kaynak) + kk + ru olarak girilir.
 */

export type Lang = 'tr' | 'kk' | 'ru';
export const LANGS: Lang[] = ['tr', 'kk', 'ru'];

export function LangTabs({
  lang,
  setLang,
  filled,
}: {
  lang: Lang;
  setLang: (l: Lang) => void;
  filled: (l: Lang) => boolean;
}) {
  return (
    <div className="toolbar full" style={{ marginBottom: 0 }}>
      {LANGS.map((l) => (
        <button
          key={l}
          type="button"
          className={`chip ${lang === l ? 'on' : ''}`}
          onClick={() => setLang(l)}
        >
          {l.toUpperCase()}
          {l === 'tr' ? ' (kaynak)' : filled(l) ? ' ✓' : ' —'}
        </button>
      ))}
    </div>
  );
}

/**
 * kk/ru alanlarından i18n objesi kurar.
 * Yalnız dolu alanlar girer; hiçbiri yoksa undefined döner → yalnız tr yayınlanır.
 */
export function buildI18n(
  fields: Record<string, { kk: string; ru: string }>,
): I18nOverride | undefined {
  const out: I18nOverride = {};
  for (const loc of ['kk', 'ru'] as const) {
    const o: Record<string, string> = {};
    for (const [k, v] of Object.entries(fields)) if (v[loc].trim()) o[k] = v[loc].trim();
    if (Object.keys(o).length) out[loc] = o;
  }
  return Object.keys(out).length ? out : undefined;
}
