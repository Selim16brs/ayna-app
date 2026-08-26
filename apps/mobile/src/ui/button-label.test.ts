import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * DÜĞME ETİKETİ SIĞMAZSA KÜÇÜLMELİ, SARMAMALI.
 *
 * `Button` kabı SABİT 56pt. Etiket sığmadığında ikinci satıra sarıyor ve kap
 * büyümediği için o satır kırpılıyordu. Hata yalnız uzun dillerde görünür:
 * geliştirme Türkçe yapılıyor, Türkçe etiketler sığıyor — Rusça karşılıkları
 * 8-10 karakter daha uzun. Yani ekranda test edilirken ASLA fark edilmez.
 *
 * Kaynak metinden okunuyor: bileşen react-native'e bağımlı, Node koşucusu
 * onu derleyemiyor (aynı sebeple tabbar-clearance testi de böyle yazıldı).
 */

const src = readFileSync(join(import.meta.dirname, 'Button.tsx'), 'utf8');

test('etiket tek satır ve küçülebilir', () => {
  // İki değişkenin (primary / secondary+ghost) İKİSİNDE de olmalı: ilk
  // düzeltmemde yalnız altın düğmeye koymuştum, ikincil düğme açıkta kalıyordu.
  const etiketler = [...src.matchAll(/<Text[\s\S]*?>\s*\{label\}/g)].map((m) => m[0]);
  assert.equal(etiketler.length, 2, `beklenen 2 etiket, bulunan ${etiketler.length}`);
  for (const e of etiketler) {
    assert.match(e, /numberOfLines=\{1\}/, 'etiket sarabiliyor — numberOfLines={1} yok');
    assert.match(e, /adjustsFontSizeToFit/, 'sığmayan etiket küçülmüyor');
  }
});

test('küçülme tabanı okunur kalıyor', () => {
  // Sınırsız küçülme "sığdı" ama okunmaz sonucu verir. %75 → 12pt taban.
  const m = /minimumFontScale=\{([\d.]+)\}/.exec(src);
  assert.ok(m, 'minimumFontScale verilmemiş — RN keyfi küçültür');
  const oran = Number(m[1]);
  assert.ok(oran >= 0.7, `taban çok düşük: ${oran}`);
  assert.ok(16 * oran >= 11, `${16 * oran}pt okunmaz`);
});

/**
 * Aynı hatanın EKRAN İÇİ kopyaları: sabit yükseklikli kendi düğmesini çizen
 * ekranlar. Tarama 9 aday buldu, hiçbiri ihlal değildi (etiketleri kısa ya da
 * kap büyüyebiliyor). Bu test yeni eklenen bir kopyayı yakalar.
 */
test('sabit yükseklikli ekran düğmelerinde uzun etiket kırpılmıyor', () => {
  const kok = join(import.meta.dirname, '..', '..', 'app');
  const dosyalar: string[] = [];
  const gez = (d: string) => {
    for (const ad of readdirSync(d)) {
      const tam = join(d, ad);
      if (statSync(tam).isDirectory()) gez(tam);
      else if (ad.endsWith('.tsx')) dosyalar.push(tam);
    }
  };
  gez(kok);

  const ihlal: string[] = [];
  for (const f of dosyalar) {
    const s = readFileSync(f, 'utf8');
    for (const m of s.matchAll(/ {4}(\w+): \{([^}]*)\},/g)) {
      const [, ad, govde] = m;
      const h = /height:\s*(\d+)/.exec(govde);
      // Yalnız BÜYÜYEMEYEN kaplar: sabit yükseklik + yuvarlatma (düğme biçimi).
      if (!h || Number(h[1]) < 36 || Number(h[1]) > 64) continue;
      if (!/borderRadius/.test(govde)) continue;
      // HER kullanım ayrı ayrı: quote/new'de aynı stili iki düğme kullanıyordu
      // ve ilk düzeltmem yalnız birincisine dokunmuştu. Pencere 1200 karakter —
      // prettier propları alt alta sardığında 400 yetmiyor ve tarama sessizce
      // yanlış bloğa kayıyor.
      const kullanimlar = [
        ...s.matchAll(
          new RegExp(
            `<(?:Pressable|TouchableOpacity)[^>]*style=\\{(?:\\[)?styles\\.${ad}\\b[\\s\\S]{0,1200}?</(?:Pressable|TouchableOpacity)>`,
            'g',
          ),
        ),
      ];
      for (const kul of kullanimlar) {
        const blok = kul[0];
        if (!blok.includes('<Text')) continue;
        // Metin tek satıra sabitlenmişse kırpılma yerine "…" olur — kabul.
        if (blok.includes('numberOfLines')) continue;
        // Metnin kendisi kısa sabitse (t() yok) risk yok.
        if (!/t\('/.test(blok)) continue;
        ihlal.push(`${f.slice(kok.length + 1)} → styles.${ad} (${h[1]}pt)`);
      }
    }
  }
  assert.deepEqual(
    ihlal,
    [],
    `Sabit yükseklikli düğmede sınırsız etiket — uzun dilde kırpılır:\n  ${ihlal.join('\n  ')}\n` +
      'numberOfLines={1} + adjustsFontSizeToFit ver ya da paylaşılan Button kullan.',
  );
});
