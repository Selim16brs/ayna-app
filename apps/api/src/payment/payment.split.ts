// EK Z.8 (§8.2) — ödeme dağılımı: puan bir ödemenin en fazla %50'sini karşılar.
// Saf mantık (test edilebilir). Tutarlar tam sayı KZT (kuruş yok — deposit/price KZT).

export const POINTS_MAX_RATIO = 0.5;

export interface PaymentSplit {
  pointsUsed: number; // gerçekten kullanılan puan (tavan + bakiye ile sınırlı)
  cashAmount: number; // Kaspi ile ödenecek nakit
}

// amount: hizmet bedeli (KZT). pointsRequested: kullanıcının kullanmak istediği puan.
// pointsBalance: mevcut puan bakiyesi. 1 puan = 1 KZT.
export function paymentSplit(amount: number, pointsRequested: number, pointsBalance: number): PaymentSplit {
  const cap = Math.floor(amount * POINTS_MAX_RATIO); // §8.2 %50 tavan
  const pointsUsed = Math.max(0, Math.min(pointsRequested, cap, pointsBalance));
  return { pointsUsed, cashAmount: amount - pointsUsed };
}
