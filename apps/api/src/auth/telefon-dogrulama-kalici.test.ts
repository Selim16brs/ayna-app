import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * DOĞRULAMA KALICI MI?
 *
 * Kurucu: "telefon doğrulama işlemini başarılı bir şekilde yapmış bir
 * kullanıcının ekranında herhangi bir telefon doğrula alanı çıkmaması
 * lazım."
 *
 * ── NEDEN ÇIKIYORDU ────────────────────────────────────────────────────
 *
 * Canlıda 97 kullanıcının 96'sı sunucuda "doğrulanmamış" görünüyordu —
 * oysa hepsi kayıt olurken doğrulama ekranından geçmişti. İki kopuk halka:
 *
 *   1. KAYIT SIRASI. Kullanıcı önce numarasını doğruluyor, SONRA hesap
 *      açılıyor. Doğrulama anında hesap yok, `verifyOtp`in `updateMany`i
 *      hiçbir satırı bulamıyor ve doğrulama kayboluyordu.
 *   2. EKRAN. `otpVerify` iki alan döndürüyor — `verified` (kod doğruydu)
 *      ve `phoneVerified` (sunucu hesaba yazdı). Ekran BİRİNCİSİNE bakıp
 *      kendini doğrulanmış işaretliyordu; sunucu bunu hiç öğrenmiyordu.
 *
 * Sonuç aynı: kullanıcı doğruluyor, şerit bir sonraki açılışta geri
 * geliyordu.
 */

const kok = join(import.meta.dirname, '..', '..');
const yorumsuz = (k: string) =>
  k
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*'))
    .join('\n');

const auth = readFileSync(join(kok, 'src/auth/auth.service.ts'), 'utf8');
const ekran = yorumsuz(
  readFileSync(join(kok, '..', 'mobile', 'app', 'auth', 'verify.tsx'), 'utf8'),
);

test('kayıt, öncesinde yapılan doğrulamayı DEVRALIYOR', () => {
  const i = auth.indexOf('async register');
  const govde = auth.slice(i, auth.indexOf('const user = await this.prisma.user.create', i) + 900);
  assert.match(govde, /consumedAt: \{ gt:/, 'tüketilmiş kod aranmıyor');
  assert.match(govde, /dogrulanmis \? \{ phoneVerified: true \}/, 'doğrulama devralınmıyor');
});

test('devralma SÜRESİZ değil', () => {
  /*
   * Aylar önceki bir doğrulamayı bugünkü kayda saymak, kanıtı olmayan bir
   * şeyi kanıtlı göstermek olurdu — numara o arada el değiştirmiş olabilir.
   */
  assert.match(auth, /KAYIT_DOGRULAMA_PENCERESI_SEC = \d+/, 'zaman sınırı yok');
});

test('ekran SUNUCU YAZDIYSA doğrulanmış sayıyor', () => {
  assert.match(ekran, /res\.phoneVerified/, 'sunucunun yazdığına bakılmıyor');
  // Sadece `res.verified`e bakmak eski hatanın ta kendisiydi.
  assert.equal(
    /if \(res\.verified\) proceed\(\)/.test(ekran),
    false,
    'yalnız kod doğruluğuna bakılıyor — doğrulama kalıcı olmaz',
  );
});

test('servis erişilemezken doğrulama UYDURULMUYOR', () => {
  /*
   * `code === devCode` ile devam ediliyordu: sunucu bunu hiç öğrenmediği
   * için doğrulama bir sonraki açılışta kayboluyor, şerit geri geliyordu.
   */
  const i = ekran.indexOf('const confirm');
  const govde = ekran.slice(i, ekran.indexOf('};', i));
  assert.equal(/code === devCode/.test(govde), false, 'çevrimdışıyken doğrulama uyduruluyor');
});

test('doğrulanmış SAYILAN kullanıcıya şerit ÇIKMIYOR', () => {
  /*
   * Zincirin son halkası: koşul yalnız doğrulanmamışlar için.
   *
   * 4 Eyl 2026 — koşul `!phoneVerified` idi ve YÖNETİCİ ONAYINI yok
   * sayıyordu: randevu kapısı açık olduğu hâlde profilde "telefonunu
   * doğrula" kartı duruyor, kullanıcı neyi yanlış yaptığını anlamıyordu.
   * Kural artık randevu kapısıyla AYNI kaynaktan (`randevuVerebilir`).
   */
  const profil = readFileSync(join(kok, '..', 'mobile', 'app', '(tabs)', 'profile.tsx'), 'utf8');
  assert.match(profil, /isLoggedIn && !dogrulanmisSayilir \?/, 'şerit koşulu eski kuralda');
  assert.match(
    profil,
    /randevuVerebilir\(s\.currentUser \?\? \{\}\)/,
    'şerit kendi kuralını yazıyor — kapıyla ayrışır',
  );
});
