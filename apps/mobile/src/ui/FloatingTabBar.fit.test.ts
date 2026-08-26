import assert from 'node:assert/strict';
import { test } from 'node:test';
import { kk, ru, tr } from '@ayna/i18n';

// Yüzen alt menünün SIĞMA hesabı.
//
// Yaşanan hata: 5 sekme + uzun Türkçe etiket ("Randevularım") 390pt ekrana
// sığmıyordu. Aktif hap büyüyüp son iki sekmeyi dışarı itiyor, `overflow:hidden`
// ise onları GİZLİYORDU — belirti kapanmış ama W2W ve Profil erişilemez hâle
// gelmişti. Bu test aynı hesabı kilitler.

const EKRAN = 390; // en dar hedef cihaz (iPhone SE/13 mini sınıfı)
const KENAR = 16; // barın ekran kenarından boşluğu
const IC_BOSLUK = 8; // barın kendi yatay iç boşluğu
const PASIF_MIN = 40; // pasif sekmenin dokunma hedefi
const HAP_MAX = 164; // aktif hapın üst sınırı (FloatingTabBar ile AYNI)
const SEKME = 5;

const barIci = EKRAN - 2 * KENAR - 2 * IC_BOSLUK;

test('bar içi genişlik beklenen değerde', () => {
  assert.equal(barIci, 342);
});

test('4 pasif sekme + aktif hap bar içine sığar', () => {
  const gerekli = (SEKME - 1) * PASIF_MIN + HAP_MAX;
  assert.ok(gerekli <= barIci, `${gerekli}pt gerekiyor, ${barIci}pt var`);
});

test('aktif hapın üst sınırı pasif sekmeleri ezmiyor', () => {
  // Hap üst sınıra dayansa bile her pasif sekmeye en az dokunma hedefi kalmalı.
  const kalan = barIci - HAP_MAX;
  assert.ok(
    kalan / (SEKME - 1) >= PASIF_MIN,
    `sekme başına ${(kalan / (SEKME - 1)).toFixed(1)}pt, en az ${PASIF_MIN} gerekiyor`,
  );
});

// Etiketin hap sınırına sığıp sığmadığı — kaba ama tutarlı ölçüm.
// 15px Onest semibold için karakter başına ~8.3pt.
const hapGenisligi = (etiket: string) => 19 + 7 + etiket.length * 8.3 + 28;

const NAV_KEYS = ['nav.discover', 'nav.bookings', 'nav.care', 'nav.circle', 'nav.profile'] as const;

for (const [ad, sozluk] of [
  ['tr', tr],
  ['ru', ru],
  ['kk', kk],
] as const) {
  test(`${ad}: sekme etiketleri hap sınırına sığıyor`, () => {
    for (const k of NAV_KEYS) {
      const etiket = (sozluk as Record<string, string>)[k];
      assert.ok(etiket, `${ad}/${k} eksik`);
      const g = hapGenisligi(etiket);
      assert.ok(
        g <= HAP_MAX,
        `${ad}/${k} "${etiket}" ≈ ${g.toFixed(0)}pt > ${HAP_MAX}pt — hapta kırpılır`,
      );
    }
  });
}

test('aktif hap küçülmediğinde bile beş sekme sığar', () => {
  // Hap flexShrink:0 — doğal genişliğini korur. En uzun etiketle bile
  // 4 pasif sekme dokunma hedefinin altına inmemeli.
  const enUzunHap = Math.min(hapGenisligi('Randevularım'), HAP_MAX);
  const kalan = barIci - enUzunHap;
  assert.ok(
    kalan / (SEKME - 1) >= PASIF_MIN,
    `en uzun etikette sekme başına ${(kalan / (SEKME - 1)).toFixed(1)}pt kalıyor`,
  );
});
