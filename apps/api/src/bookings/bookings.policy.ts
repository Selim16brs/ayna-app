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
export function cancelOutcome(
  status: string,
  startAtMs: number | null,
  nowMs: number,
): CancelOutcome {
  if (!DEPOSIT_PAID_STATUSES.includes(status)) return { status: 'cancelled', forfeit: false };
  const late = startAtMs != null && startAtMs - nowMs <= FREE_CANCEL_WINDOW_MS;
  return late
    ? { status: 'cancelled', forfeit: true }
    : { status: 'refund_pending', forfeit: false };
}

// ── §7.8 BİR KEZ ADİL ERTELEME HAKKI ────────────────────────────────────────
//
// Şartname: "Müşteri politika süresinin dışında bir kez randevu erteleyebilir.
// Kapora yeni randevuya aktarılır. Yeni slot yeniden hold edilir. Sürekli
// erteleme kötüye kullanımını önlemek için aynı randevuda bir ücretsiz erteleme
// sınırı uygulanabilir."
//
// Kodda böyle bir yol YOKTU: müşterinin elinde yalnız İPTAL vardı. Saatini
// değiştirmek isteyen müşteri iptal etmek zorunda kalıyor, geç iptal
// penceresindeyse kaporasını yakıyordu — hâlbuki hizmetten vazgeçmemişti.

/** Ertelenebilen durumlar: slotu tutan, henüz yaşanmamış randevular. */
export const RESCHEDULABLE_STATUSES = ['confirmed', 'deposit_pending', 'deposit_submitted'];

export type RescheduleCheck =
  | { ok: true }
  | { ok: false; code: 'RESCHEDULE_NOT_ALLOWED' | 'RESCHEDULE_LIMIT' | 'RESCHEDULE_TOO_LATE' };

/**
 * Ertelemeye izin var mı? Saf karar — DB'siz, saatsiz.
 *
 * `limit` 0 ise erteleme tamamen kapalıdır (admin ayarı).
 * Süre penceresi iptal penceresiyle AYNI: geç iptalde kapora yanıyorsa, aynı
 * anda ücretsiz erteleme vermek cezayı anlamsız kılardı.
 */
export function canReschedule(input: {
  status: string;
  startAtMs: number | null;
  nowMs: number;
  used: number;
  limit: number;
  windowMs: number;
}): RescheduleCheck {
  if (!RESCHEDULABLE_STATUSES.includes(input.status)) {
    return { ok: false, code: 'RESCHEDULE_NOT_ALLOWED' };
  }
  if (input.used >= input.limit) return { ok: false, code: 'RESCHEDULE_LIMIT' };
  // Başlangıcı bilinmeyen (offline) randevuda pencere hesaplanamaz — hakkı verme.
  if (input.startAtMs == null) return { ok: false, code: 'RESCHEDULE_NOT_ALLOWED' };
  if (input.startAtMs - input.nowMs <= input.windowMs) {
    return { ok: false, code: 'RESCHEDULE_TOO_LATE' };
  }
  return { ok: true };
}
