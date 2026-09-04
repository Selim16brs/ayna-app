import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

/**
 * 4 EYLÜL 2026 — kurucunun canlı uygulamada bulduğu hatalar.
 *
 * Ortak kök: uygulama, bir randevuda KİM olduğunu (müşteri mi uzman mı)
 * yeterince bilmiyordu; ekranlar da sığmayan yazıyı okunamayacak kadar
 * küçültüyordu.
 */

const oku = (...p: string[]) => readFileSync(join(__dirname, '..', ...p), 'utf8');
const api = (...p: string[]) => readFileSync(join(__dirname, '..', '..', 'api', ...p), 'utf8');
const store = oku('src', 'store.ts');

test('MÜŞTERİ HATIRLATMALARI uzmanın telefonuna DÜŞMÜYOR', () => {
  /*
   * Kurucu: "müşterinin açtığı bir randevuda uzmana bildirim olarak
   * 'ücretsiz iade için son uyarı' gidiyor."
   *
   * Sağlayıcı olduğu randevular uzmanın cihazında AYNI listede duruyor
   * (`benimRolum: 'uzman'`) ve hatırlatma üreticisinden geçiyordu.
   */
  const i = store.indexOf('const bookings = s.bookings.map((b) => {');
  assert.ok(i > 0, 'hatırlatma döngüsü yok');
  assert.match(
    store.slice(i, i + 900),
    /if \(b\.benimRolum === 'uzman'\) return b;/,
    'uzman elenmiyor',
  );
  assert.match(
    oku('src', 'notifications.ts'),
    /if \(b\.benimRolum === 'uzman'\) continue;/,
    'planlı bildirimde elenmiyor',
  );
  // Değerlendirme anketi de müşteriye ait: uzman kendi işini puanlamaz.
  assert.match(
    store,
    /b\.benimRolum !== 'uzman' &&\s*\n\s*b\.status === 'tamamlandi'/,
    'anket uzmana da gidiyor',
  );
});

test('ROLÜ SUNUCU SÖYLÜYOR — uç etiketi yedek', () => {
  /*
   * Rol yalnız "hangi uçtan geldi" ile belirleniyordu. Etiket düşünce
   * randevu sessizce "müşteri" sayılıyor ve uzman KENDİ ekranında müşteri
   * görünümüne düşüyordu: başlıkta kendi adı, altında "randevu gününü
   * bekliyorsun".
   */
  assert.match(
    api('src', 'bookings', 'bookings.service.ts'),
    /benimRolum: opts\?\.forProvider \? \('uzman' as const\) : \('musteri' as const\)/,
    'sunucu rolü damgalamıyor',
  );
  assert.match(
    store,
    /benimRolum: b\.benimRolum \?\? 'musteri'/,
    'müşteri yolunda sunucu rolü yok sayılıyor',
  );
  assert.match(
    store,
    /benimRolum: b\.benimRolum \?\? 'uzman'/,
    'sağlayıcı yolunda sunucu rolü yok sayılıyor',
  );
});

test('UZMAN, MÜŞTERİSİNİN ADINI görüyor', () => {
  /*
   * `customerName` yalnız salonun elle açtığı çevrimdışı kayıtta doluydu;
   * uygulamadan gelen randevuda null kalıyor ve uzman "Müşteri" diye genel
   * bir etiket görüyordu — kimin geleceğini bilmiyordu.
   */
  const svc = api('src', 'bookings', 'bookings.service.ts');
  assert.match(
    svc,
    /customerName: b\.customerName \?\? opts\?\.customerName \?\? undefined/,
    'ad doldurulmuyor',
  );
  assert.match(svc, /const adOf = new Map\(adlar\.map/, 'adlar okunmuyor');
  // TEK sorgu: randevu başına sorgu (N+1) listeyi uzman büyüdükçe yavaşlatır.
  assert.match(svc, /where: \{ id: \{ in: uids \} \}/, 'adlar tek sorguda alınmıyor');
});

test('YÖNETİCİ ONAYI uygulamaya YANSIYOR', () => {
  /*
   * Kurucu: "admin panelinden müşteri telefon doğrulaması yapıldığı halde
   * bu müşteri hesabında gösterilmiyor, randevu alamıyor."
   *
   * Kapı "telefon doğrulandı YA DA yönetici onayladı" diyor; `phoneVerified`
   * tazeleniyordu ama `adminApproved` GİRİŞTEKİ kopyada kalıyordu.
   */
  assert.match(store, /adminApproved: me\.adminApproved,/, 'yönetici onayı tazelenmiyor');
  assert.match(
    api('src', 'auth', 'auth.service.ts'),
    /adminApproved: user\.adminApproved,/,
    'sunucu dönmüyor',
  );

  // Profildeki "telefonunu doğrula" kartı randevu kapısıyla AYNI kuralda.
  const profil = oku('app', '(tabs)', 'profile.tsx');
  assert.match(
    profil,
    /randevuVerebilir\(s\.currentUser \?\? \{\}\)/,
    'profil kendi kuralını yazıyor',
  );
  assert.match(profil, /isLoggedIn && !dogrulanmisSayilir \?/, 'kart onaylıda da duruyor');
});

test('YAZI PUNTO KÜÇÜLTMÜYOR — hiçbir ekranda', () => {
  /*
   * Kurucu: "buton üzerindeki yazı çıkmıyor… aynı problem hizmet eklerken
   * ilk seçenekteki ekle butonunda da vardı" ve "hizmetler başlığı
   * küçülmüş".
   *
   * `adjustsFontSizeToFit`, React Native'de ölçü genişliği belirsiz olduğunda
   * puntoyu `minimumFontScale`i de aşarak indiriyor: yazı birkaç piksellik
   * bir lekeye dönüyor. Sığmayan yazı artık kırpılıyor — kırpılmış yazı
   * okunur, küçülmüş yazı değil.
   */
  const gez = (d: string): string[] =>
    readdirSync(d).flatMap((ad) => {
      const tam = join(d, ad);
      return statSync(tam).isDirectory() ? gez(tam) : tam.endsWith('.tsx') ? [tam] : [];
    });
  const kok = join(__dirname, '..');
  // Yorumlar ayıklanıyor: bu kararın NEDENİ iki bileşenin başında yazılı ve
  // metnin kendisi taramaya takılmamalı.
  const yorumsuz = (x: string) =>
    x.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
  const suclu = [...gez(join(kok, 'app')), ...gez(join(kok, 'src'))].filter((f) =>
    /adjustsFontSizeToFit/.test(yorumsuz(readFileSync(f, 'utf8'))),
  );
  assert.deepEqual(suclu, [], `punto küçülten ekran(lar):\n  ${suclu.join('\n  ')}`);
});

test('PORTRENİN ALTINDAKİ ÇİZGİ kalktı — iki panelde de', () => {
  // Kurucu: "profil fotosunun altındaki çizgiyi kaldır ve biraz daha sola al."
  for (const yol of [
    ['app', 'seller', 'reports.tsx'],
    ['app', '(tabs)', 'discover.tsx'],
  ]) {
    const k = oku(...yol);
    assert.doesNotMatch(k, /portreCizgi/, `${yol.join('/')}: çizgi duruyor`);
    assert.match(k, /portreKap: \{[^}]*marginRight: 12/, `${yol.join('/')}: portre sola alınmamış`);
  }
  /*
   * Portre ALTA YASLI kalıyor: metin dikeyde ortalanırken portre de
   * ortalansaydı altındaki blokla yapışıklığı bozulurdu.
   */
  const uzman = oku('app', 'seller', 'reports.tsx');
  assert.match(uzman, /alignItems: 'stretch'/, 'metin bloğu ortalanamıyor');
  assert.match(uzman, /portreKap: \{[^}]*alignSelf: 'flex-end'/, 'portre alta yaslı değil');
  assert.match(uzman, /basSol: \{[^}]*justifyContent: 'center'/, 'karşılama ortalanmamış');
});
