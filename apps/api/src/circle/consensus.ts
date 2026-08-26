/**
 * §14 — FİKİR BİRLİĞİ SAYIMI (saf fonksiyon; DB'siz test edilebilir).
 *
 * Kural üç maddedir ve üçü de kasıtlıdır:
 *  1. Yalnız DOĞRULANMIŞ öneriler sayılır — "duydum ki iyiymiş" sayılmaz.
 *  2. Aynı kişinin aynı uzmanı tekrar önermesi BİR sayılır — tek kişi
 *     üst üste yazarak fikir birliği üretemesin.
 *  3. Payda, öneride bulunan KİŞİ sayısıdır (yorum sayısı değil) — "7 kişiden 4'ü"
 *     ifadesi ancak böyle dürüst olur.
 */
export interface ConsensusRow {
  proId: string | null;
  userId: string | null;
  proVerified: boolean;
}

export interface ConsensusResult {
  /** Doğrulanmış öneride bulunan farklı kişi sayısı (payda). */
  voters: number;
  items: { proId: string; count: number }[];
}

export function tallyConsensus(rows: ConsensusRow[], limit = 5): ConsensusResult {
  const seen = new Set<string>();
  const tally = new Map<string, number>();
  const voters = new Set<string>();

  for (const r of rows) {
    if (!r.proVerified || !r.proId) continue;
    const who = r.userId ?? 'anon';
    voters.add(who);
    const key = `${who}:${r.proId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    tally.set(r.proId, (tally.get(r.proId) ?? 0) + 1);
  }

  const items = [...tally.entries()]
    .map(([proId, count]) => ({ proId, count }))
    // Eşitlikte proId'ye göre sabit sıra: liste her yenilemede yer değiştirmesin.
    .sort((a, b) => b.count - a.count || a.proId.localeCompare(b.proId))
    .slice(0, limit);

  return { voters: voters.size, items };
}
