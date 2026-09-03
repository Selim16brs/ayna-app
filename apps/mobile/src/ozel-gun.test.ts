import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * ÖZEL GÜN — DÜZENLE, SİL, HATIRLAT.
 *
 * Kurucu: "doğum günü girildiğinde düzenleme ya da silme yok. ayrıca bu
 * girdilerde bildirim olacak mı?"
 *
 * ── ÜÇ AYRI EKSİK ───────────────────────────────────────────────────────
 *
 *  1. DÜZENLEME hiç yoktu — ne ekranda ne sunucuda. Yanlış tarih giren
 *     biri kaydı düzeltemiyordu.
 *  2. SİLME ucu sunucuda VARDI ama uygulama onu HİÇ ÇAĞIRMIYORDU. Yanlış
 *     bir doğum günü listede sonsuza kadar kalıyordu.
 *  3. BİLDİRİM yoktu — ve durum daha kötüydü: ayarlarda
 *     `notifPrefs.moment` diye açılıp kapanabilen bir anahtar vardı ama
 *     hiçbir şey bildirim üretmiyordu. Kullanıcıya hiç gelmeyecek bir
 *     bildirimin düğmesi gösteriliyordu.
 */

const kok = join(import.meta.dirname, '..');
const store = readFileSync(join(kok, 'src', 'store.ts'), 'utf8');
const form = readFileSync(join(kok, 'app', 'care', 'add.tsx'), 'utf8');
const liste = readFileSync(join(kok, 'app', '(tabs)', 'care.tsx'), 'utf8');

test('özel gün DÜZENLENEBİLİYOR', () => {
  assert.match(store, /updateMoment: \(id, input\) => \{/, 'mağazada güncelleme yok');
  assert.match(store, /api\s*\n?\s*\.updateCareMoment\(/, 'sunucuya yazılmıyor');
  // Aynı form hem ekliyor hem düzenliyor: ayrı ekran, zamanla ayrışırdı.
  assert.match(form, /if \(editId\) updateMoment\(editId, payload\);/, 'form düzenlemiyor');
});

test('özel gün SİLİNEBİLİYOR', () => {
  assert.match(store, /deleteMoment: \(id\) => \{/, 'mağazada silme yok');
  assert.match(store, /api\.deleteCareMoment\(token, id\)/, 'sunucu ucu çağrılmıyor');
  // Silme YALNIZ düzenlemede: yeni kayıtta silinecek bir şey yok.
  assert.match(form, /editId \? \(\s*\n?\s*<Pressable onPress=\{sil\}/, 'silme düğmesi yok');
});

test('listeden düzenleme ekranına YOL var', () => {
  /*
   * Günlük kayıtlar zaten karta dokununca açılıyordu; özel günlerde bu yol
   * hiç yoktu — kullanıcı düzenleme özelliğinin varlığını göremezdi.
   */
  assert.match(liste, /care\/add\?mode=moment&id=\$\{moment\.id\}/, 'satırdan düzenlemeye yol yok');
});

test('BİLDİRİM gerçekten üretiliyor', () => {
  assert.match(store, /notif\.moment\.title/, 'hatırlatma üretilmiyor');
  // Anahtar açık değilse üretilmemeli — düğme gerçekten bir şey yapmalı.
  assert.match(store, /if \(get\(\)\.notifPrefs\.moment\)/, 'ayar anahtarı dinlenmiyor');
});

test('aynı hatırlatma TEKRAR TEKRAR basılmıyor', () => {
  /*
   * Damga olmasaydı uygulama her açılışta aynı bildirimi yeniden basardı.
   * Damga GÜNÜ de içeriyor: yıl sonra tekrar eden bir doğum günü gelecek
   * sene yeniden hatırlatılabilsin.
   */
  /*
   * KORUMANIN KENDİSİ ölçülüyor. İlk yazımda test yalnız `momentNudged`
   * adını arıyordu ve kontrol satırı silinse bile geçiyordu — ad başka
   * yerlerde de duruyor.
   */
  assert.match(
    store,
    /if \(damgali\.includes\(anahtar\)\) continue;/,
    'aynı bildirim her açılışta yeniden basılıyor',
  );
  assert.match(store, /momentNudged: \[\.\.\.s\.momentNudged/, 'damga kaydedilmiyor');
  assert.match(store, /\$\{m\.id\}:\$\{esik\}:\$\{gunAnahtari\}/, 'damga günü içermiyor');
});

test('hatırlatma İKİ eşikte — bildirime boğmuyor', () => {
  // 7 gün kala (hazırlanmak için) ve o gün. Daha sıkı hatırlatmak özel günü
  // bildirim yığınına çevirirdi.
  assert.match(
    store,
    /m\.daysLeft === 0 \? 'gun' : m\.daysLeft === 7 \? 'hafta' : null/,
    'eşikler değişmiş',
  );
});
