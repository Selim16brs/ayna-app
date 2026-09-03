import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { AuthService } from '../auth/auth.service';

/**
 * OTP GÖNDERİMİ — "GÖNDERİLDİ" GERÇEĞİ ANLATIYOR MU?
 *
 * Kurucu: "sistem hiçbir şekilde randevu, değerlendirme, not, puanlama,
 * ayna para, bildirim ya da benzeri hiçbir şeyi kendiliğinden uydurmamalı.
 * her şey %100 doğru çalışmalı."
 *
 * SMS bu listenin en sert maddesi: gönderilmemiş bir koda "gönderildi"
 * demek, kullanıcıyı hiç gelmeyecek bir mesajı beklerken bırakır ve
 * kaydolmasını tamamen engeller. Bakiye bittiğinde tek belirti bu olurdu.
 */

const KEY = 'a'.repeat(64);

/** Sahte OTP kaydı; silinip silinmediği izleniyor. */
function ortam(gonderildi: boolean) {
  const izler = { silindi: [] as string[], olusturuldu: 0 };
  const prisma = {
    otpCode: {
      findFirst: () => Promise.resolve(null),
      updateMany: () => Promise.resolve({ count: 0 }),
      create: () => {
        izler.olusturuldu += 1;
        return Promise.resolve({ id: 'otp-1' });
      },
      delete: ({ where }: { where: { id: string } }) => {
        izler.silindi.push(where.id);
        return Promise.resolve({});
      },
    },
  };
  const sms = { kodGonder: () => Promise.resolve({ gonderildi, sebep: 'net yok' }) };
  const audit = { record: () => Promise.resolve({}) };
  const env = { FIELD_ENCRYPTION_KEY: KEY, SMS_PROVIDER: 'smsc', OTP_DEBUG_CODES: false };
  const svc = new AuthService(
    prisma as never,
    {} as never,
    audit as never,
    sms as never,
    env as never,
  );
  return { svc, izler };
}

test('SMS gerçekten gittiyse "gönderildi" deniyor', async () => {
  const { svc } = ortam(true);
  const r = await svc.requestOtp('+77771234567', 'ru');
  assert.equal(r.sent, true);
  assert.equal(r.expiresInSec > 0, true);
});

test('SMS GİTMEDİYSE "gönderildi" DENMİYOR — hata fırlatılıyor', async () => {
  const { svc } = ortam(false);
  await assert.rejects(
    () => svc.requestOtp('+77771234567', 'ru'),
    (e: { getStatus?: () => number; response?: { code?: string } }) => {
      // 502: hata BİZDE değil sağlayıcıda; kullanıcı tekrar deneyebilir.
      assert.equal(e.getStatus?.(), 502);
      assert.equal(e.response?.code, 'SMS_SEND_FAILED');
      return true;
    },
  );
});

test('gönderim düşünce OTP kaydı SİLİNİYOR', async () => {
  /*
   * İki sebep: (1) kimseye ulaşmamış kod veritabanında durmamalı,
   * (2) SOĞUMA SÜRESİ son kayda bakıyor — kayıt kalsaydı kullanıcı BİZİM
   * hatamız yüzünden 30 saniye kilitlenirdi.
   */
  const { svc, izler } = ortam(false);
  await svc.requestOtp('+77771234567', 'ru').catch(() => undefined);
  assert.deepEqual(izler.silindi, ['otp-1'], 'gitmemiş kod kayıtta kaldı');
});

test('başarılı gönderimde kayıt SİLİNMİYOR', async () => {
  const { svc, izler } = ortam(true);
  await svc.requestOtp('+77771234567', 'ru');
  assert.deepEqual(izler.silindi, [], 'geçerli kod silindi — doğrulama imkânsız olurdu');
});

test('üretimde devCode yanıta ASLA düşmüyor', async () => {
  // SMS_PROVIDER=smsc iken bayrak açık olsa bile kod dönmemeli: yanıttan
  // okunabilen kod, herhangi bir telefonun hesabını ele geçirmek demekti.
  const { svc } = ortam(true);
  const r = await svc.requestOtp('+77771234567', 'ru');
  assert.equal('devCode' in r, false);
});

/* ── İSTEMCİ TARAFI: EKRANLAR KOD UYDURMUYOR ──────────────────────────── */

const mobil = join(import.meta.dirname, '..', '..', '..', 'mobile', 'app', 'auth');
const yorumsuz = (k: string) =>
  k
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((l) => !l.trim().startsWith('//'))
    .join('\n');

test('giriş ekranları gönderim düşünce KOD UYDURMUYOR', () => {
  /*
   * Her iki ekran da servise erişemediğinde `setDevCode('000000')` yapıp
   * akışı yürütüyordu. Mock döneminde demo kolaylığıydı; gerçek SMS
   * bağlanınca kullanıcıya var olmayan bir kod göstermeye dönüştü.
   */
  for (const ad of ['verify.tsx', 'forgot.tsx']) {
    const kod = yorumsuz(readFileSync(join(mobil, ad), 'utf8'));
    assert.equal(/setDevCode\(\s*['"]\d+['"]\s*\)/.test(kod), false, `${ad}: uydurulan OTP kodu`);
  }
});

test('şifre sıfırlamada istemci KENDİ KENDİNİ doğrulamıyor', () => {
  // `code === devCode` ile adım atlamak doğrulama değil; hakem sunucu.
  const kod = yorumsuz(readFileSync(join(mobil, 'forgot.tsx'), 'utf8'));
  assert.equal(/code === devCode/.test(kod), false, 'istemci kendini doğruluyor');
});

test('şifre sıfırlama hatası "başarılı" diye gösterilmiyor', () => {
  /*
   * `save()` eskiden `catch {}` ile hatayı yutup her koşulda
   * `auth.forgot.success` diyordu. Sunucu reddetse bile kullanıcı
   * "şifren değişti" görüyor, sonra yeni şifresiyle giremiyordu.
   */
  const kod = yorumsuz(readFileSync(join(mobil, 'forgot.tsx'), 'utf8'));
  const i = kod.indexOf('api.resetPassword');
  assert.ok(i > 0, 'sıfırlama çağrısı bulunamadı');
  const catchIdx = kod.indexOf('} catch', i);
  const successIdx = kod.indexOf('auth.forgot.success', i);
  assert.ok(successIdx > 0, 'başarı mesajı yok');
  assert.ok(
    successIdx < catchIdx,
    'başarı mesajı catch/finally içinde — hata da "başarılı" görünür',
  );
});

/* ── DAĞITIM: TABLO CANLIDA GERÇEKTEN OLUŞUYOR MU ────────────────────── */

test('sms_log tablosu Railway dağıtımında GERÇEKTEN oluşuyor', () => {
  /*
   * Railway `prisma db push` çalıştırıyor, `migrate deploy` DEĞİL. Şemaya
   * model yazmak yetmez; pre-push dosyası olmadan tablo canlıda oluşmaz ve
   * her gönderim kaydı sessizce düşerdi.
   */
  const sql = readFileSync(
    join(import.meta.dirname, '..', '..', 'prisma', 'pre-push', '08-sms-kaydi.sql'),
    'utf8',
  );
  assert.match(sql, /CREATE TABLE IF NOT EXISTS "sms_log"/, 'tablo kurulmuyor');
  for (const sutun of ['phone_masked', 'provider', 'status', 'error_code', 'segments']) {
    assert.ok(sql.includes(`"${sutun}"`), `sütun eksik: ${sutun}`);
  }
  // Tam numara ASLA saklanmıyor — sütunu bile yok.
  assert.equal(/"phone"\s/.test(sql), false, 'tam numara sütunu var');
  assert.equal(/"message"|"text"|"body"/.test(sql), false, 'mesaj metni saklanıyor — OTP sızar');
});
