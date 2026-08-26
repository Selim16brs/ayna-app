import assert from 'node:assert/strict';
import { test } from 'node:test';
import { kk, ru, tr } from '@ayna/i18n';

/**
 * Yüzen alt menünün genişlik hesabı.
 *
 * Bu bar üç kez flex ile kuruldu ve üçünde de sekme kayboldu:
 *   1) aktif hap taştı, son iki sekme ekran dışına itildi,
 *   2) overflow:hidden konunca sekmeler GİZLENDİ (erişilemez oldular),
 *   3) hap küçültülünce ikon ve etiket ezilip boş bir ovale döndü.
 *
 * Ortak sebep: grow/shrink'in hangi çocuğa ne vereceğini gözle kestirmek.
 * Genişlikler artık elle hesaplanıyor; bu test o hesabı birebir tekrarlar.
 */

const PILL_SIDE = 16;
const IC_BOSLUK = 8;
const HAP_MAX = 176;
const PASIF_MIN = 40;

/** FloatingTabBar içindeki hesabın AYNISI. */
function hesapla(ekran: number, sekme: number) {
  const barIci = ekran - 2 * PILL_SIDE - 2 * IC_BOSLUK;
  const pasifSayisi = Math.max(1, sekme - 1);
  const aktif = Math.min(HAP_MAX, Math.max(0, barIci - pasifSayisi * PASIF_MIN));
  const pasif = (barIci - aktif) / pasifSayisi;
  return { barIci, aktif, pasif, toplam: aktif + pasif * pasifSayisi };
}

// Desteklenen en dar cihazdan en genişe
const EKRANLAR = [320, 360, 375, 390, 393, 402, 414, 428, 430, 440];
const SEKMELER = [4, 5]; // müşteri 5, uzman/salon 4

test('toplam genişlik bar içine TAM oturur — hiçbir sekme dışarı taşmaz', () => {
  for (const e of EKRANLAR) {
    for (const n of SEKMELER) {
      const r = hesapla(e, n);
      assert.ok(
        Math.abs(r.toplam - r.barIci) < 0.01,
        `${e}pt / ${n} sekme: toplam ${r.toplam.toFixed(1)} ≠ bar içi ${r.barIci}`,
      );
    }
  }
});

test('her sekme çizilir — genişliği sıfır ya da negatif olamaz', () => {
  for (const e of EKRANLAR) {
    for (const n of SEKMELER) {
      const r = hesapla(e, n);
      assert.ok(r.aktif > 0, `${e}pt / ${n}: aktif hap ${r.aktif}`);
      assert.ok(r.pasif > 0, `${e}pt / ${n}: pasif sekme ${r.pasif}`);
    }
  }
});

test('pasif sekme dokunma hedefinin altına inmez', () => {
  for (const e of EKRANLAR) {
    for (const n of SEKMELER) {
      const r = hesapla(e, n);
      assert.ok(
        r.pasif >= PASIF_MIN - 0.01,
        `${e}pt / ${n} sekme: pasif ${r.pasif.toFixed(1)}pt < ${PASIF_MIN}pt`,
      );
    }
  }
});

test('en dar cihazda bile aktif hap ikon + etikete yer bırakır', () => {
  // İkon 19 + boşluk 7 + iç boşluk 28 = 54pt; geriye metin için yer kalmalı.
  const r = hesapla(320, 5);
  assert.ok(r.aktif >= 54 + 20, `320pt'de aktif hap ${r.aktif.toFixed(1)}pt`);
});

// Etiketin ayrılan hapa sığıp sığmadığı — 15px Onest semibold ≈ 8.3pt/karakter.
//
// Tahmin PAYLI tutulur: hap artık içeriğine göre daralıyor ve etiket
// ezilmiyor (flexShrink 0), yani sığmayan bir etiket kırpılmak yerine hapı
// taşırır. Bu yüzden model gerçekten sığdığından emin olmalı.
const PAY = 1.15;
const metinGenisligi = (etiket: string) => 19 + 7 + etiket.length * 8.3 * PAY + 28;

const NAV_KEYS = ['nav.discover', 'nav.bookings', 'nav.care', 'nav.circle', 'nav.profile'] as const;

for (const [ad, sozluk] of [
  ['tr', tr],
  ['ru', ru],
  ['kk', kk],
] as const) {
  test(`${ad}: sekme etiketleri 390pt ekranda kırpılmadan sığıyor`, () => {
    const { aktif } = hesapla(390, 5);
    for (const k of NAV_KEYS) {
      const etiket = (sozluk as Record<string, string>)[k];
      assert.ok(etiket, `${ad}/${k} eksik`);
      const g = metinGenisligi(etiket);
      assert.ok(
        g <= aktif,
        `${ad}/${k} "${etiket}" ≈ ${g.toFixed(0)}pt > ${aktif.toFixed(0)}pt — kırpılır`,
      );
    }
  });
}
