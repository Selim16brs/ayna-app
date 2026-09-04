import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import {
  AVATAR_GENISLIK,
  BELGE_GENISLIK,
  GOVDE_SINIRI_BAYT,
  PAYLASIM_GENISLIK,
  siniriAsiyorMu,
} from './gorsel-olcu';

/**
 * GÖNDERİLEN GÖRSEL SUNUCU SINIRINI AŞMIYOR.
 *
 * Kurucu: "uzman kimlik doğrulama yapmak istediğinde görsel yüklüyor ama
 * doğrulama gönder dediğinde hata mesajı alıyor."
 *
 * Sunucu şema sınırı büyütülmüştü ama asıl duvar gövde sınırıydı (15 MB):
 * KYC ekranı görseli KÜÇÜLTMÜYORDU. Profil ve paylaşım ekranları
 * küçültüyordu — aynı işi yapan üç ekrandan biri unutulmuştu.
 */

const oku = (...p: string[]) => readFileSync(join(__dirname, '..', ...p), 'utf8');

test('SINIR sunucunun gövde sınırının ALTINDA', () => {
  /*
   * Sunucu 15 MB'ta düşürüyor. JSON zarfı, alan adları ve her belgenin
   * `data:image/jpeg;base64,` öneki için pay bırakılmalı; sınırı tam 15 MB
   * yapmak "sığdı" deyip yine de düşen istekler üretirdi.
   */
  const main = readFileSync(join(__dirname, '..', '..', 'api', 'src', 'main.ts'), 'utf8');
  const m = main.match(/useBodyParser\('json', \{ limit: '(\d+)mb' \}\)/);
  assert.ok(m, 'sunucu gövde sınırı okunamadı');
  const sunucuBayt = Number(m![1]) * 1024 * 1024;
  assert.ok(GOVDE_SINIRI_BAYT < sunucuBayt, 'istemci sınırı sunucununkinden küçük değil');
});

test('SINIRI AŞAN yığın yakalanıyor', () => {
  const kucuk = ['a'.repeat(1000), 'b'.repeat(1000)];
  assert.equal(siniriAsiyorMu(kucuk), false);
  assert.equal(siniriAsiyorMu(['x'.repeat(GOVDE_SINIRI_BAYT + 1)]), true);
  // TOPLAM sayılıyor: tek tek sığan beş belge birlikte sığmayabilir.
  const yarim = 'y'.repeat(Math.ceil(GOVDE_SINIRI_BAYT / 2) + 1);
  assert.equal(siniriAsiyorMu([yarim, yarim]), true, 'toplam değil tek tek bakıyor');
});

test('BELGE genişliği avatardan BÜYÜK — yazı okunur kalsın', () => {
  /*
   * 1000 px'e indirilen pasaportta seri numarası bulanıklaşıyor ve
   * doğrulayan kişi okuyamıyor. Belge, avatar gibi ele alınamaz.
   */
  assert.ok(BELGE_GENISLIK > AVATAR_GENISLIK, 'belge avatar kadar küçültülüyor');
  assert.ok(BELGE_GENISLIK > PAYLASIM_GENISLIK);
});

test('ÜÇ EKRAN da ortak küçültmeden geçiyor', () => {
  /*
   * Aynı işi üç yerde ayrı yazmak, birini unutmayı mümkün kılıyordu —
   * unutulan KYC oldu ve kurucu hatayı orada gördü.
   */
  for (const [yol, sabit] of [
    [['app', 'seller', 'kyc.tsx'], 'BELGE_GENISLIK'],
    [['app', 'profile', 'edit.tsx'], 'AVATAR_GENISLIK'],
    [['app', 'seller', 'paylas.tsx'], 'PAYLASIM_GENISLIK'],
  ] as [string[], string][]) {
    const k = oku(...yol);
    assert.match(k, new RegExp(`kucultVeB64\\([^)]*${sabit}\\)`), `${yol.join('/')}: küçültmüyor`);
    assert.doesNotMatch(k, /ImageManipulator\.manipulateAsync/, `${yol.join('/')}: kendi kopyası`);
  }
});

test('GÖRSEL GÖNDEREN HİÇBİR EKRAN küçültmeyi atlamıyor', () => {
  /*
   * Tek ekranı düzeltmek yetmez: aynı hata her yeni ekranda tekrar
   * doğuyordu. Bu test, ham `base64`i doğrudan data URL'ye çeviren bir
   * ekran kalmadığını tarıyor — yenisi eklenirse burada düşer.
   */
  const { readdirSync, statSync } = require('node:fs') as typeof import('node:fs');
  const gez = (d: string): string[] =>
    readdirSync(d).flatMap((ad) => {
      const tam = join(d, ad);
      return statSync(tam).isDirectory() ? gez(tam) : tam.endsWith('.tsx') ? [tam] : [];
    });
  const suclu = gez(join(__dirname, '..', 'app')).filter((f) =>
    /a\.base64 \? `data:image/.test(readFileSync(f, 'utf8')),
  );
  assert.deepEqual(suclu, [], `küçültmeden gönderen ekran(lar):\n  ${suclu.join('\n  ')}`);
});

test('BELGE OKUNAMAZSA listeye eklenmiyor', () => {
  /*
   * Eskiden base64 yoksa yerel dosya yolu (`file://…`) belge diye giriyordu:
   * sunucuya gönderilse okunamaz bir metin olurdu, uzman ise belgeyi
   * göndermiş sanırdı.
   */
  const k = oku('app', 'seller', 'kyc.tsx');
  assert.doesNotMatch(k, /:\s*a\.uri\]/, 'dosya yolu belge diye ekleniyor');
  assert.match(k, /if \(!b64\) \{/, 'okunamayan görsel elenmiyor');
  assert.match(k, /siniriAsiyorMu\(docs\)/, 'gönderim öncesi boyut bakılmıyor');
});
