import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cevapPenceresiMs, cevapSonu, DEFAULT_WINDOWS, EN_KISA_CEVAP_MS } from './booking-windows';

/**
 * UZMANIN CEVAP SÜRESİ — randevuya kalan süreyle ORANTILI.
 *
 * Kurucu: "kullanıcının talebi zaman olarak randevu zamanına yakınsa cevap
 * verme süresi buna göre orantılanmalı. hemen süre doldu denmemesi lazım."
 */

const W = DEFAULT_WINDOWS;
const DK = 60_000;
const SAAT = 3_600_000;
const simdi = 1_700_000_000_000;

test('UZAK randevuda TAM pencere', () => {
  // İki gün sonrası için: uzmanın tam 3 saati var.
  assert.equal(cevapPenceresiMs(W, simdi + 48 * SAAT, simdi), 3 * SAAT);
});

test('YAKIN randevuda pencere KISALIYOR ama SIFIRLANMIYOR', () => {
  /*
   * Asıl hata buydu: randevu saatine 3 saatten az kalan talep ANINDA
   * düşüyordu. Sabah 08:30'da saat 10:00 için gelen talep uzmana hiç
   * ulaşmıyordu.
   */
  const pencere = cevapPenceresiMs(W, simdi + 90 * DK, simdi);
  assert.ok(pencere > 0, 'yakın randevuda pencere hiç açılmıyor');
  assert.equal(pencere, 45 * DK, 'kalan sürenin yarısı verilmiyor');
});

test('ALT SINIR uygulanıyor — ama randevu saatini aşmadan', () => {
  /*
   * 40 dakika kala yarısı 20 dk; alt sınırın (15 dk) üstünde, yarı kuralı
   * işliyor. 20 dakika kala yarısı 10 dk — alt sınır devreye giriyor ve
   * pencere 15 dakikaya ÇIKIYOR.
   */
  assert.equal(cevapPenceresiMs(W, simdi + 40 * DK, simdi), 20 * DK);
  assert.equal(cevapPenceresiMs(W, simdi + 20 * DK, simdi), EN_KISA_CEVAP_MS);
  /*
   * 10 dakika kala alt sınır randevu saatini AŞARDI: uzman randevu saati
   * geçtikten sonra onaylayabilir, müşteri gelmemiş bir randevunun
   * onayını alırdı. Pencere kalan süreye kırpılıyor.
   */
  assert.equal(cevapPenceresiMs(W, simdi + 10 * DK, simdi), 10 * DK);
});

test('RANDEVU SAATİ GEÇMİŞSE pencere YOK', () => {
  // Geçmişe randevu onaylanamaz.
  assert.equal(cevapPenceresiMs(W, simdi - DK, simdi), 0);
  assert.equal(cevapSonu(W, simdi - DK, simdi), null);
});

test('SAATSİZ talepte TAM pencere', () => {
  // Teklif toplama talebinde henüz saat yok; kısaltacak bir şey de yok.
  assert.equal(cevapPenceresiMs(W, null, simdi), 3 * SAAT);
  assert.equal(cevapPenceresiMs(W, undefined, simdi), 3 * SAAT);
});

test('PENCERE hiçbir zaman randevu saatini AŞMIYOR', () => {
  /*
   * Aşsaydı uzman randevu saatinden SONRA onaylayabilirdi: müşteri
   * gelmemiş bir randevunun onayını alırdı.
   */
  for (const kalanDk of [16, 20, 45, 90, 179, 400]) {
    const start = simdi + kalanDk * DK;
    const son = cevapSonu(W, start, simdi);
    assert.ok(son, `${kalanDk} dk: pencere yok`);
    assert.ok(son!.getTime() <= start, `${kalanDk} dk: pencere randevu saatini aşıyor`);
  }
});

test('ALT SINIR randevu saatini aşabileceği durumda da güvenli', () => {
  // 15 dakikadan az kalmışsa alt sınır randevu saatini aşar; o durumda
  // pencere randevu saatinde bitiyor olmalı — testin üstteki hâli bunu
  // 16 dk'dan başlatıyor, burada sınırın kendisi sınanıyor.
  const start = simdi + 5 * DK;
  const son = cevapSonu(W, start, simdi);
  assert.ok(son);
  assert.ok(son!.getTime() <= start, 'çok kısa kalan sürede pencere randevuyu aşıyor');
});
