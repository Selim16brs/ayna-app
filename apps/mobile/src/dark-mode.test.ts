import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { AKSAN_ANAHTARLARI } from './theme.aksan';
import { paletUret } from './theme.palette';

/**
 * #15 KARANLIK MOD — rapordaki dört bulgunun düzeltmesi.
 *
 * Kontrastlar YORUMDAN okunmuyor, burada HESAPLANIYOR: yoruma yazılan sayı
 * renk değişince eskiyebilir, hesap eskiyemez.
 */

const kok = join(import.meta.dirname, '..');
const kodu = (...y: string[]) =>
  readFileSync(join(kok, ...y), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

function lum(h: string): number {
  const v = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  const f = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(v[0]!) + 0.7152 * f(v[1]!) + 0.0722 * f(v[2]!);
}
function kon(a: string, b: string): number {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x! + 0.05) / (y! + 0.05);
}

/**
 * İADE BANDI — iki temada da okunuyor.
 *
 * Eski `HomeUrgent` kartı zeminini SABİT tutarak çözüyordu: `rose`/`accent`
 * koyu temada açık renge dönüyor, beyaz yazı 2,27:1'e düşüyordu. Figma
 * tasarımındaki bant zemini `accent`, yazısı `onAccent` — yani ikisi BİRLİKTE
 * dönüyor. Aranan güvence aynı, mekanizma daha iyi: sabitlemek yerine yazıyı
 * zemine bağlamak. Ölçüm bunu doğruluyor.
 */
test('P1 — iade bandı yazısı HER sette ve iki temada okunuyor', () => {
  /*
   * Bant iki temada da KOYU (cihaz temasıyla dönmüyor), yazısı da sabit
   * beyaz. `onAccent` kullanılsaydı koyu temada koyuya döner ve sabit koyu
   * zeminde okunmaz yazı bırakırdı — `uzman/[id]` hero'sunda tam olarak bu
   * hata yaşanmıştı.
   *
   * Eskiden zemin `'#64285A'` sabitiydi ve bu test o tek değeri
   * ölçüyordu. Zemin artık `colors.plum` — yani SEKİZ ayrı değer, iki
   * temada. Hepsi denetleniyor.
   */
  const d = kodu('app/(tabs)/discover.tsx');
  assert.match(
    d,
    /iadeKart:[\s\S]{0,320}backgroundColor: colors\.plum/,
    'bant zemini derin yüzey token’ına bağlı değil',
  );
  assert.match(
    d,
    /iadeBaslik:[\s\S]{0,120}color: colors\.onColor/,
    'bant başlığı sabit açık değil',
  );

  for (const anahtar of AKSAN_ANAHTARLARI) {
    for (const tema of ['light', 'dark'] as const) {
      const c = paletUret(tema, anahtar);
      const r = kon(c.onColor, c.plum);
      assert.ok(r >= 4.5, `iade bandı ${anahtar}/${tema}: yazı/zemin ${r.toFixed(2)}:1 — 4,5 altı`);
    }
  }
});

test('P2 — durum renkleri AÇIK temada eşiği geçiyor', () => {
  const palet = readFileSync(join(kok, 'src/theme.palette.ts'), 'utf8');
  const acik = palet.slice(0, palet.indexOf('darkColors'));
  const tok = (ad: string) => new RegExp(`^  ${ad}: '(#[0-9A-Fa-f]{6})'`, 'm').exec(acik)?.[1];
  for (const [yazi, zemin] of [
    ['gold', 'goldSoft'],
    ['success', 'successSoft'],
    ['danger', 'dangerSoft'],
  ]) {
    const y = tok(yazi);
    const z = tok(zemin);
    assert.ok(y && z, `${yazi}/${zemin} okunamadı`);
    const r = kon(y, z);
    assert.ok(r >= 4.5, `${yazi} / ${zemin} = ${r.toFixed(2)}:1 — 4,5 altı`);
  }
});

test('P2b — tema tercihi KALICI', () => {
  const tc = kodu('src/theme-context.tsx');
  assert.match(tc, /AsyncStorage\.setItem\(TEMA_ANAHTARI/, 'seçim kaydedilmiyor');
  /*
   * Okuma tek anahtarla (`getItem`) ya da aksan kaydıyla birlikte
   * (`multiGet`) yapılabilir — ikisi de kalıcılığı sağlıyor. Bekçinin
   * derdi HANGİ çağrı olduğu değil, tercihin diskten geri okunması.
   */
  assert.match(
    tc,
    /AsyncStorage\.(getItem\(TEMA_ANAHTARI|multiGet\(\[TEMA_ANAHTARI)/,
    'seçim okunmuyor',
  );
  // "Sisteme dön" de bir tercih: kaydı silmeli, sessizce yok saymamalı.
  assert.match(tc, /AsyncStorage\.removeItem\(TEMA_ANAHTARI\)/, 'sisteme dönüş kalıcı değil');
});

/**
 * P2c — UYGULAMA RENGİ de kalıcı.
 *
 * Tema tercihinde bir kez yaşanan hatanın aynısı: seçim yalnız bellekte
 * kalırsa kullanıcı Zümrüt seçiyor, uygulamayı kapatıp açınca gül dönüyor.
 */
test('P2c — uygulama rengi KALICI', () => {
  const tc = kodu('src/theme-context.tsx');
  assert.match(tc, /AsyncStorage\.setItem\(AKSAN_ANAHTARI/, 'renk seçimi kaydedilmiyor');
  assert.match(
    tc,
    /AsyncStorage\.(getItem\(AKSAN_ANAHTARI|multiGet\(\[TEMA_ANAHTARI, AKSAN_ANAHTARI)/,
    'renk seçimi okunmuyor',
  );
  // Bozuk/eski kayıt çökertmemeli; varsayılana düşmeli.
  assert.match(tc, /aksanCoz\(/, 'bilinmeyen kayıt varsayılana düşmüyor');
});

test('P3 — sistem yazı ölçeği sınırlı', () => {
  const tx = kodu('src/ui/Text.tsx');
  assert.match(tx, /maxFontSizeMultiplier=\{OLCEK_SINIRI\}/, 'ölçek sınırı yok');
  const m = /const OLCEK_SINIRI = ([\d.]+);/.exec(tx);
  assert.ok(m, 'sınır sabiti yok');
  const v = Number(m[1]);
  // Ölçeklemeyi TAMAMEN kapatmak da yanlış: büyük yazıya ihtiyacı olan
  // kullanıcı onu kaybeder.
  assert.ok(v > 1, `ölçekleme kapatılmış (${v})`);
  assert.ok(v <= 1.6, `sınır çok yüksek (${v}) — sabit yükseklikli kaplar taşar`);
  // Çağıran ekran kendi değerini geçebilmeli.
  assert.match(
    tx,
    /maxFontSizeMultiplier=\{OLCEK_SINIRI\}\s*\n\s*\{\.\.\.rest\}/,
    'geçersiz kılınamıyor',
  );
});
