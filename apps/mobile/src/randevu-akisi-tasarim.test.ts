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
    // Özet kartı SEÇİLEN aksandan. `lightColors.accent` sabitiydi:
    // kullanıcı hangi rengi seçerse seçsin kart hep aynı kırmızıydı.
    ['schedule.tsx', /ozetKart:[\s\S]{0,200}backgroundColor: colors\.accent/],
  ] as const) {
    assert.match(oku(ad), desen, `${ad}: para koyu kartta değil`);
  }
});

test('koyu GRADYAN kart cihaz temasından bağımsız', () => {
  // Depozito ve iade kartları KOYU GRADYAN üstünde AÇIK yazı taşıyor.
  // Gradyan tema ile açılsaydı üstündeki sabit açık yazı okunmazdı —
  // daha önce yaşadığımız hata.
  for (const ad of ['deposit.tsx', 'refund.tsx']) {
    assert.match(oku(ad), /lightColors|darkColors/, `${ad}: koyu kart sabit palete bağlı değil`);
  }
});

test('AKSAN DOLU kartta yazı SAYFA tonlarını kullanmıyor', () => {
  /*
   * Kurucu: "okunurluluk sorunu var."
   *
   * Özet kartının zemini aksan, yazıları ise sayfa tonlarıydı (`ink`,
   * `muted`). Koyu mürekkep ve gri, doygun bir zeminde okunmuyordu:
   * "Özet" ve "Toplam süre" satırları neredeyse görünmezdi.
   *
   * Doğru eşleşme `accent` + `onAccent`: palet ikisini birlikte tanımlıyor
   * ve `aksan-kontrast.test.ts` her aksan setinde, her temada aralarındaki
   * kontrastı zaten ölçüyor. Yani bu kart artık ölçülmüş bir çift
   * kullanıyor.
   */
  const s = oku('schedule.tsx');
  const kart = s.slice(s.indexOf('<View style={[styles.ozetKart'), s.indexOf('<RulesCard'));
  assert.ok(kart.length > 200, 'özet kartı bulunamadı');
  assert.doesNotMatch(kart, /tone="ink"/, 'aksan zeminde sayfa mürekkebi kullanılıyor');
  assert.doesNotMatch(kart, /tone="muted"/, 'aksan zeminde gri metin kullanılıyor');
  assert.match(s, /ozetYazi: \{ color: colors\.onAccent \}/, 'kart yazısı onAccent değil');
  // Ayraç da kartın kendi renginden: sayfa çizgisi doygun zeminde görünmüyordu.
  assert.match(
    s,
    /ozetAyrac:[\s\S]{0,120}backgroundColor: colors\.onAccent/,
    'ayraç sayfa çizgisi',
  );
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
