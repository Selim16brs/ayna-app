import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

/**
 * FONT GELMEDEN ÖLÇÜ ALINMIYOR.
 *
 * Kurucu iki kez bildirdi: "buton üzerindeki yazı çıkmıyor" ve "hizmet
 * yarım kalmış" ("Hizmet…", "Keşf…").
 *
 * Sebep tek: ilk çizim `Onest-*` daha KAYITLI DEĞİLKEN yapılıyordu. React
 * Native yazıyı bilmediği bir yazı tipiyle ölçüyor, Yoga bu ölçümü düğüm
 * bazında önbelleğe alıyor ve font sonradan gelse de aynı özellikli metin
 * YENİDEN ÖLÇÜLMÜYOR. Kâğıt üzerindeki hesap "sığıyor" derken cihaz
 * kırpıyordu; punto küçültme açıkken de aynı yanlış ölçü, yazıyı birkaç
 * piksellik bir lekeye indiriyordu.
 */

const layout = readFileSync(join(__dirname, '..', 'app', '_layout.tsx'), 'utf8');

test('İLK ÇİZİM fontu BEKLİYOR', () => {
  assert.match(layout, /const \[fontlarHazir\] = useFonts\(\{/, 'yükleme durumu okunmuyor');
  assert.match(
    layout,
    /if \(!fontlarHazir && !beklemeBitti\) return null;/,
    'font gelmeden ölçü alınıyor',
  );
});

test('BEKLEME SONSUZ DEĞİL — beyaz ekran riski geri gelmiyor', () => {
  /*
   * Font yüklemesi bilerek bloke edilmiyordu: asset asılı kalırsa uygulama
   * sonsuza kadar beyaz kalıyordu (gerçek bir olay). Üst sınır o riski
   * kapatıyor — süre dolunca uygulama sistem fontuyla açılıyor.
   */
  const m = /const FONT_BEKLEME_MS = (\d+);/.exec(layout);
  assert.ok(m, 'üst sınır yok — bekleme sonsuz olabilir');
  const ms = Number(m![1]);
  assert.ok(ms > 0 && ms <= 3000, `üst sınır makul değil: ${ms}ms`);
  assert.match(
    layout,
    /setTimeout\(\(\) => setBeklemeBitti\(true\), FONT_BEKLEME_MS\)/,
    'sayaç yok',
  );
  // Sayaç temizleniyor: ekran kapanırken kalan zamanlayıcı uyarı üretir.
  assert.match(layout, /return \(\) => clearTimeout\(t\);/, 'zamanlayıcı temizlenmiyor');
});

test('BÖLÜM BAŞLIĞININ KUTUSU ölçümden DEĞİL paydan', () => {
  /*
   * İkinci kemer: ölçüm yine de şaşarsa başlık yer kaybetmesin. `flexShrink`
   * ile kutu ÖNCE doğal genişlikten hesaplanıyordu; `flex: 1` ile "Tümünü
   * Gör" doğal genişliğini alıyor, kalan tüm yer başlığın oluyor.
   */
  const kesfet = readFileSync(join(__dirname, '..', 'app', '(tabs)', 'discover.tsx'), 'utf8');
  assert.match(kesfet, /bolumBaslik: \{ flex: 1 \}/, 'başlık kutusu ölçüme bağlı');
  const ortak = readFileSync(join(__dirname, 'ui', 'SectionHeader.tsx'), 'utf8');
  assert.match(ortak, /title: \{[^}]*flex: 1 \}/, 'ortak başlık kutusu ölçüme bağlı');
});
