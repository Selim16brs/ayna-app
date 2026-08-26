import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cakisanRandevular, dakika, type BookingWindow, type DayHours } from './hours-conflict.js';

/**
 * Uzman çalışma saatini değiştirirken MEVCUT randevular uyarılmalı.
 *
 * Saat değişikliği admin onayına gitmiyor (kendi takvimi), ama kapattığı bir
 * aralıkta onaylanmış müşteri randevusu varsa sessizce olmamalı — müşteri o
 * saate göre plan yaptı.
 */

const acik = (wd: number, from = '10:00', to = '20:00'): DayHours => ({ wd, open: true, from, to });
const kapali = (wd: number): DayHours => ({ wd, open: false, from: '10:00', to: '20:00' });
const rnd = (wd: number, startMin: number, durationMin = 60): BookingWindow => ({
  id: `b${wd}-${startMin}`,
  wd,
  startMin,
  durationMin,
});

test('dakika: geçerli saatler', () => {
  assert.equal(dakika('00:00'), 0);
  assert.equal(dakika('10:30'), 630);
  assert.equal(dakika('23:59'), 1439);
});

test('dakika: bozuk girdi null', () => {
  for (const x of ['', '24:00', '10:60', 'abc', '1030']) assert.equal(dakika(x), null);
});

test('pencere içindeki randevu çakışmaz', () => {
  // Salı 14:00, 60dk — 10:00-20:00 arası
  assert.deepEqual(cakisanRandevular([acik(2)], [rnd(2, 840)]), []);
});

test('GÜN KAPATILIRSA o günün randevusu çakışır', () => {
  const c = cakisanRandevular([kapali(2)], [rnd(2, 840)]);
  assert.equal(c.length, 1);
});

test('başlangıç yeni açılıştan ÖNCEYSE çakışır', () => {
  // Yeni açılış 12:00, randevu 11:00
  assert.equal(cakisanRandevular([acik(3, '12:00', '20:00')], [rnd(3, 660)]).length, 1);
});

test('bitiş yeni kapanıştan SONRAYSA çakışır', () => {
  // Kapanış 18:00, randevu 17:30 + 60dk = 18:30
  assert.equal(cakisanRandevular([acik(4, '10:00', '18:00')], [rnd(4, 1050, 60)]).length, 1);
});

test('tam kapanışta biten randevu çakışmaz', () => {
  // Kapanış 18:00, randevu 17:00 + 60 = 18:00 → sınırda, içeride
  assert.deepEqual(cakisanRandevular([acik(4, '10:00', '18:00')], [rnd(4, 1020, 60)]), []);
});

test('o gün için KAYIT YOKSA kapalı sayılır', () => {
  // Eksik veriyi "açık" varsaymak uyarıyı sessizce atlamak olurdu.
  assert.equal(cakisanRandevular([acik(1)], [rnd(5, 840)]).length, 1);
});

test('bozuk saat çakışma sayılır — uzman görsün', () => {
  assert.equal(cakisanRandevular([acik(2, 'xx', '20:00')], [rnd(2, 840)]).length, 1);
  // Bitiş başlangıçtan önceyse de anlamsız
  assert.equal(cakisanRandevular([acik(2, '20:00', '10:00')], [rnd(2, 840)]).length, 1);
});

test('yalnız çakışanlar döner, diğerleri korunur', () => {
  const c = cakisanRandevular(
    [acik(1), kapali(2), acik(3)],
    [rnd(1, 840), rnd(2, 840), rnd(3, 840)],
  );
  assert.deepEqual(
    c.map((x) => x.wd),
    [2],
  );
});
