/**
 * Para puan harcama kuralları — Karar K4 (26.08.2026).
 *
 * Bu karar Gelir şartnamesi §8.4'ün ("harcama tavanı %5") YERİNE geçer.
 *
 *   K4.2  Bakiye 50.000 ₸ üzerine çıkana kadar puan harcanamaz (kilit).
 *   K4.3  Her ödemede, ödenecek tutarın en çok %25'i puanla kapatılır.
 *
 * Kilit BİR DEFALIK açılır (varsayım V1): bakiye ilk kez eşiği geçtiğinde açılır
 * ve harcayıp altına düşmek onu geri kapatmaz. Aksi hâlde 49.000 ₸ bakiyesi olan
 * bir kullanıcı hiç harcayamaz duruma düşerdi.
 *
 * 1 puan = 1 ₸.
 */

export type SpendRules = {
  /** Kullanımın açılması için bakiyenin geçmesi gereken eşik (₸). */
  unlockAt: number;
  /** Bir ödemenin puanla kapatılabilecek azami yüzdesi (25 => %25). */
  capPct: number;
};

export const DEFAULT_SPEND_RULES: SpendRules = {
  unlockAt: 50_000,
  capPct: 25,
};

export type SpendGate =
  | { readonly allowed: true }
  | {
      readonly allowed: false;
      readonly reason: 'LOCKED';
      /** Kilidin açılmasına kalan puan. */
      readonly remaining: number;
    };

/**
 * Kilit durumu. `unlockedAt` kullanıcı kaydındaki "kilit ilk kez açıldı" damgası;
 * bir kez yazıldıktan sonra bakiye ne olursa olsun kilit açık kalır (V1).
 */
export function spendGate(
  balance: number,
  unlockedAt: Date | null,
  rules: SpendRules = DEFAULT_SPEND_RULES,
): SpendGate {
  if (unlockedAt) return { allowed: true };
  const esik = Math.max(0, rules.unlockAt);
  if (balance > esik) return { allowed: true };
  return { allowed: false, reason: 'LOCKED', remaining: Math.max(0, esik + 1 - balance) };
}

/** Bakiye eşiği geçtiyse kilit açılmalı mı? (damga henüz yazılmamışsa) */
export function shouldUnlock(
  balance: number,
  unlockedAt: Date | null,
  rules: SpendRules = DEFAULT_SPEND_RULES,
): boolean {
  return !unlockedAt && balance > Math.max(0, rules.unlockAt);
}

export type PaymentSplit = {
  /** Gerçekten kullanılan puan (kilit + tavan + bakiye ile sınırlı). */
  readonly pointsUsed: number;
  /** Kalan nakit. */
  readonly cashAmount: number;
  /** Puan kullanılamadıysa sebebi. */
  readonly blocked: 'LOCKED' | null;
};

/**
 * Ödemeyi puan/nakit olarak böler.
 *
 * Sıra önemli: önce kilit, sonra tavan, sonra bakiye. Üçünün de en küçüğü kazanır
 * ve sonuç asla negatif olmaz. İstemciden gelen `pointsRequested` yalnızca bir
 * ÜST sınır olarak kullanılır — hiçbir koşulda tavanı ya da bakiyeyi aşamaz.
 */
export function paymentSplit(
  amount: number,
  pointsRequested: number,
  balance: number,
  unlockedAt: Date | null,
  rules: SpendRules = DEFAULT_SPEND_RULES,
): PaymentSplit {
  const tutar = Number.isFinite(amount) && amount > 0 ? Math.floor(amount) : 0;
  const gate = spendGate(balance, unlockedAt, rules);
  if (!gate.allowed) return { pointsUsed: 0, cashAmount: tutar, blocked: 'LOCKED' };

  const oran = Number.isFinite(rules.capPct) ? Math.max(0, Math.min(100, rules.capPct)) : 0;
  const tavan = Math.floor((tutar * oran) / 100);
  const istenen = Number.isFinite(pointsRequested) ? Math.floor(pointsRequested) : 0;
  const bakiye = Number.isFinite(balance) ? Math.floor(balance) : 0;

  const pointsUsed = Math.max(0, Math.min(istenen, tavan, bakiye));
  return { pointsUsed, cashAmount: tutar - pointsUsed, blocked: null };
}
