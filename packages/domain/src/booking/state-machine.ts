/**
 * Randevu durum makinesi — CANLI sözlük.
 *
 * Bu dosya daha önce planlama belgesindeki (docs/planning/04) sözlükle yazılmıştı:
 * `PENDING_PROVIDER_CONFIRMATION`, `SCHEDULED`, `CHECK_IN_AVAILABLE`, `CLOSED`…
 * O sözlük sunucuda hiç kullanılmadı — Prisma enum'u bambaşka değerler taşıyor ve
 * makinenin sıfır tüketicisi vardı. Yani sistemde "durum makinesi var" görünüyordu
 * ama gerçek geçişler `bookings.service.transition()` içindeki kısa bir KARA LİSTE
 * ile korunuyordu: yalnız kapalı durumlardan çıkış engelleniyordu.
 *
 * Kara listenin bıraktığı boşluk: `deposit_pending → completed` gibi kapora adımını
 * tamamen atlayan geçişler serbestti. Bu dosya artık BEYAZ LİSTE — izin verilmeyen
 * her geçiş reddedilir.
 *
 * Değerler Prisma `BookingStatus` enum'uyla birebir aynı olmalı; `tüm durumlar
 * haritada tanımlı` testi bunu koruyor.
 *
 * Randevu şartnamesi §3'teki 31 durumla eşleme:
 *   HELD                            ≡ deposit_pending (slot tutuluyor + süre işliyor)
 *   DEPOSIT_REVIEW                  ≡ deposit_submitted
 *   COMPLETED_PENDING_CONFIRMATION  ≡ completed_pending
 *   NO_SHOW_REPORTED                ≡ no_show (teyit penceresi açıkken)
 *   NO_SHOW_CONFIRMED               ≡ no_show (pencere dolduktan sonra)
 * Şartname §"Mevcut schema adlarını incelemeden birebir kopyalama … kavramsal
 * modelleri mevcut mimariye uyarlayarak" bu eşlemeyi açıkça mümkün kılıyor.
 */

export const BOOKING_STATUSES = [
  'pending',
  'awaiting_provider',
  'alternative_proposed',
  'waitlist',
  'reassigned_pending',
  'deposit_pending',
  'deposit_submitted',
  'confirmed',
  'completed_pending',
  'completed',
  'no_show',
  'refund_pending',
  'refund_submitted',
  'disputed',
  'cancelled',
  'expired',
] as const;

export type BookingState = (typeof BOOKING_STATUSES)[number];

/** Randevunun uzmanın takvimindeki saati işgal ettiği durumlar. */
export const SLOT_HOLDING_STATES: readonly BookingState[] = [
  'confirmed',
  'deposit_pending',
  'deposit_submitted',
];

/**
 * İzin verilen geçişler. Liste, sunucunun BUGÜN yaptığı her geçişi kapsayacak
 * şekilde çıkarıldı (`bookings.service`, `bookings.scheduler`, `payment.service`,
 * `ratings.service`) — yani makine devreye girdiğinde çalışan hiçbir akış kırılmaz.
 */
export const ALLOWED_TRANSITIONS: Record<BookingState, readonly BookingState[]> = {
  // Eski/çevrimdışı kayıtların doğduğu genel durum.
  pending: [
    'awaiting_provider',
    'alternative_proposed',
    'deposit_pending',
    'confirmed',
    'cancelled',
    'refund_pending',
    'expired',
  ],
  // Uzmanın yanıtı bekleniyor. Süre dolarsa scheduler `expired` yapar.
  awaiting_provider: [
    'deposit_pending', // onay + kapora isteniyor
    'confirmed', // onay, kapora yok (uzman KYC'siz → kapora alamaz)
    'alternative_proposed',
    'reassigned_pending',
    'cancelled',
    'refund_pending',
    'expired',
  ],
  alternative_proposed: [
    'confirmed', // müşteri öneriyi kabul etti
    'awaiting_provider', // müşteri karşı öneri yaptı
    'cancelled',
    'refund_pending',
    'expired',
  ],
  waitlist: ['awaiting_provider', 'deposit_pending', 'confirmed', 'cancelled', 'expired'],
  reassigned_pending: [
    'confirmed',
    'awaiting_provider',
    'deposit_pending',
    'cancelled',
    'expired',
  ],
  // ≡ HELD: slot tutuluyor, kapora dekontu bekleniyor, süre işliyor.
  deposit_pending: [
    'deposit_submitted',
    'confirmed',
    'cancelled',
    'refund_pending',
    'disputed',
    'expired',
  ],
  // ≡ DEPOSIT_REVIEW: dekont yüklendi, uzman inceliyor.
  deposit_submitted: [
    'confirmed', // uzman dekontu onayladı
    'deposit_pending', // dekont reddedildi → yeniden yükleme (≡ PAYMENT_REJECTED)
    'cancelled',
    'refund_pending',
    'disputed',
    'expired',
  ],
  confirmed: [
    'completed_pending',
    'no_show',
    'reassigned_pending',
    'cancelled',
    'refund_pending',
    'disputed',
  ],
  // Uzman "tamamlandı" dedi; müşterinin teyit/itiraz penceresi açık.
  completed_pending: ['completed', 'disputed'],
  // Kapalı. İtiraz yolu `disputed` üzerinden değil, admin süreciyle işler.
  completed: [],
  // Teyit penceresi boyunca YALNIZ itiraza açık — kapora yakma buna bağlı.
  no_show: ['disputed'],
  refund_pending: ['refund_submitted', 'cancelled', 'disputed'],
  refund_submitted: [
    'cancelled', // müşteri iadeyi aldı → kayıt kapanır
    'refund_pending', // müşteri iadeyi almadığını söyledi
    'disputed',
  ],
  // Admin çözer.
  disputed: ['cancelled', 'completed', 'refund_pending', 'no_show'],
  cancelled: [],
  expired: [],
};

export class InvalidTransitionError extends Error {
  readonly code = 'BOOKING_INVALID_TRANSITION';
  constructor(
    readonly from: BookingState,
    readonly to: BookingState,
  ) {
    super(`Geçersiz randevu geçişi: ${from} -> ${to}`);
    this.name = 'InvalidTransitionError';
  }
}

export function isBookingState(v: unknown): v is BookingState {
  return typeof v === 'string' && (BOOKING_STATUSES as readonly string[]).includes(v);
}

// Nesneye anahtarla erişim prototip zincirine düşebilir: `ALLOWED_TRANSITIONS['__proto__']`
// `Object.prototype` döndürür — truthy ama `includes` taşımaz. Haritayı Map'e alarak
// bu yolu tamamen kapatıyoruz (aynı tuzak `loyalty/earn-rules` içinde de vardı).
const GECIS = new Map<string, readonly BookingState[]>(Object.entries(ALLOWED_TRANSITIONS));

export function canTransition(from: BookingState, to: BookingState): boolean {
  return GECIS.get(from)?.includes(to) ?? false;
}

/**
 * Geçişi doğrular; geçersizse InvalidTransitionError fırlatır.
 * Yan etki üretmez — saf fonksiyon. Aktör yetkisi çağıran katmanda kontrol edilir.
 */
export function assertTransition(from: BookingState, to: BookingState): void {
  if (!canTransition(from, to)) {
    throw new InvalidTransitionError(from, to);
  }
}

export function isTerminal(status: BookingState): boolean {
  return (GECIS.get(status)?.length ?? 0) === 0;
}

export function holdsSlot(status: BookingState): boolean {
  return SLOT_HOLDING_STATES.includes(status);
}
