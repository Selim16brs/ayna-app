import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { ACILIS_MESAJLARI } from '@ayna/domain';
import { mesajPuntosu } from './acilis-olcu';

/**
 * EN UZUN MESAJLAR EKRANA SIĞIYOR MU — brief §7.4(a) ve §7.4(b).
 *
 * "(a) üç dilde en uzun mesajların ekran sığması, (b) Kazak gliflerinin
 * fontta eksiksiz render'ı."
 *
 * ── NEDEN FONTUN KENDİSİNİ OKUYORUZ ─────────────────────────────────────
 *
 * "Sığıyor herhalde" demek bir ölçüm değil. Kullanılan yazı tipinin glif
 * genişlikleri TTF'in içinde yazıyor; test dosyayı açıp okuyor. Font
 * değişirse ölçüm de değişir — sabit bir tabloya yazsaydım font değiştiği
 * gün test yalan söylemeye başlardı. (Nitekim DEĞİŞTİ: el yazısı Pacifico
 * bırakılıp uygulamanın kendi yazı tipine dönüldü ve test kendiliğinden
 * yeni fontu ölçmeye başladı.)
 *
 * Ölçüm KABA ama tek yönlü kaba: kerning ve ligatür metni DARALTIR, biz
 * saymıyoruz; yani gerçek genişlik hesapladığımızdan küçük. Testin
 * geçmesi "sığar" demek için yeterli.
 */

// ── Asgari TTF okuyucu: unitsPerEm, cmap(format 4/12), hmtx ─────────────
function fontOlculeri(yol: string) {
  const b = readFileSync(yol);
  const tabloSayisi = b.readUInt16BE(4);
  const tablolar = new Map<string, number>();
  for (let i = 0; i < tabloSayisi; i++) {
    const o = 12 + i * 16;
    tablolar.set(b.toString('ascii', o, o + 4), b.readUInt32BE(o + 8));
  }
  const head = tablolar.get('head')!;
  const upm = b.readUInt16BE(head + 18);
  const indexToLoc = b.readInt16BE(head + 50);
  void indexToLoc;
  const hhea = tablolar.get('hhea')!;
  const hMetrik = b.readUInt16BE(hhea + 34);
  const hmtx = tablolar.get('hmtx')!;
  const genislik = (gid: number) => b.readUInt16BE(hmtx + Math.min(gid, hMetrik - 1) * 4) / upm;

  // cmap → en iyi alt tablo (format 4 BMP ya da format 12)
  const cmap = tablolar.get('cmap')!;
  const altSayi = b.readUInt16BE(cmap + 2);
  let f4 = 0;
  let f12 = 0;
  for (let i = 0; i < altSayi; i++) {
    const o = cmap + 4 + i * 8;
    const off = cmap + b.readUInt32BE(o + 4);
    const format = b.readUInt16BE(off);
    if (format === 4 && !f4) f4 = off;
    if (format === 12) f12 = off;
  }
  const gidBul = (cp: number): number => {
    if (f12) {
      const grup = b.readUInt32BE(f12 + 12);
      for (let i = 0; i < grup; i++) {
        const o = f12 + 16 + i * 12;
        const bas = b.readUInt32BE(o);
        const son = b.readUInt32BE(o + 4);
        if (cp >= bas && cp <= son) return b.readUInt32BE(o + 8) + (cp - bas);
      }
      return 0;
    }
    const segX2 = b.readUInt16BE(f4 + 6);
    const seg = segX2 / 2;
    for (let i = 0; i < seg; i++) {
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

/*
 * Ekranın GERÇEKTEN kullandığı yazı tipi. Dosya adını elle yazsaydım,
 * ekran başka bir fonta geçtiğinde test eski fontu ölçmeye devam eder ve
 * "sığıyor" derken yanlış fontu ölçerdi.
 */
const AILE = /mesaj: \{ fontFamily: font\.(\w+)/.exec(
  readFileSync(join(__dirname, 'ui', 'AcilisMesaji.tsx'), 'utf8'),
)?.[1];
// `export const font = { ... }` bloğunu HEDEFLİ okuyoruz: dosyanın
// tamamında `ad: 'değer'` deseni başka yerlerde de geçiyor (`weight`
// tablosu gibi) ve oradan okumak yanlış eşleşme veriyordu.
const temaKaynagi = readFileSync(join(__dirname, 'theme.ts'), 'utf8');
const fontBloku = temaKaynagi.slice(
  temaKaynagi.indexOf('export const font = {'),
  temaKaynagi.indexOf('} as const;', temaKaynagi.indexOf('export const font = {')),
);
const aileler = new Map([...fontBloku.matchAll(/(\w+): '([\w-]+)',/g)].map((m) => [m[1]!, m[2]!]));
const FONT_DOSYASI = aileler.get(AILE ?? '');
const font = fontOlculeri(join(__dirname, '..', 'assets', 'fonts', `${FONT_DOSYASI}.ttf`));

/** Metnin em cinsinden genişliği (punto ile çarpılınca px). */
const emGenisligi = (s: string): number =>
  [...s].reduce((t, ch) => t + font.genislik(font.gidBul(ch.codePointAt(0)!)), 0);

// ── Ekran varsayımları ───────────────────────────────────────────────────
// iPhone SE — desteklenen EN DAR ekran. Geniş ekranda sığan dar ekranda
// taşabilir; ölçüyü en dardan yapmak zorundayız.
const EKRAN_GENISLIK = 320;
const KENAR = 8 * 4 * 2; // styles.orta paddingHorizontal: space(4), iki yan
const KULLANILABILIR = EKRAN_GENISLIK - KENAR;
// Dikey: en kısa ekran 568pt. Logo (32) + boşluk (32) + güvenli alanlar.
const DIKEY_PAY = 568 - 32 - 32 - 120;

const tumMetinler = ACILIS_MESAJLARI.flatMap((m) => [
  ...(['tr', 'kk', 'ru'] as const).map((d) => ({ id: m.id, dil: d, metin: m.metin[d] })),
  ...(m.adsizMetin
    ? (['tr', 'kk', 'ru'] as const).map((d) => ({
        id: `${m.id}·adsız`,
        dil: d,
        metin: m.adsizMetin![d],
      }))
    : []),
]).map((x) => ({
  ...x,
  // `{name}` gerçek bir adla doluyor. Kazakistan'da uzun kadın adları
  // için gerçekçi bir üst sınır seçildi; "Aigerim" gibi kısa bir adla
  // ölçseydik test kolay geçerdi.
  metin: x.metin.replace('{name}', 'Aigerim-Nursultan'),
}));

test('FONT OKUYUCU gerçekten ölçüyor — sığma testlerinin dayanağı', () => {
  /*
   * Sığma kontrolleri TEK YÖNLÜ: genişlikleri olduğundan küçük ölçen bir
   * okuyucu her mesajı "sığıyor" gösterir ve testler sessizce yalan
   * söylemeye başlar. (Bir mutasyon denemesinde tam bunu gördüm: bütün
   * glifleri 0 genişlik yaptım, sığma testleri geçmeye devam etti.)
   *
   * Bu yüzden okuyucunun kendisi de bağlanıyor.
   */
  const em = (s: string) => emGenisligi(s);
  assert.ok(em('M') > 0.3 && em('M') < 1.6, `'M' genişliği mantıksız: ${em('M')}`);
  assert.ok(em('i') > 0.05, `'i' genişliği sıfıra yakın: ${em('i')}`);
  assert.ok(em('M') > em('i'), "M, i'den geniş değil — okuyucu glifleri ayırt etmiyor");
  assert.ok(em(' ') > 0.05, 'boşluk genişliği yok — kelimeler üst üste ölçülür');
  // Kazak harfleri de gerçek genişlik veriyor (varsayılan gide düşmüyor).
  assert.ok(em('қ') > 0.2, `'қ' genişliği yok: ${em('қ')}`);
  // Uzunlukla orantı: 20 karakter, 1 karakterin en az 10 katı olmalı.
  assert.ok(em('a'.repeat(20)) > em('a') * 10, 'genişlik uzunlukla artmıyor');
});

test('KAZAK GLİFLERİNİN hepsi fontta var — brief §7.4(b)', () => {
  const kazak = 'әғқңөұүһіӘҒҚҢӨҰҮҺІ';
  for (const ch of kazak) {
    assert.notEqual(
      font.gidBul(ch.codePointAt(0)!),
      0,
      `${FONT_DOSYASI} içinde '${ch}' yok — boş kare çizilir`,
    );
  }
});

test('KATALOGDAKİ her karakter fontta var', () => {
  const eksik = new Set<string>();
  for (const { metin } of tumMetinler) {
    for (const ch of metin) {
      if (ch === ' ') continue;
      if (font.gidBul(ch.codePointAt(0)!) === 0) eksik.add(ch);
    }
  }
  assert.deepEqual([...eksik], [], 'bu karakterler boş kare çizilir');
});

test('EN UZUN mesajlar EN DAR ekranda sığıyor — brief §7.4(a)', () => {
  const tasan: string[] = [];
  for (const { id, dil, metin } of tumMetinler) {
    const punto = mesajPuntosu(metin);
    const px = emGenisligi(metin) * punto;
    // Kelime kelime sarılıyor; kaba satır sayısı toplam genişlikten.
    const satir = Math.ceil(px / KULLANILABILIR);
    const yukseklik = satir * Math.round(punto * 1.42);
    if (yukseklik > DIKEY_PAY) tasan.push(`${id}/${dil}: ${satir} satır, ${yukseklik}px`);
  }
  assert.deepEqual(tasan, [], 'bu mesajlar taşıyor');
});

test('TEK KELİME bile satıra sığıyor — kırpılma yok', () => {
  /*
   * Satır sarma kelimeyi bölmüyor. Bir kelime kullanılabilir genişlikten
   * genişse ekranın dışına taşar ve kırpılır — brief §5.2 bunu açıkça
   * yasaklıyor ("kırpılmadan sığmalıdır").
   */
  const tasan: string[] = [];
  for (const { id, dil, metin } of tumMetinler) {
    const punto = mesajPuntosu(metin);
    for (const kelime of metin.split(/\s+/)) {
      const px = emGenisligi(kelime) * punto;
      if (px > KULLANILABILIR) tasan.push(`${id}/${dil}: "${kelime}" ${Math.round(px)}px`);
    }
  }
  assert.deepEqual(tasan, [], 'bu kelimeler satıra sığmıyor');
});
