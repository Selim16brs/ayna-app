import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  BACKOFF_MINUTES,
  KEEP_SENT_DAYS,
  MAX_ATTEMPTS,
  deadTokensFrom,
  nextState,
  shortError,
} from './outbox.rules';

const T0 = Date.UTC(2026, 7, 26, 12, 0, 0);
const dk = (n: number) => new Date(T0 + n * 60_000).toISOString();

test('ilk başarısızlıkta 1 dakika sonra tekrar denenir', () => {
  const r = nextState(1, T0);
  assert.equal(r.status, 'pending');
  assert.equal(r.nextAttemptAt.toISOString(), dk(1));
});

test('aralık artıyor — kalıcı sorun sunucuyu yormuyor', () => {
  assert.equal(nextState(2, T0).nextAttemptAt.toISOString(), dk(5));
  assert.equal(nextState(3, T0).nextAttemptAt.toISOString(), dk(15));
  assert.equal(nextState(4, T0).nextAttemptAt.toISOString(), dk(60));
  assert.equal(nextState(5, T0).nextAttemptAt.toISOString(), dk(360));
});

test('hak bitince dead — bayat bildirimi teslim etmenin faydası yok', () => {
  assert.equal(nextState(MAX_ATTEMPTS, T0).status, 'dead');
  assert.equal(nextState(MAX_ATTEMPTS + 5, T0).status, 'dead');
  assert.equal(nextState(MAX_ATTEMPTS - 1, T0).status, 'pending');
});

test('bozuk sayaç değeri patlatmıyor', () => {
  assert.equal(nextState(-3, T0).status, 'pending');
  assert.equal(nextState(1.7, T0).status, 'pending');
});

test('toplam kapsama ~31 saat', () => {
  const toplam = BACKOFF_MINUTES.reduce((a, b) => a + b, 0);
  assert.equal(toplam, 1 + 5 + 15 + 60 + 360 + 1440);
  assert.ok(toplam / 60 > 30 && toplam / 60 < 32, `${toplam / 60} saat`);
});

test('saklama süresi makul — PII süresiz durmuyor', () => {
  assert.equal(KEEP_SENT_DAYS, 7);
});

// ── Expo yanıtı ─────────────────────────────────────────────────────────────

const yanit = (tickets: unknown[]) => ({ data: tickets });

test('DeviceNotRegistered token silinmek üzere işaretlenir', () => {
  const r = deadTokensFrom(
    ['ExponentPushToken[a]', 'ExponentPushToken[b]'],
    yanit([{ status: 'ok' }, { status: 'error', details: { error: 'DeviceNotRegistered' } }]),
  );
  assert.deepEqual(r.dead, ['ExponentPushToken[b]']);
  assert.equal(r.hatali, 1);
});

test('başka hata token silmez — geçici olabilir', () => {
  const r = deadTokensFrom(
    ['ExponentPushToken[a]'],
    yanit([{ status: 'error', details: { error: 'MessageTooBig' } }]),
  );
  assert.deepEqual(r.dead, []);
  assert.equal(r.hatali, 1, 'hata yine sayılmalı');
});

test('hepsi başarılıysa silinecek token yok', () => {
  const r = deadTokensFrom(['ExponentPushToken[a]'], yanit([{ status: 'ok' }]));
  assert.deepEqual(r.dead, []);
  assert.equal(r.hatali, 0);
});

test('sıra eşleşmesi doğru — yanlış token silinmiyor', () => {
  const r = deadTokensFrom(
    ['t0', 't1', 't2'],
    yanit([
      { status: 'error', details: { error: 'DeviceNotRegistered' } },
      { status: 'ok' },
      { status: 'error', details: { error: 'DeviceNotRegistered' } },
    ]),
  );
  assert.deepEqual(r.dead, ['t0', 't2']);
});

test('beklenmeyen yanıt biçimi çökertmiyor', () => {
  for (const y of [null, undefined, {}, { data: 'x' }, { data: null }, [] as unknown]) {
    const r = deadTokensFrom(['t0'], y);
    assert.deepEqual(r.dead, []);
    assert.equal(r.hatali, 0);
  }
});

test('yanıt gönderilenden uzunsa taşma olmuyor', () => {
  const r = deadTokensFrom(
    ['t0'],
    yanit([
      { status: 'error', details: { error: 'DeviceNotRegistered' } },
      { status: 'error', details: { error: 'DeviceNotRegistered' } },
    ]),
  );
  assert.deepEqual(r.dead, ['t0'], 'olmayan token uydurulmamalı');
});

// ── Hata metni ──────────────────────────────────────────────────────────────

test('uzun hata kısaltılır', () => {
  const uzun = 'x'.repeat(500);
  const r = shortError(new Error(uzun));
  assert.ok(r.length <= 301, String(r.length));
  assert.ok(r.endsWith('…'));
});

test('kısa hata olduğu gibi kalır', () => {
  assert.equal(shortError(new Error('ağ hatası')), 'ağ hatası');
  assert.equal(shortError('düz metin'), 'düz metin');
});
