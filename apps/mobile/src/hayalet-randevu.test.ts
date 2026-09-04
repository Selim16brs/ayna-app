import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

/**
 * HAYALET RANDEVU YOK.
 *
 * Kurucu: "sistem hiçbir şekilde randevu … kendiliğinden uydurmamalı."
 *
 * Randevu önce YERELE yazılıyor (iyimser), sonra sunucuya. Sunucu kalıcı
 * olarak reddederse — telefon doğrulanmamış, saat dolu, uzman yok — kayıt
 * müşterinin listesinde SANKİ VARMIŞ gibi duruyordu; uzman ise hiç
 * görmüyordu. Kuyruk da onu sonsuza kadar yeniden deniyordu.
 */

const oku = (...p: string[]) => readFileSync(join(__dirname, '..', ...p), 'utf8');
const store = oku('src', 'store.ts');

test('KALICI RED kuyrukta bırakılmıyor — tek kural', () => {
  /*
   * Eskiden yalnız iki kod (SLOT_CONFLICT, CALENDAR_FORBIDDEN) düşürülüyordu.
   * `randevuEylemi` bu ayrımı zaten `kaliciRed` ile yapıyordu; yazma yolu
   * yapmıyordu. İkisi aynı kurala bağlandı.
   */
  const i = store.indexOf('flushBookingSync: async () => {');
  assert.ok(i > 0, 'boşaltma yok');
  const govde = store.slice(i, store.indexOf('dropLocalBooking:', i));
  assert.match(govde, /err instanceof ApiError && kaliciRed\(err\)/, 'kalıcı red ayrımı yok');
  assert.match(govde, /status: 'sync_conflict' as const/, 'kayıt işaretlenmiyor');
  /*
   * Kayıt SİLİNMİYOR: sessizce yok olan bir randevu, duran ama "olmadı"
   * diyenden beter.
   */
  assert.doesNotMatch(govde, /bookings: s\.bookings\.filter/, 'kayıt sessizce siliniyor');
});

test('KULLANICI SEBEBİNİ ÖĞRENİYOR — doğrulama ayrı yola götürüyor', () => {
  const i = store.indexOf('flushBookingSync: async () => {');
  const govde = store.slice(i, store.indexOf('dropLocalBooking:', i));
  assert.match(govde, /titleKey: cakisma/, 'tek tip mesaj');
  assert.match(govde, /'notif\.verify_required'/, 'doğrulama mesajı yok');
  assert.match(govde, /'notif\.booking_failed'/, 'genel red mesajı yok');
  // Doğrulama eksikse çözüm randevu ekranında değil.
  assert.match(govde, /route: dogrulama \? '\/auth\/verify'/, 'doğrulama ekranına götürmüyor');
});

test('KALICI RED HEMEN işleniyor — uygulama kapanıp açılmayı beklemiyor', () => {
  const i = store.indexOf('syncBooking: (booking) => {');
  assert.ok(i > 0, 'yazma yok');
  const govde = store.slice(i, store.indexOf('randevuEylemi:', i));
  assert.match(
    govde,
    /kaliciRed\(err\)\) void get\(\)\.flushBookingSync\(\)/,
    'kalıcı red açılışa erteleniyor',
  );
});

test('DOĞRULAMA KAPISI her iki randevu yolunda', () => {
  /*
   * Kapı yalnız mesajlaşmada duruyordu. Randevu ekranları iki tane:
   * uzman profili ve zaman seçme ekranı (kampanyadan/teklif sonucundan
   * doğrudan geliniyor).
   */
  /*
   * Kapı RANDEVU YAZAN fonksiyonun içinde aranıyor. Dosyada başka bir yerde
   * (mesajlaşmada) de duruyor; tüm dosyaya bakan bir test, randevu yolundan
   * kapı kalksa bile geçerdi.
   */
  for (const [yol, bas, son] of [
    [['app', 'professional', '[id].tsx'], 'const book = () => {', 'router.replace({'],
    [['app', 'booking', 'schedule.tsx'], 'function confirm() {', 'const id = addBooking({'],
  ] as [string[], string, string][]) {
    const k = oku(...yol);
    const i = k.indexOf(bas);
    const j = k.indexOf(son, i);
    assert.ok(i > 0 && j > i, `${yol.join('/')}: randevu fonksiyonu bulunamadı`);
    const govde = k.slice(i, j);
    assert.match(
      govde,
      /if \(!randevuVerebilir\(kullanici \?\? \{\}\)\)/,
      `${yol.join('/')}: kapı yok`,
    );
    assert.match(govde, /router\.push\('\/auth\/verify'\)/, `${yol.join('/')}: çözüme götürmüyor`);
  }
});
