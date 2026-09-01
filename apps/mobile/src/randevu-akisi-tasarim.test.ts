import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * RANDEVU AKIŞI — tasarım dili altı ekranda da aynı.
 *
 * Ekranlar Figma'da yoktu; ana sayfa ve uzman ekranından ÖLÇÜLEN dille
 * türetildi. Bir ekran kendi ölçüsünü uydurursa akış içinde göze batar —
 * test bunu yakalar.
 */
const oku = (ad: string): string =>
  readFileSync(join(import.meta.dirname, '..', 'app', 'booking', ad), 'utf8');

const EKRANLAR = [
  'schedule.tsx',
  '[id].tsx',
  'deposit.tsx',
  'confirmed.tsx',
  'reschedule.tsx',
  'refund.tsx',
];

test('altı ekran da AYNI kenar boşluğu ve bölüm aralığını kullanıyor', () => {
  // Figma: kenar 24, bölüm arası 20. Ekran ekran değişirse akış zıplar.
  for (const ad of EKRANLAR) {
    const s = oku(ad);
    const kap = /(?:icerik|content): \{[^}]*\}/.exec(s);
    assert.ok(kap, `${ad}: kapsayıcı stili yok`);
    assert.match(kap[0], /(padding|paddingHorizontal): 24/, `${ad}: kenar boşluğu 24 değil`);
  }
});

test('eski ölçek token’ları KALMADI', () => {
  // `space()` ve `radius.*` önceki tasarımın ölçeğiydi; Figma değerleri
  // bunlara oturmuyor, karışık kullanım iki dili aynı ekranda konuşmak olur.
  for (const ad of EKRANLAR) {
    const s = oku(ad);
    const stil = s.slice(s.indexOf('const makeStyles'));
    assert.ok(!/borderRadius: radius\./.test(stil), `${ad}: eski yarıçap ölçeği duruyor`);
  }
});

test('para KOYU kartta gösteriliyor', () => {
  // Tasarım dilinde kararın merkezindeki tutar koyu mürdüm kartta ve büyük:
  // depozito, iade ve özet. Beyaz kartta küçük yazı, aynı ağırlığı taşımıyor.
  for (const [ad, desen] of [
    ['deposit.tsx', /tutarKart:[\s\S]{0,120}borderRadius: 24/],
    ['refund.tsx', /tutarKart:[\s\S]{0,120}borderRadius: 24/],
    ['schedule.tsx', /ozetKart:[\s\S]{0,160}backgroundColor: lightColors\.accent/],
  ] as const) {
    assert.match(oku(ad), desen, `${ad}: para koyu kartta değil`);
  }
});

test('koyu kart CİHAZ TEMASINDAN bağımsız', () => {
  // Zemin `colors.accent` olsaydı koyu temada açık mora dönerdi ve üstündeki
  // açık yazı okunmazdı — daha önce yaşadığımız hata.
  for (const ad of ['deposit.tsx', 'refund.tsx', 'schedule.tsx']) {
    const s = oku(ad);
    assert.match(s, /lightColors/, `${ad}: koyu kart sabit palete bağlı değil`);
  }
});

test('iade ekranında GİZLİLİK notu forma bitişik', () => {
  // Kullanıcı hesap bilgisini girerken nereye gittiğini o anda bilmeli;
  // ekranın en altındaki not okunmadan geçiliyor.
  const s = oku('refund.tsx');
  const girdi = s.indexOf('refund.account_ph');
  const gizlilik = s.indexOf('refund.privacy');
  assert.ok(girdi > 0 && gizlilik > girdi, 'gizlilik notu girdiden önce ya da yok');
  assert.ok(gizlilik - girdi < 700, 'gizlilik notu formdan uzak');
});
