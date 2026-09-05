import { readFileSync } from 'node:fs';

/**
 * YAZI ÖLÇÜSÜ — TAHMİN DEĞİL, FONTTAN.
 *
 * "Sığar herhalde" diye yazılan bir ölçü, çeviri uzayınca ya da font
 * değişince sessizce yanlışa döner. Buradaki okuyucu glif genişliklerini
 * TTF'ten (cmap format 4/12 + hmtx) okuyor; testler kendi ölçüyor.
 *
 * `yakinda-rozeti.test.ts` içinde yaşıyordu; ikinci bir test (canlı özet
 * etiketleri) aynı ölçüye ihtiyaç duyunca kopyalamak yerine buraya alındı —
 * iki kopya zamanla ayrışır ve biri yanlış ölçmeye başlar.
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

export { fontOlculeri };

/** Verilen fontla, 1pt punto için metnin em cinsinden genişliği. */
export function emGenisligiFabrikasi(fontYolu: string) {
  const f = fontOlculeri(fontYolu);
  return (s: string) => [...s].reduce((t, ch) => t + f.genislik(f.gidBul(ch.codePointAt(0)!)), 0);
}
