import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * C — GERİ ÇAĞIRMA ve D — TERCİHLER.
 *
 * Geri çağırma da kurguydu:
 *   - `SELLER_PAST_CLIENTS` yani SEED verisi üzerinde dönüyordu,
 *   - bildirimi YEREL üretiyordu (uzmanın kendi cihazında görünüyor,
 *     müşteriye ulaşmıyordu),
 *   - yalnız uzman uygulamayı AÇTIĞINDA çalışıyordu; periyot o gün dolarsa
 *     hatırlatma hiç gitmiyordu,
 *   - uzmanın ekranı da uydurma isimler gösteriyordu (Zhanel S., Dana K.).
 *
 * Tercihler ise uygulama silinince varsayılana dönüyordu: kullanıcı
 * kapattığı bildirimi geri açılmış buluyordu.
 */

const mobil = join(import.meta.dirname, '..');
const api = join(mobil, '..', 'api');
const store = readFileSync(join(mobil, 'src/store.ts'), 'utf8');
const apiSrc = readFileSync(join(mobil, 'src/api.ts'), 'utf8');
const sched = readFileSync(join(api, 'src/reengage/reengage.scheduler.ts'), 'utf8');
const rsvc = readFileSync(join(api, 'src/reengage/reengage.service.ts'), 'utf8');
const psvc = readFileSync(join(api, 'src/prefs/prefs.service.ts'), 'utf8');
const sema = readFileSync(join(api, 'prisma/schema.prisma'), 'utf8');

test('gönderim SUNUCUDA, istemcide değil', () => {
  // İstemci döngüsü yalnız uzman uygulamayı açtığında çalışıyordu.
  assert.match(sched, /setInterval/, 'zamanlayıcı yok');
  assert.match(sched, /this\.push\.sendToUser\(b\.userId/, 'müşteriye gerçekten gönderilmiyor');
  // Eski istemci döngüsü kaldırılmış olmalı.
  assert.match(store, /runAutoReengage: \(\) => undefined/, 'istemci döngüsü duruyor');
  assert.match(store, /sendReengage: \(\) => undefined/, 'istemci gönderimi duruyor');
});

test('SEED verisi tamamen kaldırıldı', () => {
  // Uzman kendi müşterileri sanarak uydurma isimlere bakıyordu.
  const data = readFileSync(join(mobil, 'src/data.ts'), 'utf8');
  assert.doesNotMatch(data, /export const SELLER_PAST_CLIENTS/, 'sahte müşteri verisi duruyor');
  const ekran = readFileSync(join(mobil, 'app/seller/reengage.tsx'), 'utf8');
  assert.match(ekran, /api\s*\.\s*reengageUpcoming\(token\)/, 'ekran gerçek veriyi çekmiyor');
});

test('gösterilen liste ile gönderilen AYNI hesaptan', () => {
  // Ayrı hesaplansaydı uzman "şu 3 kişiye gidecek" görür, başkalarına giderdi.
  assert.match(rsvc, /export function kategoriKodu/, 'ortak kategori çözümü yok');
  assert.match(
    sched,
    /import \{ kategoriKodu \} from '\.\/reengage\.service'/,
    'zamanlayıcı kendi kopyasını kullanıyor',
  );
});

test('Premium kapısı ve tercih SUNUCUDA okunuyor', () => {
  assert.match(
    sched,
    /membershipTier === 'premium' \|\| .*membershipTier === 'platinum'/,
    'kademe okunmuyor',
  );
  assert.match(sched, /membershipUntil/, 'süresi dolmuş üyelik geçebiliyor');
  // KIYASLAMANIN VARLIĞI YETMEZ — kapı olarak KULLANILMALI. İlk sürümüm
  // yalnız kıyaslamayı arıyordu; `if (!odenmis) continue;` satırını silip
  // denediğimde test GEÇTİ. Yani ödemeyen uzmanın müşterisine bildirim
  // giderdi ve test bunu görmezdi.
  assert.match(
    sched,
    /if \(!odenmis\) continue;/,
    'Premium kıyaslanıyor ama kapı olarak kullanılmıyor',
  );
  assert.match(
    sched,
    /if \(!sahip \|\| kapali\.has\(sahip\)\) continue;/,
    'uzmanın kapattığı ayar atlanmıyor',
  );
});

test('iki kez gönderim engelleniyor', () => {
  // Zamanlayıcı saatte bir dönüyor; kayıt olmasa aynı gün defalarca giderdi.
  assert.match(sema, /model ReengageSent \{/, 'gönderildi kaydı yok');
  assert.match(sema, /@@unique\(\[bookingId, stage\]\)/, 'tekillik yok');
  // Yarışta P2002 yutulmalı: iki konteyner aynı anda dönerse çift gitmesin.
  assert.match(
    sched,
    /reengageSent\.create[\s\S]{0,120}\} catch \{\s*\n\s*continue;/,
    'yarış durumu ele alınmamış',
  );
});

test('N+1 açılmamış', () => {
  // Randevu başına sorgu, saatlik turu dakikalara çıkarırdı.
  const govde = /async tick\(\)[\s\S]*?\n {2}\}/.exec(sched)![0];
  const dongu = govde.slice(govde.indexOf('for (const b of bookings)'));
  assert.doesNotMatch(dongu, /findMany|findUnique/, 'döngü içinde sorgu var');
});

test('tercihler sunucuya yazılıyor ve okunuyor', () => {
  for (const f of ['prefs', 'savePrefs']) {
    assert.match(apiSrc, new RegExp(`^\\s{2}${f}:`, 'm'), `api.${f} yok`);
  }
  for (const eylem of [
    'setAutoReengage',
    'toggleNotifPref',
    'setDemandNotif',
    'setReviewAnonymous',
  ]) {
    const m = new RegExp(`${eylem}: \\([^)]*\\) => \\{[\\s\\S]*?\\n      \\},`).exec(store);
    assert.ok(m, `${eylem} bulunamadı`);
    // BOŞLUĞA DAYANIKLI: prettier `void api\n  .savePrefs(...)` diye sarıyor,
    // yani "api.savePrefs(" dizesi hiç geçmiyor. Bu oturumda aynı tuzağa bir
    // kez düşmüştüm — dar desen kodu doğruyken testi düşürüyor.
    assert.match(m[0], /api\s*\.\s*savePrefs\(/, `${eylem} sunucuya yazmıyor`);
  }
  assert.match(store, /hydratePrefs: async \(\) => \{/, 'okuma yok');
  const layout = readFileSync(join(mobil, 'app/_layout.tsx'), 'utf8');
  assert.match(layout, /void hydratePrefs\(\);/, 'açılışta çağrılmıyor');
});

test('tercih yaması BİRLEŞTİRİYOR, ezmiyor', () => {
  // İstemci tek anahtar değiştirdiğinde diğerlerini geri göndermek zorunda
  // kalmamalı; eski sürüm bir istemci bilmediği tercihleri silmemeli.
  assert.match(psvc, /\.\.\.this\.coz\(mevcut\?\.notifJson/, 'notif tercihleri eziliyor');
  assert.match(psvc, /\.\.\.this\.coz\(mevcut\?\.demandJson/, 'talep tercihleri eziliyor');
  // Bozuk JSON ekranı çökertmemeli.
  assert.match(psvc, /catch \{\s*\n\s*return \{\};/, 'bozuk JSON ele alınmıyor');
  // Satır yoksa varsayılan şemadakiyle AYNI olmalı.
  assert.match(psvc, /p\?\.autoReengage \?\? true/, 'varsayılan şemadan farklı');
});
