import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { darkColors, lightColors } from './theme.palette';

/**
 * TEMA SIZINTISI BEKÇİSİ.
 *
 * Tasarım komple değişecek. Değişimin tek bir yerden inebilmesi, ekranların
 * renkleri TEMADAN okumasına bağlı. Bir ekran `'#5A2A55'` yazdığı anda o
 * piksel yeni palete sağır kalır — ve kimse fark etmez, çünkü ekran hâlâ
 * "doğru" görünür; yalnız eski tasarımda doğru görünür.
 */

const kok = join(import.meta.dirname, '..');

function dosyalar(d: string, out: string[] = []): string[] {
  for (const ad of readdirSync(d)) {
    if (ad === 'node_modules' || ad === 'ios' || ad === 'android') continue;
    const t = join(d, ad);
    if (statSync(t).isDirectory()) dosyalar(t, out);
    else if (/\.tsx$/.test(ad) && !ad.includes('.test.')) out.push(t);
  }
  return out;
}

/** Palette GERÇEKTEN var olan değerler — token'ı varken literal yazmak sızıntıdır. */
const PALET = new Set(
  [...Object.values(lightColors), ...Object.values(darkColors)]
    .filter((v) => /^#[0-9A-Fa-f]{6}$/.test(v))
    .map((v) => v.toUpperCase()),
);

/**
 * MEŞRU İSTİSNALAR — her biri gerekçesiyle.
 * Listeye ekleme yapmadan önce sor: bu değer marka değişince değişmeli mi?
 * Cevap "evet" ise istisna değil, sızıntıdır.
 */
const ISTISNA: Record<string, string> = {
  'src/ui/SocialLinks.tsx': 'Instagram/Facebook MARKA renkleri — bizim paletimiz değil',
  'app/gallery.tsx': 'tam ekran fotoğraf görüntüleyici: siyah zemin bilinçli, temaya uymamalı',
};

test('ekranlar tema rengini ELLE YAZMIYOR', () => {
  const ihlal: string[] = [];
  for (const f of [...dosyalar(join(kok, 'app')), ...dosyalar(join(kok, 'src'))]) {
    const gorece = f.slice(kok.length + 1);
    if (gorece.startsWith('src/theme') || ISTISNA[gorece]) continue;
    const s = readFileSync(f, 'utf8');
    for (const m of s.matchAll(/'(#[0-9A-Fa-f]{6})'/g)) {
      if (PALET.has(m[1]!.toUpperCase())) ihlal.push(`${gorece}: ${m[1]}`);
    }
  }
  assert.deepEqual(
    ihlal,
    [],
    'Palette KARŞILIĞI OLAN renk elle yazılmış — yeni tasarım bu piksellere ulaşmaz:\n  ' +
      ihlal.join('\n  '),
  );
});

test('barrel’dan dışa aktarılan her bileşen KULLANILIYOR', () => {
  // `src/ui/index.ts` bir kullanım DEĞİLDİR. Bu kör nokta yüzünden sekiz ölü
  // bileşen (518 satır) ilk temizlikten kaçmıştı: barrel'daki `export`
  // onları canlı gösteriyordu.
  // DOSYA adına değil, dışa aktarılan SEMBOL adına bakılır: `Toast.tsx`
  // dosyası `useToast`i veriyor ve o kullanılıyor. Dosya adına bakan bir
  // desen onu ölü sanıp sildirir — bir kez sildirdi de.
  const barrel = readFileSync(join(kok, 'src/ui/index.ts'), 'utf8');
  const adlar = [...barrel.matchAll(/export \{([^}]+)\} from '\.\//g)]
    .flatMap((m) => m[1]!.split(','))
    .map((x) => x.replace(/\btype\b/, '').trim())
    .filter(Boolean);
  const metin = [...dosyalar(join(kok, 'app')), ...dosyalar(join(kok, 'src'))]
    .filter((f) => !f.endsWith('src/ui/index.ts'))
    .map((f) => ({ f, s: readFileSync(f, 'utf8') }));
  const olu = adlar.filter((a) => {
    const re = new RegExp(`\\b${a}\\b`);
    // Sembolün kendi dosyası da sayılmaz: orada tanımlı olması kullanım değil.
    return (
      !metin.some(({ f, s }) => !f.includes('/src/ui/') && re.test(s)) &&
      !metin.some(
        ({ f, s }) =>
          f.includes('/src/ui/') &&
          !s.includes(`export function ${a}`) &&
          !s.includes(`export const ${a}`) &&
          re.test(s),
      )
    );
  });
  assert.deepEqual(olu, [], `barrel'da duran ama hiç kullanılmayan bileşen: ${olu.join(', ')}`);
});
