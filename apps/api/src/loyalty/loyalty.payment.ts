// §8.336 — puanla kısmi ödeme tavanı: bir ödemenin EN FAZLA %50'si puanla karşılanır
// (tam bedava hizmet YOK — Groupon ölüm sarmalı önlemi; kullanıcı her zaman gerçek para öder).
// NOT: AYNA ödemesi uygulama-dışıdır (Kaspi/banka + dekont). Bu saf mantık kuralı kodlar;
// uygulama-içi puanla-ödeme transaction'ı ve §8.337 komisyon mahsubu, in-app ödeme akışı
// eklendiğinde bu yardımcıyı kullanır. 1 puan = 1 ₸ varsayımı.

// Bir ödemede puanla karşılanabilecek azami tutar (₸ = puan).
export function maxPointsForPayment(priceKzt: number, capPct: number): number {
  if (priceKzt <= 0) return 0;
  return Math.floor((priceKzt * capPct) / 100);
}

export interface PointsPaymentPlan {
  pointsUsed: number; // harcanan puan (= karşılanan ₸)
  cashKzt: number; // kullanıcının nakit ödeyeceği kalan
  capped: boolean; // tavana takıldı mı
}

// İstenen puanı tavan + bakiye ile sınırlayıp ödeme planını üretir.
export function planPointsPayment(
  priceKzt: number,
  requestedPoints: number,
  capPct: number,
  balance: number,
): PointsPaymentPlan {
  const cap = maxPointsForPayment(priceKzt, capPct);
  const desired = Math.max(0, Math.floor(requestedPoints));
  const pointsUsed = Math.min(desired, cap, Math.max(0, balance));
  return {
    pointsUsed,
    cashKzt: Math.max(0, priceKzt - pointsUsed),
    capped: desired > cap,
  };
}
