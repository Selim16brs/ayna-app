import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { t as ceviri } from '@ayna/i18n';

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

// ── Asgari TTF okuyucu (cmap format 4/12 + hmtx) ────────────────────────
function fontOlculeri(yol: string) {
  const b = readFileSync(yol);
  const tablolar = new Map<string, number>();
  for (let i = 0; i < b.readUInt16BE(4); i++) {
    const o = 12 + i * 16;
    tablolar.set(b.toString('ascii', o, o + 4), b.readUInt32BE(o + 8));
  }
  const head = tablolar.get('head')!;
  const upm = b.readUInt16BE(head + 18);
  const hhea = tablolar.get('hhea')!;
  const hMetrik = b.readUInt16BE(hhea + 34);
  const hmtx = tablolar.get('hmtx')!;
  const genislik = (gid: number) => b.readUInt16BE(hmtx + Math.min(gid, hMetrik - 1) * 4) / upm;

  const cmap = tablolar.get('cmap')!;
  let f4 = 0;
  let f12 = 0;
  for (let i = 0; i < b.readUInt16BE(cmap + 2); i++) {
    const off = cmap + b.readUInt32BE(cmap + 4 + i * 8 + 4);
    const format = b.readUInt16BE(off);
    if (format === 4 && !f4) f4 = off;
    if (format === 12) f12 = off;
  }
  const gidBul = (cp: number): number => {
    if (f12) {
      for (let i = 0; i < b.readUInt32BE(f12 + 12); i++) {
        const o = f12 + 16 + i * 12;
        const bas = b.readUInt32BE(o);
        const son = b.readUInt32BE(o + 4);
        if (cp >= bas && cp <= son) return b.readUInt32BE(o + 8) + (cp - bas);
      }
      return 0;
    }
    const segX2 = b.readUInt16BE(f4 + 6);
    for (let i = 0; i < segX2 / 2; i++) {
      const son = b.readUInt16BE(f4 + 14 + i * 2);
      if (cp > son) continue;
      const bas = b.readUInt16BE(f4 + 16 + segX2 + i * 2);
      if (cp < bas) return 0;
      const delta = b.readInt16BE(f4 + 16 + segX2 * 2 + i * 2);
      const rangeOff = f4 + 16 + segX2 * 3 + i * 2;
      const range = b.readUInt16BE(rangeOff);
      if (range === 0) return (cp + delta) & 0xffff;
      const gi = b.readUInt16BE(rangeOff + range + (cp - bas) * 2);
      return gi === 0 ? 0 : (gi + delta) & 0xffff;
    }
    return 0;
  };
  return { gidBul, genislik };
}

const font = fontOlculeri(join(__dirname, '..', 'assets', 'fonts', 'Onest-Medium.ttf'));
const emGenisligi = (s: string) =>
  [...s].reduce((t, ch) => t + font.genislik(font.gidBul(ch.codePointAt(0)!)), 0);

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
  assert.match(rozetKaynak, /adjustsFontSizeToFit/, 'taşan metin kırpılıyor');
});
