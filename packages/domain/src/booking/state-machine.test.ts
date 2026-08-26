import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  ALLOWED_TRANSITIONS,
  BOOKING_STATUSES,
  type BookingState,
  InvalidTransitionError,
  assertTransition,
  canTransition,
  holdsSlot,
  isBookingState,
  isTerminal,
} from './state-machine.js';

test('geçerli geçişe izin verir', () => {
  assert.equal(canTransition('deposit_pending', 'deposit_submitted'), true);
  assert.equal(canTransition('deposit_submitted', 'confirmed'), true);
  assert.equal(canTransition('confirmed', 'completed_pending'), true);
  assert.equal(canTransition('completed_pending', 'completed'), true);
});

test('geçersiz geçişi reddeder', () => {
  assert.throws(() => assertTransition('cancelled', 'completed'), InvalidTransitionError);
  assert.throws(() => assertTransition('completed', 'cancelled'), InvalidTransitionError);
});

test('KARA LİSTENİN kaçırdığı geçiş artık kapalı: kapora atlanamaz', () => {
  // Eski koruma yalnız kapalı durumlardan çıkışı engelliyordu; deposit_pending
  // kapalı olmadığı için doğrudan 'completed' serbestti — yani kapora hiç
  // ödenmeden randevu tamamlanmış sayılabiliyordu.
  assert.equal(canTransition('deposit_pending', 'completed'), false);
  assert.equal(canTransition('deposit_pending', 'completed_pending'), false);
  assert.equal(canTransition('awaiting_provider', 'completed'), false);
  assert.equal(canTransition('waitlist', 'completed'), false);
});

test('iade akışı sırası atlanamaz', () => {
  assert.equal(canTransition('refund_pending', 'refund_submitted'), true);
  assert.equal(canTransition('refund_submitted', 'cancelled'), true);
  // Uzman dekont yüklemeden kayıt kapanamaz
  assert.equal(canTransition('refund_pending', 'completed'), false);
});

test('no_show yalnız itiraza açık — kapora yakma buna bağlı', () => {
  assert.deepEqual([...ALLOWED_TRANSITIONS.no_show], ['disputed']);
  assert.equal(canTransition('no_show', 'completed'), false);
  assert.equal(canTransition('no_show', 'cancelled'), false);
});

test('terminal durumlar', () => {
  assert.equal(isTerminal('completed'), true);
  assert.equal(isTerminal('cancelled'), true);
  assert.equal(isTerminal('expired'), true);
  assert.equal(isTerminal('confirmed'), false);
});

test('tüm durumlar haritada tanımlı', () => {
  for (const s of BOOKING_STATUSES) {
    assert.ok(ALLOWED_TRANSITIONS[s], `${s} haritada yok`);
  }
  assert.equal(Object.keys(ALLOWED_TRANSITIONS).length, BOOKING_STATUSES.length);
});

test('hedef durumların hepsi geçerli durum — yazım hatası yakalanır', () => {
  for (const [from, hedefler] of Object.entries(ALLOWED_TRANSITIONS)) {
    for (const to of hedefler) {
      assert.ok(isBookingState(to), `${from} → ${to}: '${to}' tanımlı bir durum değil`);
    }
  }
});

test('hiçbir durum kendine geçmiyor — idempotentlik geçiş değil', () => {
  for (const s of BOOKING_STATUSES) {
    assert.equal(canTransition(s, s), false, `${s} kendine geçebiliyor`);
  }
});

test('her terminal olmayan durumdan bir kapanış yolu var', () => {
  const kapanis: BookingState[] = ['cancelled', 'completed', 'expired'];
  for (const s of BOOKING_STATUSES) {
    if (isTerminal(s)) continue;
    // Genişlik öncelikli arama: kapanışa ulaşılabiliyor mu?
    const gorulen = new Set<BookingState>([s]);
    const kuyruk: BookingState[] = [s];
    let ulasti = false;
    while (kuyruk.length) {
      const cur = kuyruk.shift()!;
      if (kapanis.includes(cur)) {
        ulasti = true;
        break;
      }
      for (const n of ALLOWED_TRANSITIONS[cur]) {
        if (!gorulen.has(n)) {
          gorulen.add(n);
          kuyruk.push(n);
        }
      }
    }
    assert.ok(ulasti, `${s} durumundan kapanışa ulaşılamıyor — randevu sonsuza kilitlenir`);
  }
});

test('slot tutan durumlar', () => {
  assert.equal(holdsSlot('confirmed'), true);
  assert.equal(holdsSlot('deposit_pending'), true);
  assert.equal(holdsSlot('deposit_submitted'), true);
  assert.equal(holdsSlot('cancelled'), false);
  assert.equal(holdsSlot('awaiting_provider'), false, 'aynı slota birden çok talep olabilir');
  assert.equal(holdsSlot('completed'), false);
});

test('isBookingState bilinmeyeni eler', () => {
  assert.equal(isBookingState('confirmed'), true);
  assert.equal(isBookingState('SCHEDULED'), false, 'eski planlama sözlüğü');
  assert.equal(isBookingState('refunded'), false, "Prisma enum'unda yok");
  assert.equal(isBookingState(null), false);
  assert.equal(isBookingState('__proto__'), false);
});

test('canTransition bilinmeyen kaynakta patlamaz, false döner', () => {
  assert.equal(canTransition('__proto__' as BookingState, 'completed'), false);
  assert.equal(canTransition('yok' as BookingState, 'completed'), false);
});

// ── Sunucunun BUGÜN yaptığı geçişlerin hepsi izinli mi? ────────────────────
// Bu liste kod okunarak çıkarıldı (bookings.service / scheduler / payment.service).
// Makine devreye girdiğinde çalışan bir akışın kırılmadığının kanıtı.
test('üretimdeki her geçiş beyaz listede', () => {
  const uretim: Array<[BookingState, BookingState, string]> = [
    ['awaiting_provider', 'deposit_pending', 'approve (KYC onaylı)'],
    ['awaiting_provider', 'confirmed', 'approve (kaporasız)'],
    ['awaiting_provider', 'alternative_proposed', 'propose'],
    ['awaiting_provider', 'expired', 'scheduler: yanıt süresi'],
    ['alternative_proposed', 'confirmed', 'accept'],
    ['alternative_proposed', 'awaiting_provider', 'counter'],
    ['deposit_pending', 'deposit_submitted', 'uploadReceipt / payment'],
    ['deposit_pending', 'expired', 'scheduler: kapora süresi'],
    ['deposit_submitted', 'confirmed', 'confirmDepositReceipt'],
    ['confirmed', 'completed_pending', 'complete'],
    ['completed_pending', 'completed', 'confirmCompletion / scheduler'],
    ['completed_pending', 'disputed', 'dispute'],
    ['confirmed', 'no_show', 'noShow'],
    ['no_show', 'disputed', 'dispute'],
    ['confirmed', 'cancelled', 'cancel (geç iptal)'],
    ['confirmed', 'refund_pending', 'cancel (serbest) / providerNoShow'],
    ['deposit_submitted', 'cancelled', 'cancel (geç iptal)'],
    ['deposit_submitted', 'refund_pending', 'cancel (serbest)'],
    ['deposit_pending', 'cancelled', 'cancel (kapora ödenmemiş)'],
    ['awaiting_provider', 'cancelled', 'cancel'],
    ['pending', 'cancelled', 'cancel'],
    ['waitlist', 'cancelled', 'cancel'],
    ['refund_pending', 'refund_submitted', 'uploadRefundReceipt'],
    ['refund_submitted', 'cancelled', 'confirmRefund'],
  ];
  for (const [from, to, nerede] of uretim) {
    assert.ok(canTransition(from, to), `${nerede}: ${from} → ${to} reddedilir — akış kırılır`);
  }
});
