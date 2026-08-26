/**
 * Para puan harcama kuralları — Karar K4 (26.08.2026).
 *
 * Bu karar Gelir şartnamesi §8.4'ün ("harcama tavanı %5") YERİNE geçer.
 *
 *   K4.2  Bakiye eşiği aşana kadar puan harcanamaz (kilit).
 *   K4.3  Her ödemede, ödenecek tutarın en çok %25'i puanla kapatılır.
 *
 * Buna ek olarak şartname §8.4'ün SÜBVANSİYON TAVANI da uygulanır: indirim,
 * o randevudan beklenen net komisyonun en çok %50'si olabilir. K4.3 bu sınıra
 * değinmiyordu ve ikisi çelişiyordu — %10 komisyonla 20.000 ₸'lik bir randevuda
 * komisyon 2.000 ₸ iken K4.3 tek başına 5.000 ₸ indirim izni veriyordu. Farkı
 * ya AYNA (randevu başına 3.000 ₸ zarar) ya da uzman (nakit eksik alıp komisyonu
 * tam fiyattan ödeyerek, haberi olmadan) karşılardı. Kurucu kararı (26.08):
 * §8.4 sınırı eklensin. Pratikte %10 komisyonda tavan fiyatın %5'ine iner.
 *
 * EŞİK NEDEN 50.000 DEĞİL: karar önce 50.000 ₸ olarak verilmişti, ama uygulama
 * sırasında K4.4 (90 günde yanma) ile çeliştiği görüldü. Puanlar yandığı için
 * bakiye birikmiyor; eşiğe ulaşmak %3 geri kazanımla 3 AY İÇİNDE ~111 randevu
 * demekti — yani kilit matematiksel olarak hiç açılmıyordu. Kurucu kararıyla
 * eşik 5.000 ₸ (≈11 randevu). Değer admin ayarı; buradaki yalnız varsayılan.
 *
 * Kilit BİR DEFALIK açılır (varsayım V1): bakiye ilk kez eşiği geçtiğinde açılır
 * ve harcayıp altına düşmek onu geri kapatmaz. Aksi hâlde eşiğin hemen altında
 * bakiyesi olan bir kullanıcı hiç harcayamaz duruma düşerdi.
 *
 * 1 puan = 1 ₸.
 */

export type SpendRules = {
  /** Kullanımın açılması için bakiyenin geçmesi gereken eşik (₸). */
  unlockAt: number;
  /** K4.3 — bir ödemenin puanla kapatılabilecek azami yüzdesi (25 => %25). */
  capPct: number;
  /** Komisyon oranı (%). Beklenen net komisyonu hesaplamak için. */
  commissionPct: number;
  /** §8.4 — indirim, beklenen net komisyonun en çok yüzde kaçı olabilir. */
  subsidyCapPct: number;
};

export const DEFAULT_SPEND_RULES: SpendRules = {
  unlockAt: 5_000,
  capPct: 25,
  commissionPct: 10,
  subsidyCapPct: 50,
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
  /** Gerçekten kullanılan puan (kilit + tavanlar + bakiye ile sınırlı). */
  readonly pointsUsed: number;
  /** Kalan nakit. */
  readonly cashAmount: number;
  /** Bu randevuda bakiyeden bağımsız olarak izin verilen en yüksek puan. */
  readonly maxAllowed: number;
  /** Puan kullanılamadıysa sebebi. */
  readonly blocked: 'LOCKED' | null;
  /** `maxAllowed`'ı hangi kural belirledi — ekranda açıklamak için. */
  readonly limitedBy: 'PRICE_CAP' | 'SUBSIDY_CAP' | null;
};

/** İzin verilen üst sınırı ve onu belirleyen kuralı hesaplar (bakiyeden bağımsız). */
function tavanlar(tutar: number, rules: SpendRules) {
  const yuzde = (v: number) => (Number.isFinite(v) ? Math.max(0, Math.min(100, v)) : 0);

  // K4.3 — hizmet bedelinin yüzdesi.
  const fiyatTavani = Math.floor((tutar * yuzde(rules.capPct)) / 100);

  // §8.4 — beklenen NET KOMİSYONUN yüzdesi. Bu sınır olmadan indirim, o
  // randevudan elde edilen komisyonu aşabiliyordu: %10 komisyonla 20.000 ₸'lik
  // bir randevuda komisyon 2.000 ₸ iken puan 5.000 ₸ indirim yapabiliyordu.
  // Farkı ya AYNA (randevu başına zarar) ya da uzman (haberi olmadan) öderdi.
  const netKomisyon = (tutar * yuzde(rules.commissionPct)) / 100;
  const subvansiyonTavani = Math.floor((netKomisyon * yuzde(rules.subsidyCapPct)) / 100);

  const maxAllowed = Math.min(fiyatTavani, subvansiyonTavani);
  const limitedBy =
    maxAllowed <= 0
      ? null
      : subvansiyonTavani < fiyatTavani
        ? ('SUBSIDY_CAP' as const)
        : ('PRICE_CAP' as const);
  return { maxAllowed, limitedBy };
}

/**
 * Ödemeyi puan/nakit olarak böler.
 *
 * Sıra: önce kilit (K4.2), sonra İKİ tavanın küçüğü (K4.3 ve §8.4), sonra
 * bakiye. Hepsinin en küçüğü kazanır ve sonuç asla negatif olmaz. İstemciden
 * gelen `pointsRequested` yalnızca bir ÜST sınır — hiçbir koşulda tavanı ya da
 * bakiyeyi aşamaz.
 */
export function paymentSplit(
  amount: number,
  pointsRequested: number,
  balance: number,
  unlockedAt: Date | null,
  rules: SpendRules = DEFAULT_SPEND_RULES,
): PaymentSplit {
  const tutar = Number.isFinite(amount) && amount > 0 ? Math.floor(amount) : 0;
  const { maxAllowed, limitedBy } = tavanlar(tutar, rules);

  const gate = spendGate(balance, unlockedAt, rules);
  if (!gate.allowed) {
    return { pointsUsed: 0, cashAmount: tutar, maxAllowed, blocked: 'LOCKED', limitedBy };
  }

  const istenen = Number.isFinite(pointsRequested) ? Math.floor(pointsRequested) : 0;
  const bakiye = Number.isFinite(balance) ? Math.floor(balance) : 0;

  const pointsUsed = Math.max(0, Math.min(istenen, maxAllowed, bakiye));
  return { pointsUsed, cashAmount: tutar - pointsUsed, maxAllowed, blocked: null, limitedBy };
}
