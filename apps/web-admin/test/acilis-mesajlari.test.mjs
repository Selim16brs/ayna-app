import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * AÇILIŞ MESAJLARI PANELİ — brief §7.2 / §7.3.
 *
 * Zincirin üç halkası: sunucu ucu → istemci fonksiyonu → panel ekranı.
 * Bir halka eksikse yönetici mesajı düzenleyemez ama bunu hiçbir hata
 * söylemez.
 */

const kok = join(import.meta.dirname, '..');
const api = readFileSync(join(kok, 'app/lib/api.ts'), 'utf8');
const ui = readFileSync(join(kok, 'app/page.tsx'), 'utf8');
const sunucu = readFileSync(join(kok, '../api/src/splash/splash.controller.ts'), 'utf8');

const gorunum = ui.slice(
  ui.indexOf('function SplashView()'),
  ui.indexOf('function AnnouncementsView()'),
);

test('SUNUCU UÇLARININ hepsinin istemci karşılığı var', () => {
  for (const [uc, istemci] of [
    ['@Get()', 'acilisMesajlari'],
    ["@Get('report')", 'acilisRapor'],
    ["@Post('seed')", 'acilisPaketiAktar'],
    ["@Post(':code')", 'acilisMesajKaydet'],
    ["@Post(':code/active')", 'acilisMesajDurum'],
  ]) {
    assert.ok(sunucu.includes(uc), `sunucu ucu yok: ${uc}`);
    assert.ok(api.includes(`${istemci}:`), `istemci fonksiyonu yok: ${istemci}`);
    assert.ok(gorunum.includes(`api.${istemci}(`), `panel çağırmıyor: ${istemci}`);
  }
});

test('PANEL menüde ve yönlendirmede kayıtlı', () => {
  assert.match(ui, /id: 'splash', label: 'Açılış mesajları'/, 'menüde yok');
  assert.match(ui, /tab === 'splash' && <SplashView \/>/, 'sekme çizilmiyor');
});

test('ÜÇ DİL dolmadan kaydet düğmesi çalışmıyor', () => {
  /*
   * Eksik dil, o dildeki kullanıcıya BOŞ açılış ekranı demek. Sunucu da
   * reddediyor ama yöneticinin bunu "kaydedilemedi" hatasıyla değil,
   * düğmeye basmadan önce görmesi gerek.
   */
  assert.match(
    gorunum,
    /const eksikDil = !form\.tr\.trim\(\) \|\| !form\.kk\.trim\(\) \|\| !form\.ru\.trim\(\);/,
  );
  assert.match(gorunum, /disabled=\{eksikDil\}/, 'kaydet düğmesi eksik dilde açık');
  assert.match(
    gorunum,
    /if \(!duzenlenen \|\| eksikDil\) return;/,
    'kaydet fonksiyonu eksik dili geçiriyor',
  );
});

test('KAYDET mesajın KOŞULLARINI geri gönderiyor', () => {
  /*
   * Yalnız metni yollasaydık sunucu eksik alanları varsayılana çeker ve
   * mesajın saat/pencere/davranış koşulları SESSİZCE SİLİNİRDİ: sabah
   * mesajı gece de çıkmaya başlardı.
   */
  const govde = gorunum.slice(
    gorunum.indexOf('await api.acilisMesajKaydet('),
    gorunum.indexOf('setDuzenlenen(null);'),
  );
  for (const alan of [
    'saat',
    'pencere',
    'gunler',
    'haftaSonu',
    'oncelikliOzelGun',
    'adGerekli',
    'dogumGunu',
    'davranis',
    'grup',
    'sira',
  ]) {
    assert.ok(govde.includes(alan), `kaydet gövdesinde '${alan}' yok — koşul silinirdi`);
  }
});

test('BOŞ TABLO açıklanıyor, hata gibi görünmüyor', () => {
  // Uygulama kataloğu kendi taşıyor; boş tablo normaldir.
  assert.match(gorunum, /Tablo boş — bu normal/);
  assert.match(gorunum, /api\.acilisPaketiAktar\(\)/, 'paketi tabloya alma yolu yok');
});

test('GÖSTERİMİ OLMAYAN mesaja skip oranı UYDURULMUYOR', () => {
  /*
   * "%0 atlanıyor" deseydik hiç gösterilmemiş mesaj en başarılı görünür,
   * düşük performanslı mesaj ayıklaması yanlış mesajı korurdu.
   */
  assert.match(gorunum, /r\.skipOrani !== null/);
  assert.match(gorunum, /Henüz gösterim verisi yok/);
});
