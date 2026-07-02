// @ayna/types — uygulamalar arası paylaşılan tipler (API sözleşmesi)
// Bkz. docs/planning/03-erd-draft.md, docs/planning/07-api-conventions.md

export type Locale = 'kk' | 'ru';

export type UserRole = 'user' | 'professional' | 'salon' | 'moderator' | 'admin';

/** Randevu durumları — docs/planning/04-booking-state-machine.md */
export type BookingStatus =
  | 'DRAFT'
  | 'PENDING_PROVIDER_CONFIRMATION'
  | 'CONFIRMED'
  | 'DEPOSIT_PENDING'
  | 'PAYMENT_PENDING'
  | 'PAID'
  | 'SCHEDULED'
  | 'CHECK_IN_AVAILABLE'
  | 'CHECKED_IN'
  | 'IN_SERVICE'
  | 'COMPLETED_BY_PROVIDER'
  | 'COMPLETION_PENDING_USER'
  | 'COMPLETED'
  | 'CANCELLED_BY_USER'
  | 'CANCELLED_BY_PROVIDER'
  | 'NO_SHOW_USER'
  | 'NO_SHOW_PROVIDER'
  | 'DISPUTED'
  | 'REFUND_PENDING'
  | 'PARTIALLY_REFUNDED'
  | 'REFUNDED'
  | 'CLOSED';

/**
 * UTC zaman aralığı — yarı-açık [startMs, endMs). Tüm backend zamanları UTC epoch
 * milisaniyedir (CLAUDE.md); kullanıcıya IANA timezone ile gösterilir.
 * Rezervasyon slot motorunun temel birimi (docs/planning/04, master §4.2).
 */
export interface Interval {
  startMs: number;
  endMs: number;
}

/** Standart API hata zarfı — docs/planning/07-api-conventions.md §4 */
export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: unknown[];
    requestId: string;
  };
}

/** Cursor tabanlı sayfalama cevabı — docs/planning/07-api-conventions.md §3 */
export interface Paginated<T> {
  data: T[];
  nextCursor: string | null;
}
