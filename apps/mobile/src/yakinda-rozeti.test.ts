import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { t as ceviri } from '@ayna/i18n';
import { emGenisligiFabrikasi } from './font-olcu';

/**
 * "YAKINDA" ROZETİ ÜÇ DİLDE DE SIĞIYOR MU.
 *
 * Kurucu: "Kazakçada Yakında yazısında son harf alta düşüyor."
 *
 * Sebep kırpma değil SARMAYDI: kategori hücresi 68px, Kazakça metin ise
 * dolgusuyla birlikte 68,7px ediyordu. Bir piksel — ama son harfi alt
 * satıra atmaya yetiyor.
 *
 * Ölçü tahmin değil: rozetin kullandığı yazı tipinin glif genişlikleri
 * TTF'ten okunuyor. Yeni bir çeviri ya da font değişince test kendisi
 * yeniden ölçüyor.
 */

// Ölçü okuyucusu ORTAK (`font-olcu`): ikinci bir test de aynı ölçüyü
// kullanıyor ve iki kopya zamanla ayrışırdı.
const emGenisligi = emGenisligiFabrikasi(
  join(__dirname, '..', 'assets', 'fonts', 'Onest-Medium.ttf'),
);

const oku = (...p: string[]) => readFileSync(join(__dirname, '..', ...p), 'utf8');

// Ölçüler KAYNAKTAN okunuyor: elle yazsaydım stil değiştiğinde test eski
// sayıyı ölçmeye devam eder ve yalan söylerdi.
const rozetKaynak = oku('src', 'ui', 'YakindaRozeti.tsx');
const kesfetKaynak = oku('app', '(tabs)', 'discover.tsx');

const HUCRE = Number(/ikonKap: \{ width: (\d+)/.exec(kesfetKaynak)?.[1]);
const DOLGU_ADIM = Number(/paddingHorizontal: space\(([\d.]+)\)/.exec(rozetKaynak)?.[1]);
const KENARLIK = Number(/borderWidth: (\d+)/.exec(rozetKaynak)?.[1]);
const PUNTO = 12; // theme.micro
const HARF_ARASI = Number(/letterSpacing: ([\d.]+)/.exec(rozetKaynak)?.[1]);

test('ÖLÇÜLER kaynaktan okunabildi', () => {
  // Okunamayan bir ölçü NaN yapar ve karşılaştırmalar sessizce false
  // döner: test hiçbir şey sınamadan geçerdi.
  for (const [ad, v] of [
    ['hücre genişliği', HUCRE],
    ['dolgu adımı', DOLGU_ADIM],
    ['kenarlık', KENARLIK],
    ['harf aralığı', HARF_ARASI],
  ] as const) {
    assert.ok(Number.isFinite(v), `${ad} kaynaktan okunamadı`);
  }
});

test('ROZET üç dilde de kategori hücresine SIĞIYOR', () => {
  const tasan: string[] = [];
  for (const dil of ['tr', 'kk', 'ru'] as const) {
    const metin = ceviri(dil, 'catalog.soon');
    const yazi = emGenisligi(metin) * PUNTO + HARF_ARASI * metin.length;
    const toplam = yazi + DOLGU_ADIM * 8 * 2 + KENARLIK * 2;
    if (toplam > HUCRE) tasan.push(`${dil}: "${metin}" ${toplam.toFixed(1)}px > ${HUCRE}px`);
  }
  assert.deepEqual(tasan, [], 'bu diller taşıyor — son harf alt satıra düşer');
});

test('SARMA KAPALI — taşsa bile alt satıra düşmüyor', () => {
  /*
   * Ölçü tek başına yetmiyor: yarın daha uzun bir çeviri girilirse ölçü
   * testi kırılır ama KULLANICI o sürümü görmeden önce sarmanın kapalı
   * olması gerekiyor.
   */
  assert.match(rozetKaynak, /numberOfLines=\{1\}/, 'rozet metni sarabiliyor');
  // Punto küçültme kaldırıldı (4 Eyl 2026): RN belirsiz genişlikte puntoyu
  // okunamayacak kadar indiriyordu. Taşan metin kırpılıyor.
  assert.doesNotMatch(rozetKaynak, /adjustsFontSizeToFit/, 'rozet punto küçültüyor');
});
