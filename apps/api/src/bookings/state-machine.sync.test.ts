import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BookingStatus } from '@prisma/client';
import { BOOKING_STATUSES, canTransition } from '@ayna/domain';

// Durum makinesi `packages/domain` içinde, enum ise Prisma şemasında yaşıyor.
// İkisi ayrışırsa sonuç sessiz: şemaya eklenen yeni bir durum makinede
// bulunmaz, `canTransition` her hedefe false döner ve o durumdaki randevular
// hiçbir işlem kabul etmez — kullanıcı için "randevum kilitlendi" demektir.
// Bu test ayrışmayı derleme değil, çalıştırma zamanında yakalar.

test('Prisma enum ile durum makinesi birebir aynı', () => {
  const enumler = Object.values(BookingStatus).sort();
  const makine = [...BOOKING_STATUSES].sort();
  assert.deepEqual(
    makine,
    enumler,
    `Ayrışma var.\n  Yalnız enum'da: ${enumler.filter((s) => !makine.includes(s as never))}\n  Yalnız makinede: ${makine.filter((s) => !enumler.includes(s))}`,
  );
});

test('her enum değeri en az bir geçiş kaynağı ya da terminal', () => {
  for (const s of Object.values(BookingStatus)) {
    const hedefVar = Object.values(BookingStatus).some((t) =>
      canTransition(s as never, t as never),
    );
    const terminal = ['completed', 'cancelled', 'expired'].includes(s);
    assert.ok(hedefVar || terminal, `${s} ne geçiş yapabiliyor ne de terminal — ölü durum`);
  }
});
