import type { BookingStatus } from '@ayna/types';

/**
 * Randevu durum makinesi — docs/planning/04-booking-state-machine.md
 * Geçersiz geçişler reddedilir (EK A.6).
 */
export const ALLOWED_TRANSITIONS: Record<BookingStatus, readonly BookingStatus[]> = {
  DRAFT: ['PENDING_PROVIDER_CONFIRMATION', 'CONFIRMED', 'CANCELLED_BY_USER'],
  PENDING_PROVIDER_CONFIRMATION: ['CONFIRMED', 'CANCELLED_BY_PROVIDER', 'CANCELLED_BY_USER'],
  CONFIRMED: [
    'DEPOSIT_PENDING',
    'PAYMENT_PENDING',
    'SCHEDULED',
    'CANCELLED_BY_USER',
    'CANCELLED_BY_PROVIDER',
  ],
  DEPOSIT_PENDING: ['PAID', 'CANCELLED_BY_USER', 'CANCELLED_BY_PROVIDER'],
  PAYMENT_PENDING: ['PAID', 'CANCELLED_BY_USER', 'CANCELLED_BY_PROVIDER'],
  PAID: ['SCHEDULED', 'REFUND_PENDING'],
  SCHEDULED: ['CHECK_IN_AVAILABLE', 'CANCELLED_BY_USER', 'CANCELLED_BY_PROVIDER'],
  CHECK_IN_AVAILABLE: [
    'CHECKED_IN',
    'NO_SHOW_USER',
    'NO_SHOW_PROVIDER',
    'CANCELLED_BY_USER',
    'CANCELLED_BY_PROVIDER',
  ],
  CHECKED_IN: ['IN_SERVICE', 'CANCELLED_BY_PROVIDER'],
  IN_SERVICE: ['COMPLETED_BY_PROVIDER'],
  COMPLETED_BY_PROVIDER: ['COMPLETION_PENDING_USER'],
  COMPLETION_PENDING_USER: ['COMPLETED', 'DISPUTED'],
  COMPLETED: ['DISPUTED', 'CLOSED'],
  CANCELLED_BY_USER: ['REFUND_PENDING', 'CLOSED'],
  CANCELLED_BY_PROVIDER: ['REFUND_PENDING', 'CLOSED'],
  NO_SHOW_USER: ['CLOSED'],
  NO_SHOW_PROVIDER: ['REFUND_PENDING', 'CLOSED'],
  DISPUTED: ['REFUND_PENDING', 'CLOSED'],
  REFUND_PENDING: ['REFUNDED', 'PARTIALLY_REFUNDED'],
  PARTIALLY_REFUNDED: ['CLOSED'],
  REFUNDED: ['CLOSED'],
  CLOSED: [],
};

export class InvalidTransitionError extends Error {
  readonly code = 'BOOKING_INVALID_TRANSITION';
  constructor(
    readonly from: BookingStatus,
    readonly to: BookingStatus,
  ) {
    super(`Geçersiz randevu geçişi: ${from} -> ${to}`);
    this.name = 'InvalidTransitionError';
  }
}

export function canTransition(from: BookingStatus, to: BookingStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

/**
 * Geçişi doğrular; geçersizse InvalidTransitionError fırlatır.
 * Yan etki üretmez — saf fonksiyon. Aktör yetkisi çağıran katmanda kontrol edilir.
 */
export function assertTransition(from: BookingStatus, to: BookingStatus): void {
  if (!canTransition(from, to)) {
    throw new InvalidTransitionError(from, to);
  }
}

export function isTerminal(status: BookingStatus): boolean {
  return ALLOWED_TRANSITIONS[status].length === 0;
}
