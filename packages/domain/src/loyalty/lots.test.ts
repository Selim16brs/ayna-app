import assert from 'node:assert/strict';
import { test } from 'node:test';
import { expiringWithin, replayLedger } from './lots.js';

const g = (s: string) => new Date(s);
const earn = (createdAt: string, points: number, expiresAt: string | null) => ({
  points,
  expiresAt: expiresAt ? g(expiresAt) : null,
  createdAt: g(createdAt),
});
const spend = (createdAt: string, points: number) => ({
  points: -Math.abs(points),
  expiresAt: null,
  createdAt: g(createdAt),
});

test('ESKİ HATA: harcanmış puan sonradan yanıp bakiyeyi eksiye düşüremez', () => {
  // computeAvailableBalance bu veride -100 döndürüyordu.
  const rows = [earn('2026-01-01', 100, '2026-04-01'), spend('2026-02-01', 100)];
  const s = replayLedger(rows, g('2026-05-01'));
  assert.equal(s.available, 0);
  assert.equal(s.expired, 0, 'harcanmış puan yanmış sayılmamalı');
  assert.equal(s.overspent, 0);
});

test('bakiye hiçbir zaman negatif olmaz', () => {
  const rows = [earn('2026-01-01', 50, '2026-02-01'), spend('2026-03-01', 200)];
  const s = replayLedger(rows, g('2026-04-01'));
  assert.equal(s.available, 0);
  assert.equal(s.expired, 50, 'harcamadan önce süresi dolmuştu');
  assert.equal(s.overspent, 200, 'karşılıksız harcama raporlanmalı');
});

test('süresi dolmamış puan sayılır', () => {
  const s = replayLedger([earn('2026-01-01', 300, '2026-06-01')], g('2026-03-01'));
  assert.equal(s.available, 300);
  assert.equal(s.expired, 0);
});

test('süresi dolan puan yanar', () => {
  const s = replayLedger([earn('2026-01-01', 300, '2026-04-01')], g('2026-05-01'));
  assert.equal(s.available, 0);
  assert.equal(s.expired, 300);
});

test('FIFO: önce süresi en YAKIN parti harcanır', () => {
  const rows = [
    earn('2026-01-01', 100, '2026-12-01'), // uzak
    earn('2026-01-02', 100, '2026-03-01'), // yakın
    spend('2026-02-01', 100),
  ];
  const s = replayLedger(rows, g('2026-04-01'));
  // Yakın parti harcandı → uzak parti hayatta, hiçbir şey yanmadı
  assert.equal(s.available, 100);
  assert.equal(s.expired, 0);
});

test('yanlış sıra kullanıcıyı zarara sokardı — karşı senaryo', () => {
  // Uzak parti önce harcansaydı yakın parti yanacak ve bakiye 0 olacaktı.
  const rows = [
    earn('2026-01-01', 100, '2026-12-01'),
    earn('2026-01-02', 100, '2026-03-01'),
    spend('2026-02-01', 100),
  ];
  assert.notEqual(replayLedger(rows, g('2026-04-01')).available, 0);
});

test('kısmi harcama partiyi böler', () => {
  const rows = [earn('2026-01-01', 100, '2026-12-01'), spend('2026-02-01', 30)];
  const s = replayLedger(rows, g('2026-03-01'));
  assert.equal(s.available, 70);
  assert.equal(s.lots.length, 1);
  assert.equal(s.lots[0]!.remaining, 70);
});

test('harcama birden çok partiye yayılır', () => {
  const rows = [
    earn('2026-01-01', 40, '2026-06-01'),
    earn('2026-01-02', 40, '2026-07-01'),
    earn('2026-01-03', 40, '2026-08-01'),
    spend('2026-02-01', 100),
  ];
  const s = replayLedger(rows, g('2026-03-01'));
  assert.equal(s.available, 20);
  assert.equal(s.lots.length, 1);
  assert.equal(s.lots[0]!.expiresAt?.toISOString(), g('2026-08-01').toISOString());
});

test('harcama anında YANMIŞ partiden düşülemez', () => {
  const rows = [
    earn('2026-01-01', 100, '2026-02-01'), // harcamadan önce yanar
    earn('2026-01-02', 100, '2026-12-01'),
    spend('2026-03-01', 100),
  ];
  const s = replayLedger(rows, g('2026-04-01'));
  assert.equal(s.expired, 100);
  assert.equal(s.available, 0);
  assert.equal(s.overspent, 0);
});

test('son kullanma tarihi olmayan puan yanmaz ve en sona düşer', () => {
  const rows = [
    earn('2026-01-01', 100, null),
    earn('2026-01-02', 100, '2026-03-01'),
    spend('2026-02-01', 100),
  ];
  const s = replayLedger(rows, g('2027-01-01'));
  assert.equal(s.available, 100, 'süresizler harcanmadan kalmalı');
  assert.equal(s.expired, 0);
  assert.equal(s.nextExpiry, null);
});

test('kayıt sırası karışık gelse de kronolojik oynatılır', () => {
  const rows = [spend('2026-02-01', 50), earn('2026-01-01', 100, '2026-12-01')];
  const s = replayLedger(rows, g('2026-03-01'));
  assert.equal(s.available, 50);
  assert.equal(s.overspent, 0);
});

test('lifetimeEarned harcamadan etkilenmez (seviye düşmez)', () => {
  const rows = [
    earn('2026-01-01', 500, '2026-12-01'),
    spend('2026-02-01', 400),
    earn('2026-03-01', 200, '2027-01-01'),
  ];
  const s = replayLedger(rows, g('2026-04-01'));
  assert.equal(s.lifetimeEarned, 700);
  assert.equal(s.available, 300);
});

test('nextExpiry en yakın canlı partiyi verir', () => {
  const rows = [earn('2026-01-01', 100, '2026-09-01'), earn('2026-01-02', 100, '2026-05-01')];
  const s = replayLedger(rows, g('2026-02-01'));
  assert.equal(s.nextExpiry?.toISOString(), g('2026-05-01').toISOString());
});

test('boş defter sıfır durum', () => {
  const s = replayLedger([], g('2026-01-01'));
  assert.deepEqual(
    { a: s.available, e: s.expired, l: s.lifetimeEarned, n: s.nextExpiry, o: s.overspent },
    { a: 0, e: 0, l: 0, n: null, o: 0 },
  );
});

test('sınırda: tam sona erme anında puan YANMIŞ sayılır', () => {
  const rows = [earn('2026-01-01', 100, '2026-03-01T00:00:00.000Z')];
  assert.equal(replayLedger(rows, g('2026-03-01T00:00:00.000Z')).available, 0);
  assert.equal(replayLedger(rows, g('2026-02-28T23:59:59.999Z')).available, 100);
});

test('sıfır puanlı kayıt yok sayılır', () => {
  const rows = [earn('2026-01-01', 100, '2026-12-01'), earn('2026-01-02', 0, '2026-12-01')];
  const s = replayLedger(rows, g('2026-02-01'));
  assert.equal(s.available, 100);
  assert.equal(s.lots.length, 1);
});

test('expiringWithin: yaklaşan yanmayı bildirir', () => {
  const rows = [
    earn('2026-01-01', 100, '2026-02-10'), // 10 gün içinde
    earn('2026-01-01', 200, '2026-06-01'), // uzak
  ];
  const at = g('2026-02-01');
  const s = replayLedger(rows, at);
  assert.equal(expiringWithin(s, at, 30), 100);
  assert.equal(expiringWithin(s, at, 5), 0);
  assert.equal(expiringWithin(s, at, 365), 300);
});

test('girdi dizisi değiştirilmez (saf fonksiyon)', () => {
  const rows = [earn('2026-01-01', 100, '2026-12-01'), spend('2026-02-01', 50)];
  const kopya = JSON.stringify(rows);
  replayLedger(rows, g('2026-03-01'));
  assert.equal(JSON.stringify(rows), kopya);
});
