import assert from 'node:assert/strict';
import { test } from 'node:test';
import { type ArgumentsHost, BadRequestException, ConflictException } from '@nestjs/common';
import { AllExceptionsFilter } from './all-exceptions.filter';

type HataZarfi = { error: { code: string; message: string; requestId: string; details?: unknown[] } };
type Yakalanan = { status: number; body: HataZarfi };

function calistir(exception: unknown): Yakalanan {
  const out: Yakalanan = { status: 0, body: {} };
  const res = {
    status(s: number) {
      out.status = s;
      return this;
    },
    json(b: HataZarfi) {
      out.body = b;
      return this;
    },
  };
  const host = {
    switchToHttp: () => ({
      getResponse: () => res,
      getRequest: () => ({ requestId: 'req-1' }),
    }),
  };
  new AllExceptionsFilter().catch(exception, host as unknown as ArgumentsHost);
  return out;
}

// Prisma'nın gerçek hata nesnesinin biçimi: code + meta.target
const prismaHata = (code: string, target?: unknown) =>
  Object.assign(new Error('Unique constraint failed on the fields: (`slot_key`)'), {
    code,
    meta: target === undefined ? undefined : { target },
  });

test('slot_key ihlali 409 SLOT_CONFLICT olur — 500 değil', () => {
  const r = calistir(prismaHata('P2002', ['slot_key']));
  assert.equal(r.status, 409);
  assert.equal(r.body.error.code, 'SLOT_CONFLICT');
});

test('meta.target string olarak da gelebilir', () => {
  const r = calistir(prismaHata('P2002', 'bookings_slot_key_key'));
  assert.equal(r.status, 409);
  assert.equal(r.body.error.code, 'SLOT_CONFLICT');
});

test('dekont hash ihlali anlaşılır 409 verir', () => {
  const r = calistir(prismaHata('P2002', ['receipt_hash']));
  assert.equal(r.status, 409);
  assert.equal(r.body.error.code, 'RECEIPT_ALREADY_USED');
});

test('iade dekontu hash ihlali de aynı kodu verir', () => {
  const r = calistir(prismaHata('P2002', ['refund_receipt_hash']));
  assert.equal(r.body.error.code, 'RECEIPT_ALREADY_USED');
});

test('bilinmeyen unique ihlali genel 409', () => {
  const r = calistir(prismaHata('P2002', ['email']));
  assert.equal(r.status, 409);
  assert.equal(r.body.error.code, 'ALREADY_EXISTS');
});

test('meta hiç yoksa çökmez', () => {
  const r = calistir(prismaHata('P2002'));
  assert.equal(r.status, 409);
  assert.equal(r.body.error.code, 'ALREADY_EXISTS');
});

test('Prisma ham mesajı istemciye SIZMAZ — şema adı taşıyor', () => {
  const r = calistir(prismaHata('P2002', ['slot_key']));
  assert.equal(
    /slot_key|Unique constraint/.test(String(r.body.error.message)),
    false,
    `ham Prisma mesajı sızdı: ${r.body.error.message}`,
  );
});

test('P2025 → 404', () => {
  const r = calistir(prismaHata('P2025'));
  assert.equal(r.status, 404);
  assert.equal(r.body.error.code, 'NOT_FOUND');
});

test('P2003 → 409', () => {
  const r = calistir(prismaHata('P2003'));
  assert.equal(r.status, 409);
  assert.equal(r.body.error.code, 'REFERENCE_CONFLICT');
});

test('tanınmayan Prisma kodu 500 ama mesajı sızdırmaz', () => {
  const r = calistir(prismaHata('P9999'));
  assert.equal(r.status, 500);
  assert.equal(r.body.error.code, 'INTERNAL_ERROR');
  assert.equal(/Unique constraint/.test(String(r.body.error.message)), false);
});

test('HttpException davranışı değişmedi', () => {
  const r = calistir(new ConflictException({ code: 'SLOT_CONFLICT', message: 'Bu saat dolu' }));
  assert.equal(r.status, 409);
  assert.equal(r.body.error.code, 'SLOT_CONFLICT');
  assert.equal(r.body.error.message, 'Bu saat dolu');
});

test('doğrulama hatası davranışı değişmedi', () => {
  const r = calistir(new BadRequestException({ code: 'VALIDATION', message: 'Geçersiz' }));
  assert.equal(r.status, 400);
  assert.equal(r.body.error.code, 'VALIDATION');
});

test('requestId her cevapta var', () => {
  assert.equal(calistir(prismaHata('P2002', ['slot_key'])).body.error.requestId, 'req-1');
  assert.equal(calistir(new Error('boom')).body.error.requestId, 'req-1');
});

test('P harfiyle başlayan ama Prisma olmayan kod eski yolda kalır', () => {
  // 'PAYMENT_FAILED' Prisma kodu değil — /^P\d{4}$/ eşleşmemeli.
  const r = calistir(Object.assign(new Error('ödeme'), { code: 'PAYMENT_FAILED' }));
  assert.equal(r.body.error.code, 'PAYMENT_FAILED');
});

test('bilinen alan kodları eski davranışını korur', () => {
  const r = calistir(
    Object.assign(new Error('geçersiz geçiş'), { code: 'BOOKING_INVALID_TRANSITION' }),
  );
  assert.equal(r.status, 409);
});
