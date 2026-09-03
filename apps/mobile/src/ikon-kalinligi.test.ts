import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import zlib from 'node:zlib';
import { test } from 'node:test';

/**
 * İKON ÇİZGİ KALINLIĞI — set tek elden çıkmış görünmeli.
 *
 * Kurucu: "sonradan eklediğin 6 ikon çok ince. bu 6 ikonu da diğerleri
 * gibi biraz daha kalın yapar mısın?"
 *
 * ── SEBEP TAM OLARAK NEYDİ ──────────────────────────────────────────────
 *
 * Kalınlık değil OPAKLIK. Figma kaynakları AÇIK ÇİZGİ / KOYU ZEMİN;
 * parlaklıktan türettiğim alfa çizginin ÇEKİRDEĞİNDE bile 1'e
 * ulaşmıyordu. Mürekkebin yalnız %0-46'sı tam opaktı, kurucunun setinde
 * bu oran %88-92. Yarı saydam bir çizgi ekranda "ince" görünüyor.
 *
 * Bu test o oranı ölçüyor: yeni bir ikon soluk eklenirse düşer.
 */

const dizin = join(import.meta.dirname, '..', 'assets', 'hizmet-ikon');

/** PNG'nin alfa kanalını çözer (RGBA, filtre tipleri 0–4). */
function alfaKanali(dosya: string): Uint8Array {
  const buf = readFileSync(join(dizin, dosya));
  const w = buf.readUInt32BE(16);
  const h = buf.readUInt32BE(20);
  assert.equal(buf[25], 6, `${dosya} RGBA değil`);
  const parcalar: Buffer[] = [];
  let off = 8;
  while (off < buf.length) {
    const uzunluk = buf.readUInt32BE(off);
    if (buf.toString('ascii', off + 4, off + 8) === 'IDAT')
      parcalar.push(buf.subarray(off + 8, off + 8 + uzunluk));
    off += 12 + uzunluk;
  }
  const ham = zlib.inflateSync(Buffer.concat(parcalar));
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
        const [pa, pb, pc] = [Math.abs(pp - a), Math.abs(pp - b), Math.abs(pp - c)];
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      hedef[x] = v & 0xff;
    }
  }
  const alfa = new Uint8Array(w * h);
  for (let i = 0; i < alfa.length; i++) alfa[i] = piksel[i * 4 + 3]!;
  return alfa;
}

/** Mürekkebin ne kadarı TAM OPAK? (alfa>200 / alfa>60) */
function opakOran(dosya: string): number {
  const a = alfaKanali(dosya);
  let opak = 0;
  let murekkep = 0;
  for (const v of a) {
    if (v > 60) murekkep++;
    if (v > 200) opak++;
  }
  assert.ok(murekkep > 0, `${dosya} boş`);
  return opak / murekkep;
}

test('HİÇBİR İKON yarı saydam çizgiyle kalmıyor', () => {
  /*
   * Eşik kurucunun kendi setinden geliyor: onun yedisi %88-92.
   * %65 altındaki bir ikon yanlarında sönük ve ince durur.
   */
  const zayif = readdirSync(dizin)
    .filter((f) => f.endsWith('.png'))
    .map((f) => [f, opakOran(f)] as const)
    .filter(([, o]) => o < 0.65);
  assert.deepEqual(
    zayif.map(([f, o]) => `${f}=${o.toFixed(2)}`),
    [],
    'yarı saydam çizgili ikon var',
  );
});

test('SET İÇİNDE opaklık farkı küçük', () => {
  // Biri %92 öteki %30 olsaydı set iki farklı elden çıkmış görünürdü.
  const oranlar = readdirSync(dizin)
    .filter((f) => f.endsWith('.png'))
    .map((f) => opakOran(f));
  const fark = Math.max(...oranlar) - Math.min(...oranlar);
  assert.ok(fark <= 0.3, `opaklık farkı çok büyük: ${fark.toFixed(2)}`);
});
