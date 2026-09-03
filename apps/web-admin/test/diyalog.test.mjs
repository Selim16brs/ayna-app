import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * PANEL İÇİ DİYALOG — TARAYICI PENCERESİ KALMADI.
 *
 * Kurucu: "admin paneli rezil durumda hiç user friendly değil ve karışık.
 * bunu daha profesyonel ve kafa karıştırıcılıklardan uzak şekilde yapman
 * lazım. bir değişiklik olduğunda üstten açılan pencere ile değil admin
 * panelinden olsun."
 *
 * Panelde 30 yerde `prompt`/`alert`/`confirm` vardı. Bunlar tarayıcının
 * kendi kutuları: panelin tasarımıyla ilgisiz, ekranın tepesinden düşüyor,
 * TEK alan alıyor ve sayfayı kilitliyor. Üye düzenlemek için arka arkaya
 * DÖRT pencere açılıyordu; üçüncüde vazgeçen ilk ikisini de kaybediyordu.
 */

const kok = join(import.meta.dirname, '..');
const sayfa = readFileSync(join(kok, 'app/page.tsx'), 'utf8');
const diyalog = readFileSync(join(kok, 'app/ui/Diyalog.tsx'), 'utf8');
const css = readFileSync(join(kok, 'app/globals.css'), 'utf8');

/** Yorumsuz kaynak: "bu kalıp kalmadı" testleri gerekçe yorumlarına takılmasın. */
const yorumsuz = (k) =>
  k
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*'))
    .join('\n');

test('panelde hiç tarayıcı penceresi kalmadı', () => {
  const kod = yorumsuz(sayfa);
  for (const kalip of [/\bprompt\(/, /\balert\(/, /\bconfirm\(/]) {
    const m = kod.match(new RegExp(kalip.source, 'g'));
    assert.equal(m, null, `hâlâ kullanılıyor: ${m?.join(', ')}`);
  }
});

test('üye düzenleme TEK formda — dört pencere değil', () => {
  /*
   * Eski akış: ad → e-posta → şehir → telefon, arka arkaya dört `prompt`.
   * Üçüncüde vazgeçen ilk ikisini de kaybediyordu ve hangi üyeyi
   * düzenlediği hiçbir yerde yazmıyordu.
   */
  const i = sayfa.indexOf("baslik: `${u.name || 'Üye'} — bilgileri düzenle`");
  assert.ok(i > 0, 'üye düzenleme formu yok');
  const blok = sayfa.slice(i, i + 1400);
  for (const alan of ["ad: 'name'", "ad: 'email'", "ad: 'city'", "ad: 'phone'"]) {
    assert.ok(blok.includes(alan), `tek formda eksik alan: ${alan}`);
  }
  // Kimin düzenlendiği başlıkta: `prompt` bunu gösteremiyordu.
  assert.match(blok, /u\.name/, 'hangi üyenin düzenlendiği başlıkta yok');
});

test('yıkıcı işlemler AYRI görünüyor', () => {
  // Silme/engelleme, sıradan onaydan renkle ayrılmalı; `confirm` hepsini
  // aynı kutuda gösteriyordu.
  assert.match(diyalog, /tehlikeli/, 'yıkıcı işlem ayrımı yok');
  assert.match(diyalog, /btn-danger/, 'yıkıcı onay kırmızı değil');
  const sayi = (sayfa.match(/tehlikeli: true/g) ?? []).length;
  assert.ok(sayi >= 6, `yıkıcı işaretlenmiş işlem az: ${sayi}`);
});

test('bildirim iş akışını KESMİYOR', () => {
  /*
   * `alert` tıklama bekliyordu. Bildirim şeridi kendiliğinden kayboluyor —
   * kayıt sonrası her seferinde "Tamam"a basmak panelin en sinir bozucu
   * yanıydı.
   */
  assert.match(diyalog, /setTimeout\(\(\) => setBildirimler/, 'bildirim kendiliğinden kapanmıyor');
  assert.match(diyalog, /aria-live="polite"/, 'ekran okuyucu bildirimi duymuyor');
});

test('vazgeçmenin bilinen yolları çalışıyor', () => {
  // ESC ve perdeye tıklama: tarayıcı penceresindeki alışkanlık burada da
  // olmalı, yoksa kullanıcı sıkıştığını hisseder.
  assert.match(diyalog, /e\.key === 'Escape'/, 'ESC ile kapanmıyor');
  assert.match(diyalog, /e\.target === e\.currentTarget/, 'perdeye tıklayınca kapanmıyor');
});

test('zorunlu alan boşken kaydedilemiyor', () => {
  assert.match(diyalog, /eksikZorunlu/, 'zorunlu alan denetimi yok');
  assert.match(diyalog, /disabled=\{eksikZorunlu\}/, 'boş zorunlu alanla kaydet açık');
});

test('menü aranabilir — 26 kalem gözle taranmıyor', () => {
  /*
   * Kutunun VAR OLMASI yetmez, LİSTEYİ SÜZMESİ gerekir: ilk yazımda test
   * yalnız `navAra` adını arıyordu ve süzme kaldırıldığında geçiyordu.
   * Şimdi süzmenin kendisi ve Türkçe karşılaştırma (İ/ı) aranıyor.
   */
  assert.match(
    sayfa,
    /g\.items\.filter\(\(n\) =>[\s\S]{0,200}navAra/,
    'arama kutusu listeyi süzmüyor',
  );
  assert.match(
    sayfa,
    /toLocaleLowerCase\('tr'\)[\s\S]{0,120}navAra[\s\S]{0,120}toLocaleLowerCase\('tr'\)/,
    'Türkçe harf karşılaştırması yok — "İ" aranınca sonuç kaybolur',
  );
  assert.match(sayfa, /Eşleşen ekran yok/, 'arama boş sonuç durumu yok');
  assert.match(css, /\.nav-ara/, 'arama kutusunun stili yok');
});

test('dar ekranda panel kullanılabilir kalıyor', () => {
  // Yönetici telefondan da bakıyor; sabit 246px kenar menü ekranı yiyordu.
  assert.match(css, /@media \(max-width: 1080px\)/, 'dar ekran düzeni yok');
});

test('klavye odağı görünür', () => {
  assert.match(css, /:focus-visible/, 'odak halkası yok — klavyeyle gezilemiyor');
});

test('hareket azaltma tercihi dinleniyor', () => {
  assert.match(css, /prefers-reduced-motion/, 'animasyon kapatılamıyor');
});
