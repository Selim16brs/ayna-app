import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { darkGradients, lightGradients } from './theme.gradients';
import { darkColors, lightColors } from './theme.palette';

/**
 * GRADYAN ZEMİNLERİN OKUNABİLİRLİĞİ.
 *
 * Dolu gradyan bir yüzeydir: üstündeki yazı okunmalı, kendisi de arkasındaki
 * zeminden ayrışmalı. Bunlar token dosyasında tek satırda değişiyor ve
 * değişince UYGULAMANIN HER YERİNİ etkiliyor — `gradients.gold` birincil
 * düğmenin gradyanı, yani neredeyse her ekranda var.
 *
 * Buradaki eşikler ölçüm sonucudur, tahmin değil.
 */

function parlaklik(hex: string): number {
  const h = hex.replace('#', '');
  const k = [0, 2, 4].map((i) => {
    const c = parseInt(h.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * k[0] + 0.7152 * k[1] + 0.0722 * k[2];
}
function oran(a: string, b: string): number {
  const [x, y] = [parlaklik(a), parlaklik(b)].sort((m, n) => n - m) as [number, number];
  return (x + 0.05) / (y + 0.05);
}
/** Gradyanın EN KÖTÜ ucu — bir uç geçip öteki kalırsa yazı yarı yolda kaybolur. */
const enKotu = (grad: readonly [string, string], yazi: string) =>
  Math.min(oran(yazi, grad[0]), oran(yazi, grad[1]));

test('BİRİNCİL DÜĞME yazısı iki temada da okunuyor', () => {
  for (const [ad, g, c] of [
    ['açık', lightGradients.gold, lightColors],
    ['koyu', darkGradients.gold, darkColors],
  ] as const) {
    const o = enKotu(g, c.onAccent);
    assert.ok(o >= 4.5, `${ad} tema: birincil düğme yazısı ${o.toFixed(2)}:1 — 4.5 altında`);
  }
});

test('BİRİNCİL DÜĞME zeminden ayrışıyor', () => {
  // Düğme görülebilmeli; zemine karışan düğme basılabilir görünmez.
  for (const [ad, g, c] of [
    ['açık', lightGradients.gold, lightColors],
    ['koyu', darkGradients.gold, darkColors],
  ] as const) {
    const o = Math.min(oran(g[0], c.bg), oran(g[1], c.bg));
    assert.ok(o >= 3, `${ad} tema: düğme zeminden ${o.toFixed(2)}:1 ayrışıyor — 3 altında`);
  }
});

test('MARKA RENGİ temaya göre değişmiyor', () => {
  // Birincil düğme koyu temada GÜL, açık temada ERİKti. Aynı düğmenin iki
  // farklı marka rengi olması tasarım dilini bozuyordu.
  const erikMi = (hex: string) => {
    const h = hex.replace('#', '');
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [
      number,
      number,
      number,
    ];
    // Erik/mor: mavi kanalı yeşilden belirgin yüksek, kırmızı da yeşilin üstünde.
    return b > g + 12 && r > g;
  };
  for (const [ad, g] of [
    ['açık', lightGradients.gold],
    ['koyu', darkGradients.gold],
  ] as const) {
    for (const uc of g) {
      assert.ok(erikMi(uc), `${ad} tema: birincil düğme ucu ${uc} erik değil`);
    }
  }
});

test('ACİL gradyanı gül KALIYOR', () => {
  // Bu temizlik semantik rengi süpürmemeli: `rose` acil/çekiliş kartının
  // rengi ve orada gül olması ANLAMLI.
  for (const g of [lightGradients.rose, darkGradients.rose]) {
    for (const uc of g) {
      const h = uc.replace('#', '');
      const [r, , b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [
        number,
        number,
        number,
      ];
      assert.ok(r > b, `acil gradyanı ${uc} gül olmaktan çıkmış`);
    }
  }
});

test('ACİL kartının yazısı iki temada da OKUNUYOR', () => {
  /*
   * Çekiliş kartı `rose` üstüne SABİT BEYAZ yazıyordu: açık temada 2.94:1,
   * koyu temada 2.25:1 — iki temada da okunmuyordu. Yazı artık gradyanla
   * aynı token setinden geliyor.
   */
  for (const [ad, g, c] of [
    ['açık', lightGradients.rose, lightColors],
    ['koyu', darkGradients.rose, darkColors],
  ] as const) {
    const o = enKotu(g, c.onAccent);
    assert.ok(o >= 4.5, `${ad} tema: acil kartı yazısı ${o.toFixed(2)}:1`);
    const z = Math.min(oran(g[0], c.bg), oran(g[1], c.bg));
    assert.ok(z >= 3, `${ad} tema: acil kartı zeminden ${z.toFixed(2)}:1 ayrışıyor`);
  }
});

test('ÖLÜ gradyan yok', () => {
  // `teal` (yeşil) tek kullanıcısı giriş kapısındaki rol kartıydı; o kart
  // yeniden kurulunca gradyan sahipsiz kaldı. Kullanılmayan token bir
  // sonraki kişiyi "bu da bir seçenek" diye yanıltır.
  const kaynak = readFileSync(join(__dirname, 'theme.gradients.ts'), 'utf8');
  assert.doesNotMatch(kaynak, /\bteal:/, 'kullanılmayan teal gradyanı hâlâ duruyor');
});

test('KART YARIÇAPI Figma ile aynı', () => {
  // Yeni tasarıma geçen ekranlar kartı 20/24 yazıyor; geçmeyenler
  // `radius.lg` kullanıyordu ve o 18'di. İki piksel her ekranda görünüyor.
  const kaynak = readFileSync(join(__dirname, 'theme.ts'), 'utf8');
  const m = /export const radius = \{[^}]*lg: (\d+)/.exec(kaynak);
  assert.ok(m, 'yarıçap ölçeği okunamadı');
  assert.equal(Number(m![1]), 20, 'kart yarıçapı Figma kartıyla (20) aynı değil');
});

test('tema değişen gradyanın üstünde SABİT BEYAZ yazı yok', () => {
  /*
   * Tuzak: `gold` ve `rose` iki temada farklı açıklıkta. Üstüne `onColor`
   * (sabit #FFFFFF) yazan bir ekran bir temada geçer, ötekinde düşer —
   * giriş kapısındaki rol kartı 2.23:1'e, çekiliş kartı 2.25:1'e inmişti.
   *
   * Yazı gradyanla AYNI token setinden gelmeli (`onAccent`).
   *
   * DOSYA GENELİNE bakılıyor, gradyanın etrafına değil: yazı rengi çoğu
   * zaman gradyandan ÖNCE bir değişkende hesaplanıyor. İlk yazdığım
   * kontrol sonrasına bakıyordu ve mutasyonu kaçırdı.
   */
  const kok = join(__dirname, '..', 'app');
  const dosyalar: string[] = [];
  const gez = (d: string) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const t = join(d, e.name);
      if (e.isDirectory()) gez(t);
      else if (e.name.endsWith('.tsx')) dosyalar.push(t);
    }
  };
  gez(kok);

  for (const yol of dosyalar) {
    const k = readFileSync(yol, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    // Yalnız TEMA DEĞİŞEN gradyanın kendi bloğuna bakılıyor. `plum` iki
    // temada da koyu, üstünde beyaz yazı DOĞRU — dosya geneline bakan bir
    // kontrol onu da hata sanıyordu.
    for (const m of k.matchAll(/colors=\{gradients\.(gold|rose)\}/g)) {
      const blok = k.slice(m.index!, k.indexOf('</LinearGradient>', m.index!));
      assert.doesNotMatch(
        blok,
        /tone="onColor"|colors\.onColor/,
        `${yol.split('/app/')[1]}: ${m[1]} gradyanının üstünde sabit beyaz yazı`,
      );
    }
    // Yazı rengi gradyandan ÖNCE değişkende hesaplanıyorsa blok kaçırır;
    // bu ayrı kalıp o yüzden dosya genelinde aranıyor. TEK SATIRA bağlı:
    // satır sonu serbest bırakılınca `const makeStyles = ...` bloğunun
    // tamamını yutup içindeki masum kullanımları da hata sanıyordu.
    if (/gradients\.(gold|rose)/.test(k)) {
      assert.doesNotMatch(
        k,
        /const \w+ = [^;\n]*colors\.onColor/,
        `${yol.split('/app/')[1]}: yazı rengi sabit beyazdan hesaplanıyor`,
      );
    }
  }
});

test('PALET ayna.salon ile aynı dili konuşuyor', () => {
  /*
   * Kurucu siteyi gösterip "burdaki renkler ve renk kullanımı çok hoşuma
   * gitti" dedi. Beğendiği şey renk listesi değil, KULLANIM MODELİ:
   *
   *   · pembe  = EYLEM  (bağlantı, birincil düğme, aktif sekme)
   *   · erik   = DERİN YÜZEY (öne çıkan kart, bölüm zemini)
   *
   * Uygulamada ikisi de erikti; her düğme, çip ve kart aynı koyu tonda
   * olunca ekran ağırlaşıyordu. Bu test iki rolün AYRI kalmasını
   * bekçiliyor — accent yeniden eriğe dönerse model çöker.
   */
  /*
   * PEMBE ile ERİĞİ ayıran şey KIRMIZI–MAVİ FARKI, ton değil:
   *   pembe #BC245B → r=188 b=91  → fark 97
   *   erik  #50094D → r=80  b=77  → fark 3
   * İlk yazdığım ayrım "kırmızı yeşilden büyük, mavi yeşilden büyük" idi
   * ve ERİK DE geçiyordu; mutasyon bunu gösterdi (accent'i eriğe döndürdüm,
   * test uyumadı). Sayıya bakınca ayrım kendini söylüyor.
   */
  const kanal = (hex: string) => {
    const h = hex.replace('#', '');
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [
      number,
      number,
      number,
    ];
    return { r, g, b };
  };
  const pembeMi = (hex: string) => {
    const { r, g, b } = kanal(hex);
    return r - b >= 50 && r > g;
  };
  const erikMi = (hex: string) => {
    const { r, g, b } = kanal(hex);
    return r - b <= 25 && b > g;
  };

  for (const [ad, c] of [
    ['açık', lightColors],
    ['koyu', darkColors],
  ] as const) {
    assert.ok(pembeMi(c.accent), `${ad}: eylem rengi pembe değil (${c.accent})`);
    assert.ok(erikMi(c.plum), `${ad}: derin yüzey erik değil (${c.plum})`);
  }
  // Birincil düğme de eylem rengiyle aynı ailede olmalı.
  for (const g of [lightGradients.gold, darkGradients.gold]) {
    for (const uc of g) assert.ok(pembeMi(uc), `birincil düğme ucu pembe değil (${uc})`);
  }
  // Derin yüzey gradyanı erik kalmalı — düğmeyle aynı renge kaymasın.
  for (const g of [lightGradients.plum, darkGradients.plum]) {
    for (const uc of g) assert.ok(erikMi(uc), `derin yüzey ucu erik değil (${uc})`);
  }
});
