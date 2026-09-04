import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

/**
 * AÇILAN EKRAN VERİYİ YENİDEN SORUYOR.
 *
 * Kurucu: "uzman teklifi onayladı ama müşteriye teklif düşmedi."
 *
 * Teklif sunucuya yazılmıştı; müşterinin listesi UYGULAMA AÇILIŞINDA bir kez
 * doldurulup bir daha hiç tazelenmiyordu. Sekmeye bakan müşteri eski hâli
 * görüyor ve "gelmedi" diyordu. Aynı sessizlik randevu durumları için de
 * geçerliydi: uzman onaylıyor, müşteri eski durumu görüyor.
 */

const oku = (...p: string[]) => readFileSync(join(__dirname, '..', ...p), 'utf8');

test('MÜŞTERİ sekmesi odaklandığında TAZELENİYOR', () => {
  const k = oku('app', '(tabs)', 'bookings.tsx');
  const i = k.indexOf('useFocusEffect(');
  assert.ok(i > 0, 'ekran odaklanınca hiçbir şey sormuyor');
  const govde = k.slice(i, i + 400);
  assert.match(govde, /hydrateBookings\(\)/, 'randevular tazelenmiyor');
  assert.match(govde, /hydrateDemands\(\)/, 'teklifler tazelenmiyor');
});

test('SALON TAKVİMİ de odaklandığında tazeleniyor', () => {
  const k = oku('app', 'salon', 'agenda.tsx');
  const i = k.indexOf('useFocusEffect(');
  assert.ok(i > 0, 'salon takvimi hiç tazelenmiyor');
  assert.match(k.slice(i, i + 300), /hydrateBookings\(\)/, 'randevular tazelenmiyor');
});

test('TEKLİF EKRANI zaten sürekli soruyordu — kural bozulmasın', () => {
  /*
   * Sorun bu ekranda değildi; asıl bakılan yer olan sekmede kimse
   * sormuyordu. Buradaki döngü kalksa aynı hata oradan geri gelir.
   */
  const k = oku('app', 'quote', 'results.tsx');
  assert.match(k, /setInterval\(\(\) => void hydrateDemands\(\), 15_000\)/, 'düzenli tazeleme yok');
  assert.match(k, /return \(\) => clearInterval\(timer\)/, 'sayaç temizlenmiyor');
});

test('UZMANIN gelen talepleri de tazeleniyor', () => {
  /*
   * Açık talep HAVUZU tazeleniyordu ama gelen RANDEVU TALEPLERİ değil:
   * onlar yerel randevu listesinden besleniyor ve o liste yalnız uygulama
   * açılışında doluyordu. Müşteri istek gönderiyor, uzman ekranı açıyor,
   * hiçbir şey görmüyor — sonra yanıt süresi doluyor ve randevu kimsenin
   * hatası olmadan kaybediliyordu.
   */
  for (const yol of [
    ['app', 'seller', 'requests.tsx'],
    ['app', 'seller', 'reports.tsx'],
  ]) {
    const k = oku(...yol);
    const i = k.indexOf('useFocusEffect(');
    assert.ok(i > 0, `${yol.join('/')}: odak tazelemesi yok`);
    /*
     * Çağrı ODAK GÖVDESİNİN İÇİNDE aranıyor. Dosyanın herhangi bir yerine
     * bakan bir test, ekran açılışındaki çağrı silinip yalnız zamanlayıcıda
     * kalsa bile geçerdi — ekranı açan uzman ilk 20 saniye boyunca eski
     * listeyi görürdü.
     */
    const sonu = ((): number => {
      const zamanlayici = k.indexOf('setInterval', i);
      const kapanis = k.indexOf('}, [', i);
      // Zamanlayıcı varsa ondan ÖNCESİ: açılıştaki çağrı orada olmalı.
      return zamanlayici > 0 && zamanlayici < kapanis ? zamanlayici : kapanis;
    })();
    const govde = k.slice(i, sonu);
    assert.match(govde, /void hydrateBookings\(\);/, `${yol.join('/')}: randevular tazelenmiyor`);
  }
});

test('MESAJ LİSTESİ odaklanınca tazeleniyor', () => {
  /*
   * `useEffect` yalnız ilk açılışta çalışıyordu: kullanıcı sohbete girip
   * geri döndüğünde ya da karşı taraf yazdığında liste eski kalıyordu.
   */
  const k = oku('app', 'messages', 'index.tsx');
  const i = k.indexOf('useFocusEffect(');
  assert.ok(i > 0, 'odak tazelemesi yok');
  assert.match(k.slice(i, i + 200), /void load\(\);/, 'liste yeniden okunmuyor');
});

test('RANDEVU DETAYI açılınca sunucudan tazeleniyor', () => {
  /*
   * Bu ekran yerel kopyayı çiziyor ve ÜZERİNDE EYLEM yapılıyor. Kopya
   * bayatsa iki şey birden bozuluyor: kullanıcı yanlış durumu görüyor
   * (uzman onayladı ama "yanıt bekleniyor" yazıyor) ve bastığı düğme
   * sunucuda geçersiz bir geçiş oluyor — anlamsız bir hata. Bildirimden
   * doğrudan buraya gelinebiliyor, yani listeden geçmek şart değil.
   */
  const k = oku('app', 'booking', '[id].tsx');
  const i = k.indexOf('useFocusEffect(');
  assert.ok(i > 0, 'detay ekranı hiç tazelenmiyor');
  assert.match(k.slice(i, i + 200), /void hydrateBookings\(\);/, 'randevu tazelenmiyor');
});

test('UZMAN YORUMLARI ve PAYLAŞIMLAR da odakta tazeleniyor', () => {
  /*
   * İkisi de `useEffect` ile yalnız ilk açılışta okunuyordu: müşteri
   * değerlendirme yazıyor, uzman ekranı açıyor ve yanıt hakkı olan yorumu
   * hiç görmüyordu.
   */
  for (const yol of [
    ['app', 'seller', 'reviews.tsx'],
    ['app', 'paylasimlar.tsx'],
  ]) {
    const k = oku(...yol);
    assert.match(k, /useFocusEffect\(/, `${yol.join('/')}: odak tazelemesi yok`);
    assert.doesNotMatch(
      k,
      /useEffect\(\(\) => \{\s*void (load|yukle)\(\);/,
      `${yol.join('/')}: eski yol duruyor`,
    );
  }
});
