import { IPTAL_ESIGI_SAAT, esikGecti } from '@ayna/domain';
// EK Z.7 (§4.4) — İptal/no-show politikası: saf kurallar (test edilebilir, DB'siz).

// Serbest iptal eşiği — brief §4.7. Tek kaynak `@ayna/domain`; burada yeniden
// yazmak, eşiğin bir yerde değişip diğerinde kalmasına açıktı.
export const FREE_CANCEL_WINDOW_MS = IPTAL_ESIGI_SAAT * 60 * 60 * 1000;

// Depozitonun ÖDENDİĞİ durum. Brief §4.4'te dekont yüklenince randevu doğrudan
// KESINLESTI oluyor; eski "yüklendi ama onaylanmadı" ara durumu yok, o yüzden
// liste tek değere indi.
const DEPOSIT_PAID_STATUSES = ['kesinlesti'];

export interface CancelOutcome {
  /** Durum her hâlükârda müşteri iptali; fark İADE HAKKINDA. */
  status: 'iptal_musteri';
  forfeit: boolean; // true → depozito yanar (geç iptal, §4.7)
}

// §4.4 — kullanıcı iptalinin sonucunu SUNUCU belirler (client'a güvenilmez):
// - Kapora ödenmemişse → düz iptal (yakma/iade yok).
// - Kapora ödenmiş + geç iptal (<3sa) → kapora yanar (ceza).
// - Depozito ödenmiş + serbest iptal (>3sa) → iade hakkı doğar (§4.10 kuyruğu).
export function cancelOutcome(
  status: string,
  startAtMs: number | null,
  nowMs: number,
): CancelOutcome {
  // Depozito ödenmemişse yakılacak bir şey yok.
  if (!DEPOSIT_PAID_STATUSES.includes(status)) return { status: 'iptal_musteri', forfeit: false };
  const late = startAtMs != null && esikGecti(startAtMs, nowMs);
  // §4.7 — eşikten sonra depozito YANAR; önce iade hakkı doğar ve talep §4.10
  // kuyruğundan yürür. Eskiden `refund_pending` diye AYRI bir randevu durumu
  // vardı; iade artık randevunun durumu değil, ayrı bir kayıt.
  return { status: 'iptal_musteri', forfeit: late };
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
// §4.6 — ertelenebilen durumlar: slotu tutan, henüz yaşanmamış randevular.
export const RESCHEDULABLE_STATUSES = ['kesinlesti', 'depozito_bekliyor'];

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
