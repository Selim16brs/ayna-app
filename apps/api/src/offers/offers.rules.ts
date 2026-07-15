// §keşif Modül 2 — kampanya kural motoru (saf fonksiyonlar; publish anında otomatik kontrol).
// İlke #1: platform dışına yönlendirme YOK — metinlerde telefon/URL/handle engellenir.

export const OFFER_MAX_DAYS = 30;
export const OFFER_MIN_PERCENT = 5;
export const OFFER_MAX_PERCENT = 50;
export const ACTIVE_LIMIT_EXPERT = 1;
export const ACTIVE_LIMIT_SALON = 3;
// Sahte indirim koruması: basePrice, son 60 gün ortalama fiyatın %120'sini aşamaz
export const BASE_PRICE_CAP_RATIO = 1.2;
export const FAKE_DISCOUNT_WINDOW_DAYS = 60;

const PHONE_RE = /\+?\d[\d\s\-()]{7,}\d/;
const URL_RE = /(https?:\/\/|www\.|\S+\.(kz|com|ru|net|org|io|me)\b)/i;
const HANDLE_RE = /(@[a-z0-9_.]{3,}|instagram|whatsapp|telegram|t\.me)/i;

// Metinde dış yönlendirme (telefon/URL/sosyal handle) var mı?
export function hasExternalContact(text: string): boolean {
  return PHONE_RE.test(text) || URL_RE.test(text) || HANDLE_RE.test(text);
}

export type OfferCheckInput = {
  discountType: 'percent' | 'fixed_price';
  discountValue: number;
  basePrice: number;
  startsAtMs: number;
  endsAtMs: number;
  texts: string[]; // title + description (+ i18n override'lar)
  avgRecentPrice: number | null; // son 60 gün aynı sektör ortalaması (veri yoksa null → kontrol atlanır)
};

export type OfferCheckResult =
  { ok: true; finalPrice: number } | { ok: false; code: string; message: string };

export function checkOffer(o: OfferCheckInput): OfferCheckResult {
  if (o.basePrice <= 0) {
    return { ok: false, code: 'BASE_PRICE_INVALID', message: 'Referans fiyat gerekli' };
  }
  if (o.endsAtMs <= o.startsAtMs) {
    return { ok: false, code: 'DATES_INVALID', message: 'Bitiş başlangıçtan sonra olmalı' };
  }
  if (o.endsAtMs - o.startsAtMs > OFFER_MAX_DAYS * 24 * 60 * 60 * 1000) {
    return {
      ok: false,
      code: 'TOO_LONG',
      message: `Kampanya süresi en fazla ${OFFER_MAX_DAYS} gün`,
    };
  }
  for (const t of o.texts) {
    if (hasExternalContact(t)) {
      return {
        ok: false,
        code: 'EXTERNAL_CONTACT',
        message: 'Metinde telefon/link/sosyal medya adresi olamaz — işlem platformda kalır',
      };
    }
  }
  // Sahte indirim koruması (İlke 2.5.1)
  if (o.avgRecentPrice != null && o.basePrice > o.avgRecentPrice * BASE_PRICE_CAP_RATIO) {
    return {
      ok: false,
      code: 'BASE_PRICE_INFLATED',
      message: 'Referans fiyat, son 60 günlük ortalama fiyatının %120’sini aşamaz',
    };
  }
  let finalPrice: number;
  if (o.discountType === 'percent') {
    if (o.discountValue < OFFER_MIN_PERCENT || o.discountValue > OFFER_MAX_PERCENT) {
      return {
        ok: false,
        code: 'DISCOUNT_RANGE',
        message: `İndirim %${OFFER_MIN_PERCENT}–%${OFFER_MAX_PERCENT} aralığında olmalı`,
      };
    }
    finalPrice = Math.round(o.basePrice * (1 - o.discountValue / 100));
  } else {
    if (o.discountValue <= 0 || o.discountValue >= o.basePrice) {
      return {
        ok: false,
        code: 'FIXED_PRICE_INVALID',
        message: 'Kampanya fiyatı normal fiyatın altında olmalı',
      };
    }
    finalPrice = Math.round(o.discountValue);
  }
  return { ok: true, finalPrice };
}

// Kampanyanın verili anda randevuya açık olup olmadığı (valid_days + time_window).
// wd: 0=Pazar..6=Cumartesi (Almatı yereli mobilde hesaplanıp UTC ms gönderilir; sunucu UTC+5 çevirir).
export function slotAllowed(
  offer: { validDays: number[]; timeFrom: string; timeTo: string },
  startMs: number,
): boolean {
  const local = new Date(startMs + 5 * 60 * 60 * 1000); // Asia/Almaty = UTC+5 (DST yok)
  const wd = local.getUTCDay();
  if (offer.validDays.length > 0 && !offer.validDays.includes(wd)) return false;
  if (offer.timeFrom && offer.timeTo) {
    const hm = `${String(local.getUTCHours()).padStart(2, '0')}:${String(local.getUTCMinutes()).padStart(2, '0')}`;
    if (hm < offer.timeFrom || hm >= offer.timeTo) return false;
  }
  return true;
}
