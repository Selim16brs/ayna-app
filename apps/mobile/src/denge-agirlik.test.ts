import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { darkColors, lightColors } from './theme.palette';

/**
 * DENGE — ekranın ağırlığı.
 *
 * Kurucu: "tum sayfalar cok dark oldu. bunları daha profesyonel sekılde
 * yenıden tum ekranları ınsanları raahtsız etmeyecek sekılde duzenle."
 *
 * Ölçüm şikâyeti doğruladı: açık temada alt menü çubuğunun parlaklığı
 * 0.007 (neredeyse siyah), sayfa zemini 0.934. Her ekranın altında duran
 * bu bar + tam genişlik koyu bantlar + üst üste binen koyu kartlar.
 *
 * Seçilen yön DENGE: marka rengi (erik) DEĞİŞMİYOR — kapladığı ALAN
 * değişiyor. Ekran başına en fazla BİR büyük koyu yüzey; o da bant değil
 * kart, ve önemli/paraya dair olan.
 */

const yorumsuz = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

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

const ekranlar = (): string[] => {
  const out: string[] = [];
  const gez = (d: string) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const t = join(d, e.name);
      if (e.isDirectory()) gez(t);
      else if (e.name.endsWith('.tsx')) out.push(t);
    }
  };
  gez(join(__dirname, '..', 'app'));
  return out;
};

test('ALT MENÜ her ekranın altında koyu leke DEĞİL', () => {
  // `colors.inverse` (#1E0E1B) idi — ekranın en ağır lekesi buydu.
  const k = yorumsuz(readFileSync(join(__dirname, 'ui', 'FloatingTabBar.tsx'), 'utf8'));
  assert.doesNotMatch(k, /backgroundColor: colors\.inverse/, 'alt menü hâlâ ters koyu yüzey');
  assert.match(k, /backgroundColor: colors\.surface/, 'alt menü yüzey rengini kullanmıyor');
  // Renkle ayrışmadığı için kenarlık ve gölge ŞART.
  assert.match(k, /borderColor: colors\.lineStrong/, 'açık çubuğun kenarlığı yok');
  assert.match(k, /shadowColor: colors\.accent/, 'açık çubuğun gölgesi yok');
});

test('ALT MENÜ okunuyor — iki temada', () => {
  for (const [ad, c] of [
    ['açık', lightColors],
    ['koyu', darkColors],
  ] as const) {
    const pasif = oran(c.muted, c.surface);
    assert.ok(pasif >= 4.5, `${ad}: pasif sekme ${pasif.toFixed(2)}:1`);
    const aktif = oran(c.onAccent, c.accent);
    assert.ok(aktif >= 4.5, `${ad}: aktif sekme ${aktif.toFixed(2)}:1`);
  }
});

test('ERİK SİSİ zemininde her yazı okunuyor', () => {
  // Büyük kartların yeni zemini. Üstüne başlık, ikincil yazı ve erik
  // vurgu geliyor; üçü de geçmeli.
  for (const [ad, c] of [
    ['açık', lightColors],
    ['koyu', darkColors],
  ] as const) {
    for (const [rol, renk] of [
      ['başlık', c.ink],
      ['ikincil', c.muted],
      ['vurgu', c.accent],
    ] as const) {
      const o = oran(renk, c.heroSoft);
      assert.ok(o >= 4.5, `${ad} tema: erik sisinde ${rol} ${o.toFixed(2)}:1`);
    }
  }
});

test('EKRAN BAŞINA en fazla BİR büyük koyu yüzey', () => {
  /*
   * Büyük koyu yüzey = dolu koyu gradyan ya da koyu marka zemini olan
   * KART. Küçük ögeler (erik hap, birincil düğme, aktif sekme, ikon
   * kutusu) sayılmıyor — Denge onları zaten koruyor.
   *
   * İki koyu kart üst üste binince ekran ağırlaşıyor; `rewards` tam
   * olarak öyleydi (erik puan kartı + dolu gül çekiliş kartı).
   */
  const BUYUK =
    /colors=\{(?:gradients\.(?:gold|plum|rose)|OZET_DEGRADE|YOL_DEGRADE)\}|backgroundColor: IADE_ZEMIN/g;
  // `boni` hero'nun yanında küçük bir kilit ikonu için aynı gradyanı
  // kullanıyor; ikisi birden sayılıyor ama ikincisi 56pt'lik bir kutu.
  const IZINLI = new Set(['boni.tsx']);
  const suclular: string[] = [];
  for (const yol of ekranlar()) {
    const ad = yol.split('/app/')[1]!;
    if (IZINLI.has(ad)) continue;
    const n = (yorumsuz(readFileSync(yol, 'utf8')).match(BUYUK) ?? []).length;
    if (n > 1) suclular.push(`${ad} (${n})`);
  }
  assert.deepEqual(suclular, [], `birden fazla büyük koyu yüzey: ${suclular.join(', ')}`);
});

test('TAM GENİŞLİK koyu bant yok', () => {
  // En ağır biçim bu: tam genişlik, uzun, dolu koyu başlık bandı.
  // `(tabs)/profile` başlığı böyleydi.
  const k = yorumsuz(readFileSync(join(__dirname, '..', 'app', '(tabs)', 'profile.tsx'), 'utf8'));
  assert.doesNotMatch(k, /<LinearGradient/, 'profil başlığı hâlâ dolu gradyan bant');
  assert.match(k, /backgroundColor: colors\.heroSoft/, 'profil başlığı erik sisinde değil');
});

test('HERO/BANT dolu koyu DEĞİL', () => {
  /*
   * `uzman/[id]` hero'su ESKİ tasarımda lime yeşili bir banttı ve yazısı
   * `ink` (koyu) idi. Palet Figma'ya geçince zemin koyu eriğe döndü ama
   * YAZI DEĞİŞMEDİ: uzmanın adı açık temada 1.33:1, koyuda 2.02:1 — hiç
   * okunmuyordu ve kimse fark etmedi.
   *
   * Kuralı metin rengini tahmin ederek değil DOĞRUDAN yazıyorum: Denge'de
   * bant (hero/band/banner) zaten dolu koyu olmayacak. İki denemem de
   * tahmin üzerineydi ve ikisi de yanlış çıktı — biri masum ekranları
   * suçladı (900 karakterlik pencere `referral` ve `map`i vurdu),
   * öteki gerçek vakayı kaçırdı (400 karakter `heroName`e yetişmiyor).
   * Kuralın kendisi zaten bu; dolambaçlı yoldan çıkarmaya gerek yok.
   */
  const ADAY = /^ {4}(hero|band|banner)\w*: \{([\s\S]*?)^ {4}\},/gim;
  const suclular: string[] = [];
  for (const yol of ekranlar()) {
    for (const m of yorumsuz(readFileSync(yol, 'utf8')).matchAll(ADAY)) {
      const govde = m[2]!;
      if (!/backgroundColor: colors\.accent\b/.test(govde)) continue;
      // BANT ile KART'ı ayıran şey yuvarlak köşe: kartın var, bandın yok.
      // Denge dolu koyu KARTA izin veriyor (ekranın tek koyu ögesi, önemli
      // olan); yasakladığı şey tam genişlik koyu BANT.
      if (/borderRadius/.test(govde)) continue;
      suclular.push(`${yol.split('/app/')[1]} → ${m[1]}`);
    }
  }
  assert.deepEqual(suclular, [], `dolu koyu bant: ${suclular.join(', ')}`);
});

test('ERİK SİSİ zemininde ink OKUNUYOR — kaçış yolu değil', () => {
  // Yukarıdaki kalıptan kaçmanın yolu zemini erik sisine indirmek; o
  // zaman da `ink`in orada gerçekten okunması gerekiyor.
  for (const [ad, c] of [
    ['açık', lightColors],
    ['koyu', darkColors],
  ] as const) {
    const o = oran(c.ink, c.heroSoft);
    assert.ok(o >= 7, `${ad}: erik sisinde başlık ${o.toFixed(2)}:1 — hero için 7 bekleniyor`);
  }
});
