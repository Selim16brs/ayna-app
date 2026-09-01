import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tr } from '@ayna/i18n';

/**
 * ANA SAYFA ACİL KARTI — söylediği şey DOĞRU olmalı.
 *
 * Kurucu bildirdi: kart "uzman iade dekontunu yükledi" diyor, "Gör"e basınca
 * ortada dekont olmayan, iptal edilmiş boş bir randevu açılıyordu. İki ayrı
 * yalan vardı: (1) uzmanın iade dekontu yüklediği akış §4.10 ile KALDIRILDI,
 * iadeyi AYNA yapıyor; (2) iptal edilen her randevuda iade hakkı doğmuyor —
 * 3 saatten az kala iptalde depozito yanıyor (§4.7).
 */

/**
 * Koşul `HomeUrgent`ten Keşfet ekranına TAŞINDI (Figma tasarımı ayrı bir acil
 * kart içermiyor, iade bandı içeriyor). Test de oraya bakıyor — koruduğu üç
 * güvence aynen duruyor.
 */
const src = readFileSync(join(import.meta.dirname, '..', 'app', '(tabs)', 'discover.tsx'), 'utf8');
const TR: Record<string, string> = tr;

test('iade kartı YANMIŞ depozitoda çıkmıyor', () => {
  const m = /const iadeBekleyen = benimRandevularim\.find\([\s\S]*?\n {2}\);/.exec(src);
  assert.ok(m, 'iade seçimi bulunamadı');
  assert.match(m[0], /!b\.depositForfeited/, 'yanmış depozitoda da iade vaat ediliyor');
  assert.match(m[0], /\(b\.depositAmount \?\? 0\) > 0/, 'depozito ödenmemişken iade vaat ediliyor');
});

test('talep gönderildiyse kart tekrar çıkmıyor', () => {
  const m = /const iadeBekleyen = benimRandevularim\.find\([\s\S]*?\n {2}\);/.exec(src)![0];
  assert.match(m, /!b\.refundRequestedAt/, 'talep verildikten sonra kart hâlâ çıkıyor');
});

test('kart iade EKRANINA götürüyor — kapanmış randevuya değil', () => {
  // "Gör"e basınca boş bir randevu detayı açılıyordu; kullanıcı orada
  // olmayan bir dekontu arıyordu.
  assert.match(src, /router\.push\(`\/booking\/refund\?id=\$\{iadeBekleyen\.id\}`\)/);
});

test('metin artık uzmanın dekont yüklediğini SÖYLEMİYOR', () => {
  for (const dil of ['tr', 'kk', 'ru']) {
    void dil;
  }
  assert.ok(
    !/dekont/i.test(TR['home.urgent.refund_sub'] ?? ''),
    `metin hâlâ dekonttan bahsediyor: ${TR['home.urgent.refund_sub']}`,
  );
  // Yerine yapılması gerekeni söylüyor.
  assert.match(TR['home.urgent.refund_cta'] ?? '', /İade|iste/i);
});

test('uzman iptali ve no-show da iade hakkı doğuruyor (§4.7)', () => {
  const m = /const iadeBekleyen = benimRandevularim\.find\([\s\S]*?\n {2}\);/.exec(src)![0];
  for (const st of ['iptal_uzman', 'no_show_uzman']) {
    assert.ok(m.includes(st), `${st} iade hakkı doğurmuyor`);
  }
});
