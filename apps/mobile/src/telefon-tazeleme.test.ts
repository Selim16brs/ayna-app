import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * ONAYDAN SONRA DOĞRULAMA EKRANI ÇIKIYOR MU?
 *
 * Kurucu: "kullanıcı telefon numarası değiştirmek isterse bunu admine
 * bildirecek, admin onayladıktan sonra telefon doğrulama ekranı yeniden
 * çıkacak ve kullanıcı admine onaylattığı telefon için doğrulama yapacak."
 *
 * ── ZİNCİRİN KOPTUĞU YER ───────────────────────────────────────────────
 *
 * Sunucu tarafı hazırdı: onayda numara değişiyor ve `phoneVerified` false
 * oluyor. Profil ekranında da `!phoneVerified` iken doğrulama şeridi
 * çıkıyor. Ama `refreshMembership` (açılışta çağrılan `/me`) bu İKİ ALANI
 * KOPYALAMIYORDU. Sonuç: uygulama eski numarayı ve "doğrulanmış"ı
 * göstermeye devam ediyor, şerit hiç çıkmıyor, çıksa bile ESKİ numaraya
 * kod gidiyordu.
 *
 * Bu dosya zincirin dört halkasını da kaynakta bağlı tutuyor.
 */

const kok = join(import.meta.dirname, '..');
const store = readFileSync(join(kok, 'src/store.ts'), 'utf8');
const profil = readFileSync(join(kok, 'app/(tabs)/profile.tsx'), 'utf8');

/** `refreshMembership` gövdesi. */
const tazeleme = (() => {
  const i = store.indexOf('refreshMembership: async');
  assert.ok(i > 0, 'refreshMembership bulunamadı');
  return store.slice(i, i + 4000);
})();

test('sunucudan gelen DOĞRULAMA DURUMU yerele yazılıyor', () => {
  assert.match(
    tazeleme,
    /phoneVerified: me\.phoneVerified/,
    'doğrulama durumu tazelenmiyor — onaydan sonra şerit hiç çıkmaz',
  );
});

test('sunucudan gelen YENİ NUMARA yerele yazılıyor', () => {
  assert.match(
    tazeleme,
    /me\.phone[\s\S]{0,40}phone: me\.phone/,
    'numara tazelenmiyor — doğrulama kodu ESKİ numaraya giderdi',
  );
});

test('BOŞ telefon mevcut numarayı EZMİYOR', () => {
  /*
   * Sunucu, şifreleme anahtarı döndüyse `phone: ''` dönebiliyor
   * (`safePhone`). Koşulsuz kopyalamak kullanıcının numarasını ekrandan
   * silerdi — ve doğrulama ekranı boş numarayla açılırdı.
   */
  assert.match(
    tazeleme,
    /\.\.\.\(me\.phone \? \{ phone: me\.phone \} : \{\}\)/,
    'boş telefon koşulsuz yazılıyor',
  );
});

test('doğrulanmamış numara için ekranda YOL var', () => {
  // Zincirin son halkası: şerit görünür ve doğrulama ekranına götürür.
  assert.match(profil, /!phoneVerified/, 'doğrulama şeridi koşulu yok');
  assert.match(profil, /auth\/verify/, 'doğrulama ekranına yol yok');
});
