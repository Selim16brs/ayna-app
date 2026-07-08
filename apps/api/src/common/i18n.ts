// §14.5 — 3 DİL İÇERİK çözümleme yardımcısı.
// Base alanlar tr (kaynak); i18n = { kk: {...}, ru: {...} } üzerine yazar.
// Boş/eksik override tr'ye düşer. Admin→app tüm içerikte ortak kullanılır.

type I18nBlob = { kk?: Record<string, string>; ru?: Record<string, string> } | null | undefined;

export function localizeRow<T extends { i18n?: unknown }>(
  row: T,
  locale: string | undefined,
  fields: readonly string[],
): T {
  const i18n = row.i18n as I18nBlob;
  if (!i18n || (locale !== 'kk' && locale !== 'ru')) return row;
  const ov = i18n[locale];
  if (!ov) return row;
  const out = { ...row } as Record<string, unknown>;
  for (const f of fields) {
    const v = ov[f];
    if (v != null && v !== '') out[f] = v;
  }
  return out as T;
}

export function localizeRows<T extends { i18n?: unknown }>(
  rows: T[],
  locale: string | undefined,
  fields: readonly string[],
): T[] {
  return rows.map((r) => localizeRow(r, locale, fields));
}
