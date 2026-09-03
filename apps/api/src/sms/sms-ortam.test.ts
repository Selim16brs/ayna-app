import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loadEnv } from '@ayna/config/env';

/**
 * SMS ORTAMI — EKSİK KİMLİKLE AÇILMA.
 *
 * Alternatifi sessiz felaketti: `SMS_PROVIDER=smsc` ama şifre boş → API
 * sorunsuz açılır, her OTP isteği içeride patlar, kullanıcı sebebini
 * bilmeden kaydolamaz. Açılışta durmak saatlerce kod göndermemekten iyidir.
 */

/** Şemayı geçmeye yeten en küçük ortam. */
const TABAN = {
  DATABASE_URL: 'postgresql://x/y',
  JWT_ACCESS_SECRET: 'a'.repeat(32),
  JWT_REFRESH_SECRET: 'r'.repeat(32),
  FIELD_ENCRYPTION_KEY: 'a'.repeat(64),
};

function taban(): Record<string, string | undefined> {
  // Şema zamanla değişebilir; eksik zorunlu alan varsa test SEBEBİ SÖYLESİN.
  try {
    loadEnv(TABAN);
  } catch (e) {
    assert.fail(`taban ortam artık yetmiyor, testi güncelle: ${(e as Error).message}`);
  }
  return { ...TABAN };
}

test('varsayılan sağlayıcı mock — kimlik istemiyor', () => {
  assert.equal(loadEnv(taban()).SMS_PROVIDER, 'mock');
});

test('smsc seçili ama şifre yoksa API AÇILMIYOR', () => {
  assert.throws(
    () => loadEnv({ ...taban(), SMS_PROVIDER: 'smsc', SMSC_LOGIN: 'ayna' }),
    /SMSC_PASSWORD/,
    'eksik şifreyle açılıyor — her OTP sessizce düşerdi',
  );
});

test('smsc seçili ama login yoksa API AÇILMIYOR', () => {
  assert.throws(
    () => loadEnv({ ...taban(), SMS_PROVIDER: 'smsc', SMSC_PASSWORD: 'x' }),
    /SMSC_LOGIN/,
  );
});

test('kimlik tamsa açılıyor; gönderen adı ZORUNLU DEĞİL', () => {
  /*
   * Gönderen adı operatör başına aylık ücretli ve SMSC panelinden
   * kaydediliyor. Zorunlu tutulsaydı kurucu, ad onaylanana kadar hiç SMS
   * gönderemezdi; SMSC ortak adıyla gönderim çalışıyor.
   */
  const env = loadEnv({
    ...taban(),
    SMS_PROVIDER: 'smsc',
    SMSC_LOGIN: 'ayna',
    SMSC_PASSWORD: 'gizli',
  });
  assert.equal(env.SMS_PROVIDER, 'smsc');
  assert.equal(env.SMSC_SENDER, undefined);
});

test('tanınmayan sağlayıcı adı reddediliyor', () => {
  // Yazım hatası ("smcs") sessizce mock'a düşseydi üretim SMS göndermezdi.
  assert.throws(() => loadEnv({ ...taban(), SMS_PROVIDER: 'smcs' }));
});
