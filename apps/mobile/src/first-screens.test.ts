import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * #4 BOŞ EKRAN · #5 ONBOARDING · #6 İLK EYLEM.
 *
 * Tespitler:
 *   - Keşfet `useProfessionalsLoading`i HİÇ kullanmıyordu: veri gelene kadar
 *     liste boş dönüyor ve ekran "Bu şehirde hizmet veren yok" diyordu.
 *     Almatı'dan istek ~1,5 sn — her yeni kullanıcı önce YANLIŞ mesaj
 *     görüyordu, boş ekrandan da kötü.
 *   - W2W sekmesinde boş durum HİÇ yoktu: filtre bir şey eşlemezse bomboş
 *     alan kalıyordu.
 *   - Yeni uzman SIFIRLARLA dolu bir gösterge paneline düşüyordu; ne
 *     yapacağına dair yönlendirme yoktu.
 */

const kok = join(import.meta.dirname, '..');
const kodu = (...y: string[]) =>
  readFileSync(join(kok, ...y), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

test('#4 — Keşfet YÜKLENİRKEN boş-durum mesajı vermiyor', () => {
  const d = kodu('app/(tabs)/discover.tsx');
  assert.match(d, /const prosLoading = useProfessionalsLoading\(\)/, 'yükleme durumu okunmuyor');
  // "Bu şehirde yok" mesajı YALNIZ yükleme bittikten sonra çıkmalı.
  assert.match(
    d,
    /const cityEmpty = !prosLoading && cityPros\.length === 0/,
    'yükleme ile boş ayrılmamış',
  );
  // Spinner değil ISKELET (denetim açıkça skeleton diyor).
  assert.match(d, /<ListSkeleton rows=\{4\} \/>/, 'iskelet yok');
});

test('#4 — W2W sekmesinde boş durum var ve SEKMEYE göre değişiyor', () => {
  const c = kodu('app/(tabs)/circle.tsx');
  assert.match(c, /visible\.length === 0 \?/, 'boş durum yok');
  // "Kaydettiğin yok" ile "kimse paylaşmamış" aynı şey değil.
  for (const k of ['circle.empty.mine', 'circle.empty.saved', 'circle.empty.feed']) {
    assert.ok(c.includes(k), `${k} yok`);
  }
  // Boş durumda tek net aksiyon olmalı.
  assert.match(c, /router\.push\('\/circle\/new'\)/, 'boş durumda aksiyon yok');
});

test('#6 — yeni uzmana ilk eylem gösteriliyor', () => {
  const r = kodu('app/seller/reports.tsx');
  assert.match(r, /\{bookings\.length === 0 \? \(/, 'ilk eylem kartı yok');
  assert.ok(r.includes('seller.start.services'), 'hizmet girme yönlendirmesi yok');
  assert.ok(r.includes('seller.start.verify'), 'doğrulama yönlendirmesi yok');
  // İşi başlayınca kaybolmalı — kalıcı bir uyarı değil.
  assert.doesNotMatch(
    r,
    /\{true \? \(\s*<View style=\{\[styles\.startCard/,
    'kart koşulsuz çiziliyor',
  );
});

test('#6 — müşteri ilk ekranında birincil eylem var', () => {
  // Denetim: "Ne arıyorsun?" arama/talep girişi veya popüler hizmetler.
  const d = kodu('app/(tabs)/discover.tsx');
  assert.ok(d.includes("t('home.search')"), 'arama alanı yok');
  // Arama çubuğu artık yazı girdisi değil, arama ekranına GÖTÜREN bir düğme
  // (Figma tasarımı böyle). Güvence aynı kalıyor: dokunulunca bir yere gider.
  const arama = d.slice(d.indexOf("t('home.search')") - 400, d.indexOf("t('home.search')"));
  assert.match(arama, /router\.push\('\/search'\)/, 'arama bir yere götürmüyor');
});

test('#5 — onboarding kısa: veri girişi istemiyor', () => {
  // Ayrı bir onboarding akışı YOK (0 ekran ≤ 3 — kriter sağlanıyor).
  // Karşılama ekranı tek ekran ve BİLGİ GİRİŞİ istemiyor: denetim
  // "onboarding'de isim/e-posta/doğum tarihi yok" diyor.
  const w = kodu('app/index.tsx');
  assert.doesNotMatch(w, /<TextInput/, 'karşılama ekranı bilgi girişi istiyor');
  // Ve gezinti birincil eylem (misafir yolu #2'de eklendi).
  assert.ok(w.includes("t('welcome.browse')"), 'misafir yolu yok');
});
