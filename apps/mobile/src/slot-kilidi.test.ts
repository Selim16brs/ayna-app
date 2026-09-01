import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cakisiyor, doluAraliklar, slotTutuyor } from './booking-flow';
import type { BookingStatus } from './data';

/**
 * §4.2 — "Talep gönderildiği an slot KİLİTLENİR."
 *
 * Kurucunun bildirdiği hata: "aynı saatten randevu gönderebiliyor, ekran
 * açılıp kapanınca seçim olabiliyor." Sebep: dolu saatler YALNIZ sunucudan
 * okunuyordu. Randevu gönderildikten sonra kayıt sunucuya ulaşana kadar (ağ
 * yavaşsa saniyeler, ağ yoksa hiç) o saat boş görünüyor, ekrandan çıkıp
 * dönünce ikinci kez seçilebiliyordu.
 */

const randevu = (proId: string, startMs: number, durationMin: number, status: BookingStatus) => ({
  proId,
  startMs,
  durationMin,
  status,
});

const SAAT = 60 * 60_000;
const ON = 1_800_000_000_000; // sabit an — testler saate bağlı olmamalı

test('kendi bekleyen randevun O SAATİ doldurur — sunucu haber vermeden', () => {
  const dolu = doluAraliklar('p1', [], [randevu('p1', ON, 90, 'onay_bekliyor')]);
  assert.equal(dolu.length, 1);
  assert.ok(
    cakisiyor({ startMs: ON, endMs: ON + 60 * 60_000 }, dolu[0]!),
    'aynı saat hâlâ seçilebiliyor — çifte talep',
  );
});

test('sunucudan gelenler ve yereldekiler BİRLİKTE sayılır', () => {
  const uzak = [{ startMs: ON + 4 * SAAT, endMs: ON + 5 * SAAT }];
  const dolu = doluAraliklar('p1', uzak, [randevu('p1', ON, 60, 'depozito_bekliyor')]);
  assert.equal(dolu.length, 2, 'iki kaynaktan biri düşüyor');
});

test('BAŞKA uzmanın randevusu bu uzmanın takvimini doldurmaz', () => {
  const dolu = doluAraliklar('p1', [], [randevu('p2', ON, 60, 'onay_bekliyor')]);
  assert.equal(dolu.length, 0);
});

test('KAPANMIŞ randevu saati serbest bırakır', () => {
  // İptal edilen ya da düşen randevu slotu tutmaya devam ederse, uzmanın
  // takvimi hiç boşalmaz.
  for (const st of ['iptal_musteri', 'iptal_uzman', 'otomatik_dustu', 'tamamlandi'] as const) {
    const dolu = doluAraliklar('p1', [], [randevu('p1', ON, 60, st)]);
    assert.equal(dolu.length, 0, `${st} hâlâ slot tutuyor`);
  }
});

test('slot tutan durumlar §4.2 ile aynı', () => {
  for (const st of ['onay_bekliyor', 'depozito_bekliyor', 'kesinlesti', 'hizmet_gunu'] as const) {
    assert.ok(slotTutuyor(st), `${st} slot tutmuyor — o saat ikinci kez satılabilir`);
  }
  assert.ok(!slotTutuyor('taslak'), 'gönderilmemiş taslak uzmanın takvimini kilitliyor');
});

test('bitiş anı çakışma değil — 14:00 biten iş 14:00 başlayanı engellemez', () => {
  const a = { startMs: ON, endMs: ON + SAAT };
  const b = { startMs: ON + SAAT, endMs: ON + 2 * SAAT };
  assert.equal(cakisiyor(a, b), false, 'ardışık randevular birbirini engelliyor');
  assert.equal(cakisiyor(a, { startMs: ON + SAAT - 1, endMs: ON + 2 * SAAT }), true);
});

test('süresi bilinmeyen randevu 60 dk sayılır — sıfır sayılmaz', () => {
  // durationMin yoksa 0 varsayılsaydı aralık boş kalır ve slot boş görünürdü.
  const dolu = doluAraliklar(
    'p1',
    [],
    [{ proId: 'p1', startMs: ON, status: 'onay_bekliyor' as BookingStatus }],
  );
  assert.equal(dolu[0]!.endMs - dolu[0]!.startMs, 60 * 60_000);
});
