import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { CutoutService } from './cutout.service';

/**
 * CUT-OUT UCU PARA HARCIYOR — KAPISI OLMALI.
 *
 * Her çağrı remove.bg'de ücretli. Uç kimlik doğrulaması istiyordu ama
 * başka hiçbir sınırı yoktu: giriş yapan HERHANGİ biri döngüye sokup
 * faturayı şişirebilirdi. Üyelik kontrolü yalnız UYGULAMADAYDI —
 * istemcideki kontrol kapı değildir, uygulama kodu kullanıcının elinde.
 */

function ortam(
  kullanici: { role: string; isPremium: boolean; membershipTier: string } | null,
  gunluk = 0,
) {
  const izler = { kayit: 0 };
  const prisma = {
    user: { findUnique: () => Promise.resolve(kullanici) },
    auditLog: { count: () => Promise.resolve(gunluk) },
    setting: { findUnique: () => Promise.resolve({ strValue: 'anahtar' }) },
  };
  const audit = {
    record: () => {
      izler.kayit += 1;
      return Promise.resolve();
    },
  };
  return { svc: new CutoutService(prisma as never, audit as never), izler };
}

const MUSTERI = { role: 'user', isPremium: false, membershipTier: 'free' };
const PREMIUM = { role: 'user', isPremium: false, membershipTier: 'premium' };
const UZMAN = { role: 'professional', isPremium: false, membershipTier: 'free' };

test('ÜCRETSİZ müşteri ucu ÇALIŞTIRAMIYOR', async () => {
  const { svc } = ortam(MUSTERI);
  await assert.rejects(
    () => svc.cutout('u1', { imageB64: 'x' }),
    (e: { getStatus?: () => number; response?: { code?: string } }) => {
      assert.equal(e.getStatus?.(), 403);
      assert.equal(e.response?.code, 'PREMIUM_REQUIRED');
      return true;
    },
  );
});

test('UZMAN ve PREMIUM geçebiliyor — kural uygulamadakiyle aynı', async () => {
  /*
   * Uygulamadaki kural: satıcı (uzman/salon) ya da ücretli üye. Sunucu
   * daha dar olsaydı, uygulamada açık görünen bir özellik sunucuda
   * kapanır ve kullanıcı sebebini anlamazdı.
   */
  for (const u of [UZMAN, PREMIUM]) {
    const { svc } = ortam(u);
    // Ağa çıkmıyor: `fetch` yok sayıldığı için hata TÜRÜ farklı olacak —
    // önemli olan PREMIUM_REQUIRED ile durdurulmaması.
    const hata = await svc.cutout('u1', { imageB64: 'x' }).catch((e: unknown) => e);
    const kod = (hata as { response?: { code?: string } } | undefined)?.response?.code;
    assert.notEqual(kod, 'PREMIUM_REQUIRED', 'hakkı olan kullanıcı kapıda durduruldu');
  }
});

test('GÜNLÜK TAVAN — hak dolunca remove.bg HİÇ çağrılmıyor', async () => {
  const { svc, izler } = ortam(PREMIUM, 20);
  await assert.rejects(
    () => svc.cutout('u1', { imageB64: 'x' }),
    (e: { getStatus?: () => number; response?: { code?: string } }) => {
      assert.equal(e.getStatus?.(), 429);
      assert.equal(e.response?.code, 'CUTOUT_DAILY_LIMIT');
      return true;
    },
  );
  assert.equal(izler.kayit, 0, 'tavana rağmen hak düşüldü');
});

test('HAK yalnız BAŞARILI çağrıda düşüyor', () => {
  /*
   * Kayıt `fetch` başarılı döndükten SONRA yazılıyor: remove.bg'nin
   * arızası kullanıcının hakkını yememeli.
   */
  const kaynak = readFileSync(new URL('./cutout.service.ts', import.meta.url).pathname, 'utf8');
  const i = kaynak.indexOf('if (!res.ok)');
  // `action: 'cutout.run'` iki kez geçiyor (sayaç sorgusu + kayıt); KAYIT arananı.
  const j = kaynak.indexOf('this.audit.record(');
  assert.ok(i > 0 && j > i, 'hak, sonuç bilinmeden düşülüyor');
});
