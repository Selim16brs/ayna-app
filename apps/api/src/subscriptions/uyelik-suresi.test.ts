import assert from 'node:assert/strict';
import { test } from 'node:test';
import { SubscriptionsService } from './subscriptions.service';

/**
 * ÜYELİK — ÖDENEN SÜRE KAYBOLMAZ, ÖDENMEYEN SÜRE VERİLMEZ.
 *
 * Üç ayrı hata bir aradaydı:
 *   1. Yenilemede bitiş `now + ay` diye SABİT yazılıyordu: süresi dolmadan
 *      yenileyen müşteri kalan günlerini kaybediyordu.
 *   2. `approve` durum kapısı yoktu: aktif bir talebi yeniden onaylamak
 *      ödeme alınmadan 30 gün daha yazıyordu.
 *   3. Yenileme sonrası ESKİ satır `active` + geçmiş `periodEnd` kalıyordu;
 *      zamanlayıcı onu bulup kullanıcıyı `free`ye düşürüyordu — yenileyen
 *      müşteri yeni ayının ortasında üyeliğini kaybediyordu.
 */

type Kayit = Record<string, unknown>;
const GUN = 24 * 60 * 60 * 1000;

function servis(abonelikler: Kayit[], kullanici: Kayit) {
  const prisma = {
    subscription: {
      findUnique: ({ where }: { where: { id: string } }) =>
        Promise.resolve(abonelikler.find((a) => a.id === where.id) ?? null),
      findFirst: ({ where }: { where: Kayit }) =>
        Promise.resolve(
          abonelikler.find((a) => {
            if (where.userId && a.userId !== where.userId) return false;
            if (where.status && a.status !== where.status) return false;
            const notId = (where.id as { not?: string } | undefined)?.not;
            if (notId && a.id === notId) return false;
            const pe = (where.periodEnd as { gte?: Date } | undefined)?.gte;
            if (pe && !(a.periodEnd instanceof Date && a.periodEnd >= pe)) return false;
            const rh = where.receiptHash;
            if (rh !== undefined && a.receiptHash !== rh) return false;
            return true;
          }) ?? null,
        ),
      findMany: ({ where }: { where: Kayit }) =>
        Promise.resolve(
          abonelikler.filter((a) => {
            if (where.status && a.status !== where.status) return false;
            const pe = (where.periodEnd as { lt?: Date } | undefined)?.lt;
            if (pe && !(a.periodEnd instanceof Date && a.periodEnd < pe)) return false;
            return true;
          }),
        ),
      update: ({ where, data }: { where: { id: string }; data: Kayit }) => {
        const a = abonelikler.find((x) => x.id === where.id)!;
        Object.assign(a, data);
        return Promise.resolve(a);
      },
      updateMany: ({ where, data }: { where: Kayit; data: Kayit }) => {
        const notId = (where.id as { not?: string } | undefined)?.not;
        for (const a of abonelikler) {
          if (where.userId && a.userId !== where.userId) continue;
          if (where.status && a.status !== where.status) continue;
          if (notId && a.id === notId) continue;
          Object.assign(a, data);
        }
        return Promise.resolve({ count: 0 });
      },
    },
    user: {
      findUnique: () => Promise.resolve({ ...kullanici }),
      update: ({ data }: { data: Kayit }) => {
        Object.assign(kullanici, data);
        return Promise.resolve(kullanici);
      },
    },
    auditLog: { create: () => Promise.resolve({}) },
    $transaction: (islemler: Promise<unknown>[]) => Promise.all(islemler),
  };
  const svc = new SubscriptionsService(
    prisma as never,
    { sendTemplate: () => Promise.resolve() } as never,
    { put: async (x: string) => x } as never,
  );
  return { svc, abonelikler, kullanici };
}

test('SÜRESİ DOLMADAN yenileyen müşteri kalan günlerini KAYBETMİYOR', async () => {
  const kalan = new Date(Date.now() + 10 * GUN);
  const { svc, kullanici } = servis(
    [{ id: 's2', userId: 'u1', tier: 'premium', status: 'pending' }],
    { id: 'u1', role: 'user', membershipTier: 'premium', membershipUntil: kalan },
  );
  await svc.approve('s2', 1, 'admin');
  const bitis = kullanici.membershipUntil as Date;
  const beklenen = kalan.getTime() + 30 * GUN;
  assert.ok(
    Math.abs(bitis.getTime() - beklenen) < 5000,
    `kalan 10 gün silindi: bitiş ${bitis.toISOString()}`,
  );
});

test('KATMAN DEĞİŞİYORSA yeni ürün bugün başlıyor', async () => {
  // Premium günlerini Platinum'a taşımak iki fiyatı birbirine karıştırırdı.
  const kalan = new Date(Date.now() + 10 * GUN);
  const { svc, kullanici } = servis(
    [{ id: 's2', userId: 'u1', tier: 'platinum', status: 'pending' }],
    { id: 'u1', role: 'user', membershipTier: 'premium', membershipUntil: kalan },
  );
  await svc.approve('s2', 1, 'admin');
  const bitis = (kullanici.membershipUntil as Date).getTime();
  assert.ok(Math.abs(bitis - (Date.now() + 30 * GUN)) < 5000);
  assert.equal(kullanici.membershipTier, 'platinum');
});

test('SÜRESİ DOLMUŞSA bugünden başlıyor', async () => {
  const gecmis = new Date(Date.now() - 5 * GUN);
  const { svc, kullanici } = servis(
    [{ id: 's2', userId: 'u1', tier: 'premium', status: 'pending' }],
    { id: 'u1', role: 'user', membershipTier: 'premium', membershipUntil: gecmis },
  );
  await svc.approve('s2', 1, 'admin');
  const bitis = (kullanici.membershipUntil as Date).getTime();
  assert.ok(Math.abs(bitis - (Date.now() + 30 * GUN)) < 5000, 'geçmiş tarihin üstüne eklendi');
});

test('AKTİF talep YENİDEN ONAYLANAMIYOR — bedava 30 gün yok', async () => {
  const { svc } = servis([{ id: 's1', userId: 'u1', tier: 'premium', status: 'active' }], {
    id: 'u1',
    role: 'user',
    membershipTier: 'premium',
    membershipUntil: new Date(),
  });
  await assert.rejects(() => svc.approve('s1', 1, 'admin'), /zaten işlendi/);
});

test('REDDEDİLEN talep düzeltilebiliyor', async () => {
  // Yanlışlıkla reddedilen dekont yönetici tarafından onaylanabilmeli.
  const { svc, kullanici } = servis(
    [{ id: 's1', userId: 'u1', tier: 'premium', status: 'rejected' }],
    { id: 'u1', role: 'user', membershipTier: 'free', membershipUntil: null },
  );
  await svc.approve('s1', 1, 'admin');
  assert.equal(kullanici.membershipTier, 'premium');
});

test('YENİLEME sonrası eski satır KAPATILIYOR', async () => {
  const { svc, abonelikler } = servis(
    [
      { id: 's1', userId: 'u1', tier: 'premium', status: 'active', periodEnd: new Date() },
      { id: 's2', userId: 'u1', tier: 'premium', status: 'pending' },
    ],
    { id: 'u1', role: 'user', membershipTier: 'premium', membershipUntil: new Date() },
  );
  await svc.approve('s2', 1, 'admin');
  assert.equal(abonelikler[0]!.status, 'replaced', 'eski satır aktif kaldı — zamanlayıcı düşürür');
});

test('ESKİ SATIR DOLDUĞUNDA geçerli üyelik DÜŞÜRÜLMÜYOR', async () => {
  /*
   * Asıl kayıp buydu: eski satır `active` + geçmiş `periodEnd` kalıyordu,
   * zamanlayıcı onu bulup kullanıcıyı `free`ye düşürüyordu. Müşteri yeni
   * ayının ortasında üyeliğini kaybediyordu.
   */
  const { svc, kullanici, abonelikler } = servis(
    [
      { id: 's1', userId: 'u1', status: 'active', periodEnd: new Date(Date.now() - GUN) },
      { id: 's2', userId: 'u1', status: 'active', periodEnd: new Date(Date.now() + 20 * GUN) },
    ],
    { id: 'u1', membershipTier: 'premium', membershipUntil: new Date(Date.now() + 20 * GUN) },
  );
  await svc.expireDue();
  assert.equal(abonelikler[0]!.status, 'expired', 'dolan satır kapanmadı');
  assert.equal(kullanici.membershipTier, 'premium', 'geçerli üyelik silindi');
});

test('BAŞKA üyelik yoksa süresi dolan kullanıcı FREE oluyor', async () => {
  const { svc, kullanici } = servis(
    [{ id: 's1', userId: 'u1', status: 'active', periodEnd: new Date(Date.now() - GUN) }],
    { id: 'u1', membershipTier: 'premium', membershipUntil: new Date(Date.now() - GUN) },
  );
  await svc.expireDue();
  assert.equal(kullanici.membershipTier, 'free');
  assert.equal(kullanici.isPremium, false);
});

test('AYNI DEKONT ikinci üyelikte kullanılamıyor', async () => {
  const { svc } = servis(
    [
      { id: 's1', userId: 'u1', status: 'active', receiptHash: null },
      { id: 's2', userId: 'u1', status: 'pending', receiptHash: null },
    ],
    { id: 'u1', membershipTier: 'free', membershipUntil: null },
  );
  await svc.uploadReceipt('u1', 's1', 'data:image/jpeg;base64,AYNI');
  await assert.rejects(
    () => svc.uploadReceipt('u1', 's2', 'data:image/jpeg;base64,AYNI'),
    /RECEIPT_REUSED|kullanılmış/,
  );
});
