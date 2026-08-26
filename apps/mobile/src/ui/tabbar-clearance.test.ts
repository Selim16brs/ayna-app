import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

// Sabit KAYNAKTAN OKUNUR, import edilmez: FloatingTabBar react-native'e
// bağımlı ve Node test koşucusu onu derleyemiyor. Metinden okumak, sabit
// değişirse testin de değişmesini garanti eder (kopya sayı tutmaz).
const barKaynak = readFileSync(join(import.meta.dirname, 'FloatingTabBar.tsx'), 'utf8');
const sabit = (ad: string): number => {
  const m = new RegExp(`const ${ad} = (\\d+)`).exec(barKaynak);
  if (!m) throw new Error(`${ad} bulunamadı`);
  return Number(m[1]);
};
const TAB_BAR_CLEARANCE = sabit('PILL_BOTTOM') + sabit('PILL_H') + 20;

/**
 * KAYDIRILAN İÇERİK ALT MENÜNÜN ALTINDA KALMAMALI.
 *
 * Kurucu bildirdi: "kaydet butonu arkada kalıyor, basılmıyor." Hizmetlerim
 * ekranının alt boşluğu 48pt idi; yüzen alt menü ise 114pt yer kaplıyor.
 * Sayfanın SONUNDAKİ düğme barın altına düşüyor ve TIKLANAMIYOR.
 *
 * Alt menü neredeyse HER ekranda görünüyor (app/_layout.tsx: yalnız giriş,
 * dil ve yazı yazılan ekranlarda gizli). Yani bu tek bir ekranın hatası değil,
 * bir SINIF hatası: tarandığında 24 ekran çıktı.
 *
 * Ekranın ya `TAB_BAR_CLEARANCE` kullanması ya da en az o kadar alt boşluk
 * vermesi gerekir.
 */

const appKok = join(import.meta.dirname, '..', '..', 'app');

/** Alt menünün GİZLENDİĞİ ekranlar — app/_layout.tsx baseHidden ile aynı. */
const MENUSUZ = [
  /^auth\//,
  /^index\.tsx$/,
  /^language\.tsx$/,
  /^_layout\.tsx$/,
  /^messages\/\[/, // sohbet — yazma alanı barın altında kalmasın diye bar gizli
  /^circle\/\[/, // W2W yorum — aynı sebep
];

/** Altında düğme olmayan tam ekran görüntüleyiciler. */
const TAM_EKRAN = [/^gallery\.tsx$/, /^map\.tsx$/];

function ekranlar(): string[] {
  const out: string[] = [];
  const gez = (dir: string, on = '') => {
    for (const ad of readdirSync(dir)) {
      const tam = join(dir, ad);
      if (statSync(tam).isDirectory()) gez(tam, `${on}${ad}/`);
      else if (ad.endsWith('.tsx')) out.push(`${on}${ad}`);
    }
  };
  gez(appKok);
  return out;
}

/** Dosyadaki en büyük alt boşluk (pt). `space(n)` = n × 8. */
function enBuyukAltBosluk(src: string): number {
  const a = [...src.matchAll(/paddingBottom:\s*space\(([\d.]+)\)/g)].map((m) => Number(m[1]) * 8);
  const b = [...src.matchAll(/paddingBottom:\s*(\d+)/g)].map((m) => Number(m[1]));
  return Math.max(0, ...a, ...b);
}

test('TAB_BAR_CLEARANCE barın gerçek yüksekliğini karşılıyor', () => {
  // 26 (alt boşluk) + 68 (bar yüksekliği) + 20 (nefes payı)
  assert.equal(TAB_BAR_CLEARANCE, 114);
});

test('alt menü görünen her kaydırılabilir ekran ona yer bırakıyor', () => {
  const ihlal: string[] = [];
  for (const rel of ekranlar()) {
    if (MENUSUZ.some((r) => r.test(rel)) || TAM_EKRAN.some((r) => r.test(rel))) continue;
    const src = readFileSync(join(appKok, rel), 'utf8');
    if (!/ScrollView|FlatList/.test(src)) continue;
    if (src.includes('TAB_BAR_CLEARANCE')) continue;
    const bosluk = enBuyukAltBosluk(src);
    if (bosluk < TAB_BAR_CLEARANCE) ihlal.push(`${rel} (${bosluk}pt)`);
  }
  assert.deepEqual(
    ihlal,
    [],
    `Sayfa sonundaki içerik alt menünün altında kalıyor:\n  ${ihlal.join('\n  ')}\n` +
      'İçerik kabına paddingBottom: TAB_BAR_CLEARANCE ver.',
  );
});

test('taramanın kendisi boşuna geçmiyor', () => {
  // İhlal listesi her zaman boş çıkan bir tarama, hiçbir şeyi korumaz.
  const bakilan = ekranlar().filter((rel) => {
    if (MENUSUZ.some((r) => r.test(rel)) || TAM_EKRAN.some((r) => r.test(rel))) return false;
    return /ScrollView|FlatList/.test(readFileSync(join(appKok, rel), 'utf8'));
  });
  assert.ok(bakilan.length >= 40, `yalnız ${bakilan.length} ekran taranıyor — tarama daralmış`);
});
