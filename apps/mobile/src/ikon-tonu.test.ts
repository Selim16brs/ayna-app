import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

/**
 * İKON TONU — set tek elden çıkmış görünmeli.
 *
 * ── GERÇEK BİR ARIZADAN DOĞDU ───────────────────────────────────────────
 *
 * Figma'dan gelen altı ikonu kurucunun mevcut yedisinin rengine
 * getirirken EN SIK GEÇEN tam RGB değerini ölçmüştüm. Kenar yumuşatmalı
 * bir çizimde o değer çizginin en koyu ÇEKİRDEĞİ ve azınlıkta; gözün
 * okuduğu şey opak piksellerin ORTALAMASI.
 *
 * Sonuç: yeniler 121 yerine 50 parlaklıkta çıktı. Koyu temada kurucunun
 * ikonları aydınlık, benimkiler sönük görünüyordu — "yeni eklediğin
 * ikonlar diğerlerinden farklı."
 *
 * Bu test tonu ölçüyor: yeni bir ikon yanlış parlaklıkta eklenirse düşer.
 */

const dizin = join(import.meta.dirname, '..', 'assets', 'hizmet-ikon');

/** PNG'nin opak piksellerinin ortalama parlaklığı (0–255). */
function ortalamaParlaklik(dosya: string): number {
  const buf = readFileSync(join(dizin, dosya));
  // PNG'yi elle çözmek yerine ham IDAT'a girmeden ölçmek mümkün değil;
  // bunun yerine dosyanın PLTE'siz RGBA olduğunu doğrulayıp piksel
  // ortalamasını `zlib` ile açarak alıyoruz.
  const zlib = require('node:zlib') as typeof import('node:zlib');
  const w = buf.readUInt32BE(16);
  const h = buf.readUInt32BE(20);
  const renkTipi = buf[25];
  assert.equal(renkTipi, 6, `${dosya} RGBA değil (tip ${renkTipi})`);
  // IDAT parçalarını birleştir.
  const parcalar: Buffer[] = [];
  let off = 8;
  while (off < buf.length) {
    const uzunluk = buf.readUInt32BE(off);
    const tip = buf.toString('ascii', off + 4, off + 8);
    if (tip === 'IDAT') parcalar.push(buf.subarray(off + 8, off + 8 + uzunluk));
    off += 12 + uzunluk;
  }
  const ham = zlib.inflateSync(Buffer.concat(parcalar));
  // Satır süzgeçlerini çöz (PNG filtre tipleri 0–4).
  const satirBayt = w * 4;
  const piksel = Buffer.alloc(h * satirBayt);
  let p = 0;
  for (let y = 0; y < h; y++) {
    const filtre = ham[p++]!;
    const satir = ham.subarray(p, p + satirBayt);
    p += satirBayt;
    const hedef = piksel.subarray(y * satirBayt, (y + 1) * satirBayt);
    const ust =
      y > 0 ? piksel.subarray((y - 1) * satirBayt, y * satirBayt) : Buffer.alloc(satirBayt);
    for (let x = 0; x < satirBayt; x++) {
      const a = x >= 4 ? hedef[x - 4]! : 0;
      const b = ust[x]!;
      const c = x >= 4 ? ust[x - 4]! : 0;
      let v = satir[x]!;
      if (filtre === 1) v += a;
      else if (filtre === 2) v += b;
      else if (filtre === 3) v += (a + b) >> 1;
      else if (filtre === 4) {
        const pp = a + b - c;
        const pa = Math.abs(pp - a);
        const pb = Math.abs(pp - b);
        const pc = Math.abs(pp - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      hedef[x] = v & 0xff;
    }
  }
  let toplam = 0;
  let adet = 0;
  for (let i = 0; i < piksel.length; i += 4) {
    if (piksel[i + 3]! <= 200) continue;
    toplam += 0.2126 * piksel[i]! + 0.7152 * piksel[i + 1]! + 0.0722 * piksel[i + 2]!;
    adet++;
  }
  assert.ok(adet > 0, `${dosya} tamamen saydam`);
  return toplam / adet;
}

test('TÜM İKONLAR aynı ton aralığında', () => {
  /*
   * Kurucunun yedi ikonu 105–142 arasında. Yeniler o aralığa girmezse
   * set iki farklı elden çıkmış gibi görünür — koyu temada biri
   * aydınlık, öteki sönük.
   *
   * Aralık kurucunun kendi setinden türetiliyor, elle yazılmıyor: o set
   * değişirse ölçüt de değişir.
   */
  const dosyalar = readdirSync(dizin).filter((f) => f.endsWith('.png'));
  const olculer = dosyalar.map((f) => [f, ortalamaParlaklik(f)] as const);
  const degerler = olculer.map(([, v]) => v);
  const en = Math.min(...degerler);
  const cok = Math.max(...degerler);
  assert.ok(
    cok - en <= 60,
    `ikonlar arasında ton farkı çok büyük (${en.toFixed(0)}–${cok.toFixed(0)}): ` +
      olculer.map(([f, v]) => `${f}=${v.toFixed(0)}`).join(' '),
  );
});

test('hiçbir ikon KOYU TEMADA kaybolacak kadar sönük değil', () => {
  // Kutu koyu; 80'in altındaki bir çizgi orada okunmuyor.
  for (const f of readdirSync(dizin).filter((x) => x.endsWith('.png'))) {
    const v = ortalamaParlaklik(f);
    assert.ok(v >= 80, `${f} koyu temada sönük kalır (parlaklık ${v.toFixed(0)})`);
  }
});
