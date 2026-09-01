import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * BİLDİRİM HATALARI — kurucunun bildirdiği dört şikâyet, tek kök neden ailesi.
 *
 *   1. "sürekli kendi başına bildirimler geliyor"
 *   2. "aynı bildirimler bir daha bir daha çıkıyor"
 *   3. "alakasız uydurma bildirimler oluyor"
 *   4. "uygulama kapalıyken gelmiyor, ancak uygulamaya girilince görünüyor"
 *
 * 1–3 aynı şeyden çıkıyordu: bildirimlerin ve "bunu zaten yaptık" kayıtlarının
 * HİÇBİRİ kalıcı değildi, üstelik hatırlatma bayrakları her sunucu tazelemesinde
 * siliniyordu. Her açılışta her şey sıfırdan üretiliyor, eski duyurular yeniden
 * OKUNMAMIŞ olarak listeye giriyordu.
 *
 * 4 ayrıydı: bildirim izni YALNIZ talep yayınlama ekranında isteniyordu. Hiç
 * talep açmayan kullanıcıdan izin hiç istenmiyordu — ne işletim sistemine
 * planlanan yerel hatırlatma ne de uzak push düşebiliyordu.
 */

const mobil = join(import.meta.dirname, '..');
const oku = (...p: string[]) => readFileSync(join(mobil, ...p), 'utf8');
const kodu = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*/g, '');

const store = kodu(oku('src', 'store.ts'));

test('1–2 · hatırlatma bayrakları sunucu tazelemesinde SİLİNMİYOR', () => {
  // `reminded24`/`reminded2` yalnız istemcide var; sunucu bilmiyor. Sunucu
  // nesnesi olduğu gibi yazılınca bayrak siliniyor ve `checkReminders` aynı
  // hatırlatmayı uygulama her açıldığında yeniden üretiyordu.
  const m = /hydrateBookings: async \(\) => \{[\s\S]*?\n {6}\},/.exec(store);
  assert.ok(m, 'hydrateBookings yok');
  const govde = m[0];
  assert.match(govde, /const yerel = new Map\(s\.bookings\.map/, 'yerel kayıtlar okunmuyor');
  for (const alan of ['reminded24', 'reminded2']) {
    assert.match(
      govde,
      new RegExp(`y\\.${alan} !== undefined \\? \\{ ${alan}: y\\.${alan} \\}`),
      `${alan} korunmuyor`,
    );
  }
  // Sunucu nesnesini DÜZ yazan eski satır geri gelmemeli.
  assert.doesNotMatch(
    govde,
    /bookings: \[\.\.\.remote, \.\.\.s\.bookings\.filter/,
    'sunucu nesnesi düz yazılıyor — bayraklar yine silinir',
  );
});

test('2–3 · bildirim listesi ve dedup kayıtları KALICI', () => {
  // Kalıcı olmayınca: duyuru dedup'ı (`have` kümesi) her açılışta boş başlıyor
  // ve TÜM duyurular yeniden okunmamış olarak ekleniyordu; anket bildirimi de
  // her açılışta tekrar üretiliyordu.
  const m = /partialize: \(s\) => \(\{[\s\S]*?\n {6}\}\),/.exec(store);
  assert.ok(m, 'partialize yok');
  for (const alan of ['notifications', 'surveyAskedIds']) {
    assert.match(m[0], new RegExp(`^\\s+${alan}: s\\.${alan},`, 'm'), `${alan} persist edilmiyor`);
  }
});

test('2–3 · girişli açılış sıfırlaması bildirimleri EZMİYOR', () => {
  // SEEDED_PERSONAL_RESET içinde `notifications: []` var ve girişli HER açılışta
  // uygulanıyor. Yalnız partialize'a eklemek yetmez; burada geri konmazsa
  // kalıcılık hiçbir işe yaramaz.
  // Blok SÜTUN 0'da açılıp kapanıyor; 2 boşlukla kapanış aramak, içerideki
  // rastgele bir bloğa denk gelip yanlış parça yakalıyordu.
  const m = /onFinishHydration\(\(state\) => \{[\s\S]*?\n\}\);/.exec(store);
  assert.ok(m, 'onFinishHydration yok');
  const govde = m[0];
  assert.match(
    govde,
    /\.\.\.SEEDED_PERSONAL_RESET,/,
    'sıfırlama kalıbı değişmiş — testi gözden geçir',
  );
  for (const alan of ['notifications', 'surveyAskedIds']) {
    assert.match(govde, new RegExp(`${alan}: state\\.${alan},`), `${alan} sıfırlamada eziliyor`);
  }
});

test('4 · bildirim izni randevu kurulduğunda isteniyor', () => {
  // `registerForRemotePush` izni SORMUYOR (bilerek: girişte diyalog açmasın).
  // Soran tek yol `bildirimIzniIste` ve o yalnız talep ekranındaydı.
  const n = kodu(oku('src', 'notifications.ts'));
  assert.match(n, /async function ensurePermission\(sor = false\)/, 'izin yardımcısı değişmiş');
  const reg = /export async function registerForRemotePush[\s\S]*?\n\}/.exec(n);
  assert.ok(reg, 'registerForRemotePush yok');
  assert.match(reg[0], /ensurePermission\(\)/, 'kayıt izni sormamalı (diyalog açar)');

  const takvim = kodu(oku('app', 'booking', 'schedule.tsx'));
  assert.match(
    takvim,
    /void bildirimIzniIste\(useStore\.getState\(\)\.token\);/,
    'randevuda izin istenmiyor',
  );

  // Talep yolu da durmalı — ikisi birden kapsanmalı.
  const talep = kodu(oku('app', 'demand', 'new.tsx'));
  assert.match(talep, /bildirimIzniIste\(/, 'talep yolundaki izin isteği kaybolmuş');
});

test('4 · yerel hatırlatmalar işletim sistemine planlanıyor', () => {
  // Uygulama KAPALIYKEN düşmelerinin tek yolu bu; in-app liste değil.
  const n = kodu(oku('src', 'notifications.ts'));
  // Asıl planlama çökme düzeltmesiyle `senkronEt`e taşındı; sıraya alma
  // sarmalayıcısı `syncBookingReminders` içinde kaldı.
  const m = /async function senkronEt[\s\S]*?\n\}/.exec(n);
  assert.ok(m, 'senkronEt yok');
  assert.match(m[0], /Notifications\.scheduleNotificationAsync\(/, 'OS planlaması yok');
  assert.match(m[0], /trigger: \{ type: 'date'/, 'tarih tetikleyicisi yok');
});

test('ÇÖKME · hatırlatma senkronu üst üste çalışamaz', () => {
  // TestFlight 0.0.0/build 3 çökmesi: EXC_BAD_ACCESS. JS iş parçacığı bir
  // promise devamındayken `com.meta.react.turbomodulemanager.queue` AYNI ANDA
  // Hermes'in içindeydi (convertNSExceptionToJSError). Bir native metot ObjC
  // istisnası fırlatmış ve RN onu JS hatasına çevirirken runtime'ı bozmuş.
  //
  // Tetikleyici: `_layout` bunu `bookings` her değiştiğinde çağırıyor ve onay
  // akışında liste arka arkaya iki kez değişiyor → iki tur üst üste biniyor,
  // ikisi de aynı `rem-*` kimliğini iptal etmeye çalışıyor.
  const n = kodu(oku('src', 'notifications.ts'));
  assert.match(n, /let senkronCalisiyor = false;/, 'eşzamanlılık bayrağı yok');
  assert.match(n, /let bekleyenSenkron/, 'bekleyen çağrı kuyruğu yok');

  const dis = /export async function syncBookingReminders[\s\S]*?\n\}/.exec(n);
  assert.ok(dis, 'syncBookingReminders yok');
  assert.match(dis[0], /if \(senkronCalisiyor\) \{/, 'çalışıyorken ikinci tur engellenmiyor');
  // Bayrak HER yoldan inmeli; yoksa ilk hatadan sonra hatırlatmalar hiç kurulmaz.
  assert.match(dis[0], /\} finally \{\s*\n\s*senkronCalisiyor = false;/, 'finally yok');
  // En SON liste kazanmalı: eski bookings ile tekrar çalışmak yanlış planlar kurar.
  assert.match(dis[0], /arg = bekleyenSenkron;/, 'son çağrının listesi kullanılmıyor');

  // Asıl iş ayrı fonksiyonda ve native çağrıların HER BİRİ kendi try/catch'inde.
  const ic = /async function senkronEt[\s\S]*?\n\}/.exec(n);
  assert.ok(ic, 'senkronEt yok');
  assert.match(
    ic[0],
    /try \{\s*\n\s*await Notifications\.scheduleNotificationAsync/,
    'planlama izole değil',
  );
  assert.match(
    ic[0],
    /try \{\s*\n\s*await Notifications\.cancelScheduledNotificationAsync/,
    'iptal izole değil',
  );
});

test('ÇÖKME · bookings değişimine bağlı TEK native tetikleyici var', () => {
  // Başka bir efekt de bookings'e bağlanırsa aynı yarış yeniden doğar.
  const layout = kodu(oku('app', '_layout.tsx'));
  const bagimli = [...layout.matchAll(/\}, \[[^\]]*\bbookings\b[^\]]*\]\);/g)];
  assert.equal(
    bagimli.length,
    1,
    `bookings'e bağlı ${bagimli.length} efekt var — her biri native çağrı yapıyorsa yarış geri gelir`,
  );
});
