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
const TAB_BAR_CLEARANCE = sabit('FADE_H') + 24;

/**
 * KAYDIRILAN İÇERİK ALT MENÜNÜN ALTINDA KALMAMALI.
 *
 * Kurucu bildirdi: "kaydet butonu arkada kalıyor, basılmıyor." Hizmetlerim
 * ekranının alt boşluğu 48pt idi; yüzen alt menü ise 114pt yer kaplıyor.
 * Sayfanın SONUNDAKİ düğme barın altına düşüyor ve TIKLANAMIYOR.
 *
 * ── KURAL TERSİNE ÇEVRİLDİ ──────────────────────────────────────────────
 *
 * Bu dosya eskiden "barın gizlendiği ekranlar" diye bir İSTİSNA listesi
 * tutuyordu, çünkü bar neredeyse her ekranda görünüyordu. Artık tersi:
 * `app/_layout.tsx` barı YALNIZ sekme köklerinde çiziyor. Yani istisna
 * listesi değil, barın göründüğü yerlerin TAM listesi tutuluyor.
 *
 * İki yönlü kontrol ediliyor:
 *  1. Sekme kökleri boşluk BIRAKMALI  — yoksa içerik barın altında kalır.
 *  2. Diğer ekranlar boşluk BIRAKMAMALI — bar yokken o boşluk sayfanın
 *     sonunda 130pt'lik bir delik demek.
 */

const appKok = join(import.meta.dirname, '..', '..', 'app');

/**
 * Alt barın GÖRÜNDÜĞÜ ekranlar — `app/_layout.tsx` içindeki
 * MUSTERI_KOKLERI / SALON_KOKLERI / UZMAN_KOKLERI ile aynı yollar.
 */
const SEKME_KOKLERI = [
  '(tabs)/discover.tsx',
  '(tabs)/bookings.tsx',
  '(tabs)/care.tsx',
  '(tabs)/circle.tsx',
  '(tabs)/profile.tsx',
  'salon/home.tsx',
  'salon/agenda.tsx',
  'salon/staff.tsx',
  'salon/profile.tsx',
  'seller/reports.tsx',
  'seller/menu.tsx',
  'seller/offline.tsx',
];

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

test('boşluk SOLMA katmanını da aşıyor', () => {
  // Solma ekranın alt FADE_H kadarını kaplıyor; içerik onun tamamen üstünde
  // başlamalı. Yalnız hapı (PILL_BOTTOM + PILL_H) hesaplamak yetmiyordu:
  // ana ekran düğmeli telefonda hapın üstü 112pt'ye çıkıyor ve 114–130 arası
  // içerik solmanın içinde eriyip okunmaz oluyordu.
  const fade = sabit('FADE_H');
  assert.ok(TAB_BAR_CLEARANCE > fade, `${TAB_BAR_CLEARANCE} ≤ solma ${fade}`);
  // Güvenli alanlı cihazda hapın üstü: max(34, PILL_BOTTOM-10) + pay + PILL_H
  const hapUstu = Math.max(34, sabit('PILL_BOTTOM') - 10) + sabit('PILL_NEFES') + sabit('PILL_H');
  assert.ok(TAB_BAR_CLEARANCE >= hapUstu + 20, `${TAB_BAR_CLEARANCE} < hap üstü ${hapUstu} + pay`);
});

test('SEKME KÖKLERİ bara yer bırakıyor', () => {
  const ihlal: string[] = [];
  for (const rel of SEKME_KOKLERI) {
    const src = readFileSync(join(appKok, rel), 'utf8');
    if (!/ScrollView|FlatList/.test(src)) continue;
    // Sabiti bir ALT BOŞLUK olarak kullanan dosya güvenli sayılır. Desen
    // hesaplı ifadeleri de kabul etmeli: `insets.bottom + TAB_BAR_CLEARANCE`
    // ve `130 + TAB_BAR_CLEARANCE` da doğru kullanım.
    if (/paddingBottom:\s*[^,}\n]*TAB_BAR_CLEARANCE/.test(src)) continue;
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

test('SEKME KÖKÜ OLMAYAN ekran bar boşluğu AYIRMIYOR', () => {
  /*
   * Ters yön — kural tersine çevrilince gereken kontrol bu oldu.
   *
   * Bar o ekranlarda çizilmiyor; `TAB_BAR_CLEARANCE` orada ayrılmış bir
   * boşluk, sayfanın sonunda kocaman bir delik demek. Kurucu bunu bildirdi.
   */
  const kokSet = new Set(SEKME_KOKLERI);
  const ihlal = ekranlar().filter(
    (rel) =>
      !kokSet.has(rel) &&
      rel !== '_layout.tsx' &&
      /\bTAB_BAR_CLEARANCE\b/.test(readFileSync(join(appKok, rel), 'utf8')),
  );
  assert.deepEqual(
    ihlal,
    [],
    `Bar bu ekranlarda çizilmiyor ama boşluğu ayrılmış:\n  ${ihlal.join('\n  ')}`,
  );
});

test('KÖK LİSTESİ gerçek dosyalara işaret ediyor', () => {
  // Yol yanlış yazılırsa yukarıdaki iki test de sessizce boş geçerdi.
  const hepsi = new Set(ekranlar());
  const eksik = SEKME_KOKLERI.filter((r) => !hepsi.has(r));
  assert.deepEqual(eksik, [], `Kök listesinde olmayan dosya: ${eksik.join(', ')}`);
  assert.ok(SEKME_KOKLERI.length >= 12, `yalnız ${SEKME_KOKLERI.length} kök — liste daralmış`);
});

test('KÖK LİSTESİ layout ile aynı', () => {
  /*
   * Aynı bilgi iki yerde: `app/_layout.tsx` barı hangi yollarda çizeceğini,
   * bu dosya hangi ekranların boşluk bırakacağını biliyor. Ayrışırlarsa ya
   * bar kendi sekmesinde kaybolur ya da içerik barın altında kalır.
   */
  const layout = readFileSync(join(appKok, '_layout.tsx'), 'utf8');
  const satirlar = layout.split('\n').filter((l) => /_KOKLERI = \[/.test(l));
  assert.ok(satirlar.length >= 3, 'layout içinde kök listeleri bulunamadı');
  const layoutYollari = new Set(
    satirlar.flatMap((l) => [...l.matchAll(/'(\/[a-z\-/]+)'/g)].map((m) => m[1] as string)),
  );
  const dosyaYollari = new Set(
    SEKME_KOKLERI.map((r) => '/' + r.replace(/\.tsx$/, '').replace('(tabs)/', '')),
  );
  for (const y of layoutYollari) {
    assert.ok(dosyaYollari.has(y), `layout'ta ${y} kök ama test listesinde yok`);
  }
  for (const y of dosyaYollari) {
    assert.ok(layoutYollari.has(y), `test listesinde ${y} var ama layout onu kök saymıyor`);
  }
});

/**
 * SABİT ALT ŞERİTLER de barı aşmalı.
 *
 * Kaydırma içeriğine boşluk vermek YETMEZ: ekranın altında sabit bir eylem
 * şeridi varsa (Paylaş düğmesi, dekont yükle) barı AŞMASI GEREKEN odur.
 * `seller/share` tam bu yüzden bozuktu — boşluk kaydırma kabına konmuştu,
 * düğme yine barın altında kalıyordu.
 */
test('SEKME KÖKÜNDE sabit alt şeritler barı aşıyor', () => {
  const ihlal: string[] = [];
  for (const rel of SEKME_KOKLERI) {
    const src = readFileSync(join(appKok, rel), 'utf8');
    const m =
      /<\/ScrollView>\s*\n\s*<View style=\{(?:\[)?styles\.(actions|footer|bottomBar|cta)\b/.exec(
        src,
      );
    if (!m) continue;
    const ad = m[1];
    if (new RegExp(`styles\\.${ad}[^\\n]*TAB_BAR_CLEARANCE`).test(src)) continue;
    const sm =
      new RegExp(`    ${ad}: \\{[\\s\\S]*?\\n    \\},`).exec(src) ??
      new RegExp(`    ${ad}: \\{[^\\n]*\\},`).exec(src);
    if (sm && /paddingBottom:[^,}\n]*TAB_BAR_CLEARANCE/.test(sm[0])) continue;
    if (new RegExp(`paddingBottom: [^\\n]*TAB_BAR_CLEARANCE`).test(src)) continue;
    ihlal.push(`${rel} (styles.${ad})`);
  }
  assert.deepEqual(
    ihlal,
    [],
    `Sabit alt şerit barın altında kalıyor:\n  ${ihlal.join('\n  ')}\n` +
      'Şeridin paddingBottom değeri TAB_BAR_CLEARANCE içermeli.',
  );
});
