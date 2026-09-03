import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loadEnv } from '@ayna/config/env';
import { AdminBootstrapService } from './admin-bootstrap.service';
import { hashPassword } from '../common/crypto';

/**
 * YÖNETİCİ ŞİFRE KURTARMA.
 *
 * Kurucu panele giremedi. Şifre kimsede yok (ben de hiç görmedim) ve tek
 * kurtarma yolu `ADMIN_BOOTSTRAP_PASSWORD` ortam değişkeni.
 *
 * ── BURADA BİR TUZAK VARDI ──────────────────────────────────────────────
 *
 * Uzunluk kuralı (`min(12)`) ŞEMADAYDI: kısa bir şifre yazmak `loadEnv`i
 * düşürüyor, yani API HİÇ AÇILMIYORDU. Bu, Mobizon anahtarında yaşanan
 * kesintinin birebir aynısı — üstelik daha kötüsü: kurucu ZATEN panele
 * giremediği için buraya geliyor ve bir yazım hatası tüm pazar yerini
 * kapatabilirdi.
 *
 * Kural duruyor (zayıf yönetici şifresi ciddi risk) ama bedelini yalnız
 * sıfırlama ödüyor.
 */

const TABAN = {
  DATABASE_URL: 'postgresql://x/y',
  JWT_ACCESS_SECRET: 'a'.repeat(32),
  JWT_REFRESH_SECRET: 'r'.repeat(32),
  FIELD_ENCRYPTION_KEY: 'k'.repeat(64),
};

function servis(sifre: string | undefined, mevcut: unknown = null) {
  const izler = { update: 0, create: 0 };
  const prisma = {
    user: {
      findUnique: () => Promise.resolve(mevcut),
      update: () => {
        izler.update += 1;
        return Promise.resolve({ id: 'u1' });
      },
      create: () => {
        izler.create += 1;
        return Promise.resolve({ id: 'u1' });
      },
    },
    auditLog: { create: () => Promise.resolve({}) },
  };
  const env = { ...(sifre === undefined ? {} : { ADMIN_BOOTSTRAP_PASSWORD: sifre }) };
  return { svc: new AdminBootstrapService(prisma as never, env as never), izler };
}

test('KISA şifre ortamı reddettirmiyor — API açılabiliyor', () => {
  /*
   * Şemada kalsaydı bu satır fırlatırdı ve API hiç açılmazdı. Kurucu
   * panele giremezken bir de uygulamayı kapatmak kabul edilemez.
   */
  const env = loadEnv({ ...TABAN, ADMIN_BOOTSTRAP_PASSWORD: 'kisa' });
  assert.equal(env.ADMIN_BOOTSTRAP_PASSWORD, 'kisa');
});

test('kısa şifreyle sıfırlama YAPILMIYOR', async () => {
  // Kural duruyor: zayıf yönetici şifresi tüm paneli açar.
  const { svc, izler } = servis('kisa');
  await svc.onModuleInit();
  assert.equal(izler.create, 0, 'kısa şifreyle hesap açıldı');
  assert.equal(izler.update, 0, 'kısa şifreyle şifre değişti');
});

test('tam 11 karakter yetmiyor, 12 yetiyor', async () => {
  const a = servis('a'.repeat(11));
  await a.svc.onModuleInit();
  assert.equal(a.izler.create, 0, '11 karakter kabul edildi');

  const b = servis('b'.repeat(12));
  await b.svc.onModuleInit();
  assert.equal(b.izler.create, 1, '12 karakter reddedildi');
});

test('değişken yoksa hiçbir şey yapmıyor', async () => {
  // Değişken silindikten sonra her dağıtımda şifreyi geri almamalı.
  const { svc, izler } = servis(undefined);
  await svc.onModuleInit();
  assert.deepEqual(izler, { update: 0, create: 0 });
});

test('mevcut hesabın şifresi sıfırlanıyor ve hesap AKTİFLEŞİYOR', async () => {
  /*
   * Hesap askıya alınmış ya da rolü düşmüşse kurtarma işe yaramazdı;
   * sıfırlama aynı anda `status` ve `role` alanlarını da düzeltiyor.
   */
  const { svc, izler } = servis('c'.repeat(12), {
    id: 'u1',
    passwordHash: hashPassword('baska-sifre'),
    status: 'suspended',
    role: 'user',
  });
  await svc.onModuleInit();
  assert.equal(izler.update, 1, 'mevcut hesap sıfırlanmadı');
});

test('şifre ZATEN aynıysa boşuna yazılmıyor', async () => {
  // Her açılışta hash'i yeniden yazmak denetim kaydını gürültüye boğardı.
  const ayni = 'd'.repeat(12);
  const { svc, izler } = servis(ayni, {
    id: 'u1',
    passwordHash: hashPassword(ayni),
    status: 'active',
    role: 'admin',
  });
  await svc.onModuleInit();
  assert.equal(izler.update, 0);
});
