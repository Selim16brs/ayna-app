import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * ALWAYS GERÇEKTEN ÇALIŞMALI.
 *
 * Özellik TAMAMEN kurguydu — "yerel kaldı" değil, HİÇ YOKTU:
 *   - `requestAlways` mağazada tanımlıydı ama hiçbir yerden çağrılmıyordu,
 *   - `alwaysBonds` boş başlıyordu ve `SEED_ALWAYS_BONDS` hiçbir yere
 *     aktarılmıyordu,
 *   - giriş düğmesinin metni yazılmıştı ama hiçbir ekranda çizilmiyordu,
 *   - toplu bildirim YEREL tek bir satır üretiyordu; hiçbir müşteriye
 *     ulaşmıyordu ama uzman "gönderdim" sanıyordu.
 *
 * Yani Always ekranı her kullanıcıda kalıcı olarak boştu ve Platinum'un
 * satılan ana özelliğinin başlangıç noktası yoktu.
 */

const mobil = join(import.meta.dirname, '..');
const api = join(mobil, '..', 'api');
const store = readFileSync(join(mobil, 'src/store.ts'), 'utf8');
const apiSrc = readFileSync(join(mobil, 'src/api.ts'), 'utf8');
const svc = readFileSync(join(api, 'src/always/always.service.ts'), 'utf8');
const ctrl = readFileSync(join(api, 'src/always/always.controller.ts'), 'utf8');
const sema = readFileSync(join(api, 'prisma/schema.prisma'), 'utf8');

test('uçlar giriş zorunlu ve kimlik oturumdan', () => {
  assert.match(ctrl, /@UseGuards\(JwtAuthGuard\)/, 'Always uçları korumasız');
  // Kimlik gövdeden alınırsa istemci başkası adına bağ kurar/kaldırır.
  const cagri = [...ctrl.matchAll(/this\.always\.\w+\(req\.user!\.id/g)].length;
  assert.ok(cagri >= 5, `${cagri} uç oturum kimliği kullanıyor, en az 5 olmalı`);
});

test('bağ KİMLİKLE saklanıyor, isimle değil', () => {
  // Yerel model yalnız `providerName`/`customerName` taşıyordu. Cihazlar
  // arası bir bağ isimle kurulamaz — iki isimdaş müşteri aynı bağı paylaşırdı.
  const m = /model AlwaysBond \{[\s\S]*?\n\}/.exec(sema);
  assert.ok(m, 'AlwaysBond modeli yok');
  assert.match(m[0], /customerUserId/, 'müşteri kimliği yok');
  assert.match(m[0], /proUserId/, 'uzman kimliği yok');
  // Aynı çift için ikinci bağ olmamalı: tekrar "Always ol" yeni satır açmasın.
  assert.match(m[0], /@@unique\(\[customerUserId, proId\]\)/, 'kopya bağ engellenmemiş');
});

test('karşı tarafın kimliği SUNUCUDA bulunuyor', () => {
  // İstemcinin gönderdiği kullanıcı kimliğine güvenmek, başkası adına bağ
  // kurdurmak olurdu. İstek yalnız `proId` taşıyor.
  const dto = readFileSync(join(api, 'src/always/always.dto.ts'), 'utf8');
  assert.doesNotMatch(dto, /proUserId|customerUserId/, 'istek gövdesi kullanıcı kimliği taşıyor');
  assert.match(svc, /private async sahip\(proId: string\)/, 'sahip çözümleme yok');
  assert.match(svc, /if \(proUserId === userId\)/, 'kendine bağ engellenmiyor');
});

test('kabul YALNIZ karşı tarafa ait', () => {
  // Aksi hâlde isteği başlatan kendi isteğini onaylar ve bağ tek taraflı kurulur.
  assert.match(svc, /const karsiTaraf =/, 'taraf kontrolü yok');
  assert.match(svc, /if \(karsiTaraf !== userId\)/, 'kabul eden taraf denetlenmiyor');
});

test('toplu bildirim Platinum kapısını SUNUCUDA geçiyor', () => {
  // İstemcideki `if (!platinum)` kapı değildir: uç doğrudan çağrılabilir.
  const m = /async broadcast\([\s\S]*?\n {2}\}/.exec(svc);
  assert.ok(m, 'broadcast yok');
  assert.match(m[0], /membershipTier !== 'platinum'/, 'kademe okunmuyor');
  assert.match(m[0], /PLATINUM_REQUIRED/, 'reddetme kodu yok');
  // Süresi dolmuş Platinum da geçmemeli.
  assert.match(m[0], /membershipUntil/, 'üyelik süresi kontrol edilmiyor');
  // Teslim gerçek olmalı: outbox'a yazan servis kullanılıyor.
  assert.match(m[0], /this\.push\.sendToUser\(/, 'bildirim gerçekten gönderilmiyor');
});

test('istek karşı tarafa BİLDİRİLİYOR', () => {
  // Eski kurguda bildirim yerel üretiliyordu; uzmanın cihazına hiç ulaşmıyordu.
  const m = /async request\([\s\S]*?\n {2}\}/.exec(svc);
  assert.ok(m, 'request yok');
  assert.match(m[0], /this\.push\.sendToUser\(proUserId/, 'uzman haberdar edilmiyor');
});

test('mağaza sunucuya yazıyor ve okuyor', () => {
  for (const f of [
    'alwaysBonds',
    'requestAlways',
    'acceptAlways',
    'removeAlways',
    'broadcastAlways',
  ]) {
    assert.match(apiSrc, new RegExp(`^\\s{2}${f}:`, 'm'), `api.${f} yok`);
  }
  assert.match(store, /hydrateAlways: async \(\) => \{/, 'okuma yok');
  const layout = readFileSync(join(mobil, 'app/_layout.tsx'), 'utf8');
  assert.match(layout, /void hydrateAlways\(\);/, 'açılışta çağrılmıyor');
  // Ret ve kaldırma aynı işlem olmalı — "reddedildi" durumu saklamak, karşı
  // tarafın göremediği sessiz bir kara liste tutmak olurdu.
  assert.match(
    store,
    /declineAlways: \(id\) => get\(\)\.removeAlways\(id\)/,
    'ret ayrı yol izliyor',
  );
});

test('GİRİŞ NOKTASI gerçekten çiziliyor', () => {
  // Bu testin var oluş sebebi: metin yazılmış, düğme hiç çizilmemişti.
  const profil = readFileSync(join(mobil, 'app/professional/[id].tsx'), 'utf8');
  assert.match(profil, /t\('always\.request_cta'\)/, '"Always ol" düğmesi yok');
  assert.match(profil, /requestAlways\(\{ proId: String\(id\) \}\)/, 'düğme bağ kurmuyor');
  // Uzman kendi profilinden kendine bağ kuramamalı.
  assert.match(profil, /!isSeller && !alwaysDurum/, 'satıcıya da gösteriliyor');
});

test('yayın 0 alıcıya gittiyse "gönderildi" DENMİYOR', () => {
  // Eski ekran her hâlükârda "ulaştı" diyordu, oysa hiçbir müşteriye gitmiyordu.
  const bc = readFileSync(join(mobil, 'app/always-broadcast.tsx'), 'utf8');
  assert.match(bc, /if \(n === 0\)/, 'sıfır alıcı durumu ele alınmıyor');
});

test('hesap silinince bağ İKİ taraftan da gidiyor', () => {
  const acc = readFileSync(join(api, 'src/auth/account-data.service.ts'), 'utf8');
  assert.match(
    acc,
    /alwaysBond[\s\S]{0,200}customerUserId: userId[\s\S]{0,60}proUserId: userId/,
    'silinen hesabın bağı karşı tarafta kalıyor',
  );
});
