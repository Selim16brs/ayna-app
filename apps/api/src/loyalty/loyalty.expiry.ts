// §8 — puan son kullanma (12 ay) saf mantığı; test edilebilir.
export const POINTS_EXPIRY_MONTHS = 12;
export const EXPIRY_WARN_DAYS = 30; // silinmeden 30 gün önce uyarı (MD §8)

// Kazanım anından 12 ay sonrası (aynı gün-ay, +12 ay).
export function expiryDateFrom(earnedAt: Date): Date {
  const d = new Date(earnedAt.getTime());
  d.setMonth(d.getMonth() + POINTS_EXPIRY_MONTHS);
  return d;
}

interface ExpiringEntry {
  kind: 'earn' | 'spend';
  points: number;
  expiresAt: Date | null;
}

// Verilen an itibarıyla [at, at+windowDays] arasında sona erecek KAZANILMIŞ puan + en yakın tarih.
export function expiringSoon(
  entries: readonly ExpiringEntry[],
  at: Date,
  windowDays: number = EXPIRY_WARN_DAYS,
): { points: number; nextExpiry: Date | null } {
  const windowEnd = at.getTime() + windowDays * 24 * 60 * 60 * 1000;
  let points = 0;
  let nextExpiry: Date | null = null;
  for (const e of entries) {
    if (e.kind !== 'earn' || !e.expiresAt) continue;
    const t = e.expiresAt.getTime();
    if (t > at.getTime() && t <= windowEnd) {
      points += e.points;
      if (!nextExpiry || t < nextExpiry.getTime()) nextExpiry = e.expiresAt;
    }
  }
  return { points, nextExpiry };
}
