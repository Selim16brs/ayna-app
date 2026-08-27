import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * MESAJ GELDİĞİNİ ANA EKRANDAN GÖREBİLMEK.
 *
 * Kurucunun şikâyeti: _"mesaj geldiğinde ana ekrandaki mesaj ikonunda belli
 * olmuyor; ancak mesaj ikonuna tıklarsak görebiliyoruz."_
 *
 * Zincir dört halkalı ve HERHANGİ biri kopunca hata SESSİZ olur — rozet
 * görünmez, hiçbir şey patlamaz, kimse fark etmez:
 *
 *   sunucu ucu → istemci fonksiyonu → mağaza alanı → ikondaki rozet
 *
 * Bu test dördünü de denetliyor.
 */

const mobil = join(import.meta.dirname, '..');
const apiSrc = readFileSync(join(mobil, 'src/api.ts'), 'utf8');
const store = readFileSync(join(mobil, 'src/store.ts'), 'utf8');
const kanca = readFileSync(join(mobil, 'src/use-unread-messages.ts'), 'utf8');
const sunucu = readFileSync(
  join(mobil, '..', 'api', 'src', 'messaging', 'messaging.controller.ts'),
  'utf8',
);
const servis = readFileSync(
  join(mobil, '..', 'api', 'src', 'messaging', 'messaging.service.ts'),
  'utf8',
);

test('sunucu ucu var ve kimlik istiyor', () => {
  assert.match(sunucu, /@Get\('unread-count'\)/, 'unread-count ucu yok');
  // Sayı kişiye özel: oturum sahibinin kimliğiyle sorulmalı, yoksa herkes
  // herkesin okunmamışını görür.
  assert.match(sunucu, /unreadCount\(req\.user!\.id\)/, 'sayaç oturum kimliğine bağlı değil');
});

test('sayım konuşma listesiyle aynı koşulu kullanıyor', () => {
  // İki yer ayrışırsa rozet, listedeki sayıların toplamını tutmaz — kullanıcı
  // "3" görür, açar, iki tane bulur.
  const m = /async unreadCount\([\s\S]*?\n {2}\}/.exec(servis);
  assert.ok(m, 'unreadCount servisi yok');
  for (const kosul of ['senderId: { not: meId }', "moderation: 'ok'", 'readAt: null']) {
    assert.ok(m[0].includes(kosul), `sayımda eksik koşul: ${kosul}`);
  }
  assert.ok(
    /conversation: \{ OR: \[\{ customerId: meId \}, \{ proUserId: meId \}\] \}/.test(m[0]),
    'sayım kullanıcının konuşmalarıyla sınırlanmamış — başkasının mesajını sayabilir',
  );
});

test('istemci fonksiyonu tanımlı', () => {
  assert.match(apiSrc, /^\s{2}unreadMessages:/m, 'api.unreadMessages yok');
  assert.ok(apiSrc.includes("'/messaging/unread-count'"), 'istemci yanlış uca gidiyor');
});

test('mağazada alan ve çıkışta sıfırlama var', () => {
  assert.match(store, /^\s+unreadMessages: number;$/m, 'mağazada unreadMessages alanı yok');
  assert.match(store, /setUnreadMessages: \(n\) =>/, 'setter uygulanmamış');
  // Çıkışta sıfırlanmazsa bir sonraki kullanıcı öncekinin rozetini görür.
  const kez = [...store.matchAll(/^\s+unreadMessages: 0,$/gm)].length;
  assert.ok(kez >= 2, `başlangıç + sıfırlama bekleniyordu, ${kez} yerde var`);
});

test('kanca ekrana her dönüşte yeniliyor', () => {
  // useEffect yetmez: sohbetten geri dönünce sayı düşmeli.
  assert.match(kanca, /useFocusEffect/, 'odak yerine tek seferlik etki kullanılmış');
  assert.match(kanca, /\.catch\(\(\) => undefined\)/, 'rozet hatası ana ekranı bozabilir');
});

test('rozet iki ana ekranda da ÇİZİLİYOR', () => {
  // Mesaj ikonu taşıyan ekranlar. Salon paneli listede yok: orada mesaj ikonu
  // hiç bulunmuyor (kurucu "uzman ve kullanıcı" demişti).
  for (const rel of ['app/(tabs)/discover.tsx', 'app/seller/reports.tsx']) {
    const src = readFileSync(join(mobil, rel), 'utf8');
    assert.ok(src.includes('useUnreadMessages()'), `${rel}: kanca çağrılmıyor`);
    const m = /<PressableScale[\s\S]*?router\.push\('\/messages'\)[\s\S]*?<\/PressableScale>/.exec(
      src,
    );
    assert.ok(m, `${rel}: mesaj ikonu bulunamadı`);
    assert.ok(m[0].includes('unreadMsg > 0'), `${rel}: mesaj ikonunda rozet yok`);
  }
});
