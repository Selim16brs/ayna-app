import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * FOTOĞRAFSIZ AVATAR — harf kutuya sığmalı.
 *
 * Kurucu bildirdi: "avatardaki harf tam gözükmüyor." Sebep tek satırdı ama
 * bir SINIF hatası: `Text` varsayılan `body` ölçeğini uyguluyor (16/24) ve
 * çağıran yalnız `fontSize` geçerse `lineHeight` 24'te KALIYOR. Punto sabit
 * 22 iken görünmüyordu — 24'ün altındaydı. Punto ölçüden türetilip 37–46'ya
 * çıkınca harf alttan ve üstten kırpıldı.
 *
 * Bu dosya kaynağı METİN olarak okuyor: bileşen react-native'e bağımlı ve
 * Node test koşucusu onu derleyemiyor (aynı yöntem `tabbar-clearance` içinde).
 */
const kaynak = readFileSync(join(import.meta.dirname, 'SaglayiciFoto.tsx'), 'utf8');
const kod = kaynak.replace(/\/\*[\s\S]*?\*\//g, '');

test('HARFİN satır yüksekliği puntoyla birlikte veriliyor', () => {
  assert.match(kod, /fontSize: punto/, 'punto ölçüden türetilmiyor');
  assert.match(
    kod,
    /lineHeight: Math\.round\(punto \* [\d.]+\)/,
    'satır yüksekliği puntoya bağlı değil — büyük harf kırpılır',
  );
});

test('PUNTO kutunun KISA kenarından türetiliyor', () => {
  // 118×132'lik uzman portresinde uzun kenardan hesaplansaydı harf yanlardan taşardı.
  assert.match(kod, /Math\.min\(g, y\)/, 'punto kısa kenara bağlı değil');
  // Uçlar bağlı olmalı: küçük avatarda okunmaz, büyüğünde kaba punto çıkmasın.
  assert.match(kod, /Math\.max\(12, Math\.min\(52,/, 'punto sınırlanmamış');
});

test('SİSTEM yazı ölçeği sabit kutuyu taşırmıyor', () => {
  // Avatar sabit ölçülü; %140 yazı ölçeğinde harf daireden taşardı.
  assert.match(kod, /allowFontScaling=\{false\}/, 'yazı ölçeği kapatılmamış');
});

test('GRADYAN kimliği listede çakışmıyor', () => {
  /*
   * SVG `id` belge genelinde geçerli. Sabit bir ad verilseydi aynı listedeki
   * ikinci avatar birincinin gradyanını çizerdi — herkes ilk kişinin rengine
   * bürünürdü. Tona bağlanınca çakışan tek durum "aynı ton", o da aynı boya.
   */
  assert.match(kod, /const gradId = `saglayici-\$\{ton\}`/, 'gradyan kimliği tona bağlı değil');
  assert.match(kod, /fill=\{`url\(#\$\{gradId\}\)`\}/, 'dolgu kimliği kullanılmıyor');
});

test('TON addan türetiliyor — rastgele DEĞİL', () => {
  /*
   * Aynı salon aramada, haritada ve randevu ekranında aynı renkte çıkmalı.
   * `Math.random` kullanılsaydı her render başka renk verir, tanıdıklık kaybolurdu.
   */
  assert.doesNotMatch(kod, /Math\.random/, 'renk rastgele seçiliyor');
  /*
   * Ton TAM ADDAN değil BAŞ HARFTEN türetilmeli. Keşfet adı `.split(' ')[0]`
   * ile kırpıp veriyor, profil tamamını: tam ada bağlanınca aynı kişi iki
   * ekranda iki farklı renk alıyordu.
   */
  assert.match(kod, /tonSec\(harf\)/, 'ton baş harften türetilmiyor');
  // `function tonSec(ad: string)` TANIMI değil, ÇAĞRISI hedefleniyor.
  assert.doesNotMatch(kod, /= tonSec\(ad/, 'ton hâlâ tam ada bağlı — kırpılmış adda renk değişir');
});
