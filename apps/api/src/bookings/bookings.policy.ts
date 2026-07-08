// EK Z.7 (§4.4) — İptal/no-show politikası: saf kurallar (test edilebilir, DB'siz).

// Serbest iptal penceresi: randevuya 3 saatten fazla süre varken iptal serbesttir.
export const FREE_CANCEL_WINDOW_MS = 3 * 60 * 60 * 1000;

// Kaporanın ödendiği (yakılabilir/iade edilebilir) durumlar.
const DEPOSIT_PAID_STATUSES = ['confirmed', 'deposit_submitted'];

export interface CancelOutcome {
  status: 'cancelled' | 'refund_pending';
  forfeit: boolean; // true → kapora uzmanda kalır (geç iptal cezası)
}

// §4.4 — kullanıcı iptalinin sonucunu SUNUCU belirler (client'a güvenilmez):
// - Kapora ödenmemişse → düz iptal (yakma/iade yok).
// - Kapora ödenmiş + geç iptal (<3sa) → kapora yanar (ceza).
// - Kapora ödenmiş + serbest iptal (>3sa) → uzman iade eder (refund_pending).
export function cancelOutcome(status: string, startAtMs: number | null, nowMs: number): CancelOutcome {
  if (!DEPOSIT_PAID_STATUSES.includes(status)) return { status: 'cancelled', forfeit: false };
  const late = startAtMs != null && startAtMs - nowMs <= FREE_CANCEL_WINDOW_MS;
  return late ? { status: 'cancelled', forfeit: true } : { status: 'refund_pending', forfeit: false };
}
