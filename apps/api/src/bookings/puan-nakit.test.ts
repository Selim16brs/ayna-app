import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BookingsService } from './bookings.service';
import { PUAN_HARCAMA_SEBEBI, PUAN_IADE_SEBEBI } from '../loyalty/puan-iade';

/**
 * PUAN → NAKİT AÇIĞI KAPALI.
 *
 * Senaryo: müşteri 2.000 ₸ depozitonun 500'ünü puanla öder (1.500 ₸ nakit),
 * ücretsiz iptal penceresinde iptal eder. Eskiden iade talebi 2.000 ₸ NAKİT
 * açıyordu: 500 puan nakde dönüşüyordu. Artık nakit iade 1.500 ₸ ve 500 puan
 * kullanıcıya PUAN olarak geri veriliyor.
 */

type Kayit = Record<string, unknown>;

function sahteOrtam(randevu: Kayit, defter: Kayit[] = []) {
  const iadeTalepleri: Kayit[] = [];
  const prisma = {
    booking: {
      findUnique: () => Promise.resolve({ ...randevu }),
      findFirst: () => Promise.resolve(null),
      findMany: () => Promise.resolve([]),
      update: ({ data }: { data: Kayit }) => {
        Object.assign(randevu, data);
        return Promise.resolve({ ...randevu });
      },
      updateMany: () => Promise.resolve({ count: 0 }),
    },
    refundRequest: {
      create: (a: { data: Kayit }) => {
        iadeTalepleri.push(a.data);
        return Promise.resolve(a.data);
      },
      createMany: (a: { data: Kayit[] }) => {
        iadeTalepleri.push(...a.data);
        return Promise.resolve({ count: a.data.length });
      },
    },
    loyaltyEntry: {
      findMany: ({ where }: { where: { detail: string; reason: { in: string[] } } }) =>
        Promise.resolve(
          defter.filter(
            (d) => d.detail === where.detail && where.reason.in.includes(String(d.reason)),
          ),
        ),
      create: (a: { data: Kayit }) => {
        defter.push(a.data);
        return Promise.resolve(a.data);
      },
      createMany: (a: { data: Kayit[] }) => {
        defter.push(...a.data);
        return Promise.resolve({ count: a.data.length });
      },
    },
    setting: { findUnique: () => Promise.resolve(null), findMany: () => Promise.resolve([]) },
    specialist: { findFirst: () => Promise.resolve(null), findUnique: () => Promise.resolve(null) },
    business: { findFirst: () => Promise.resolve(null) },
    user: {
      findUnique: ({ where }: { where: { id: string } }) =>
        Promise.resolve({ id: where.id, role: 'user', pointsUnlockedAt: null }),
      findMany: () => Promise.resolve([]),
      updateMany: () => Promise.resolve({ count: 0 }),
    },
    auditLog: { create: () => Promise.resolve({}) },
    professional: { findUnique: () => Promise.resolve(null) },
    $transaction: async (fn: (tx: unknown) => unknown) => fn(prisma),
    $executeRaw: () => Promise.resolve(0),
  };
  const svc = new BookingsService(
    prisma as never,
    { sendToUser: () => Promise.resolve(), sendTemplate: () => Promise.resolve() } as never,
    { put: async (x: string) => x } as never,
    { refundQuota: () => undefined, findActive: () => Promise.resolve(null) } as never,
  );
  return { svc, randevu, iadeTalepleri, defter };
}

/** İptal edilmiş, 500 puanla kısmen ödenmiş 2.000 ₸ depozitolu randevu. */
const IPTAL = (ek: Kayit = {}): Kayit => ({
  id: 'bk-1',
  userId: 'musteri-1',
  proId: 'p1',
  status: 'iptal_musteri',
  price: 20000,
  depositAmount: 2000,
  pointsUsed: 500,
  depositForfeited: false,
  startAt: new Date(Date.now() + 24 * 3600_000),
  ...ek,
});

const HARCAMA = { detail: 'bk-1', reason: PUAN_HARCAMA_SEBEBI, points: -500 };

test('NAKİT İADE puanla ödenen kısmı içermiyor', async () => {
  const { svc, iadeTalepleri } = sahteOrtam(IPTAL(), [{ ...HARCAMA }]);
  await svc.iadeTalep('bk-1', 'Kaspi 7700', 'musteri-1');
  assert.equal(iadeTalepleri.length, 1);
  assert.equal(iadeTalepleri[0]!.amount, 1500, 'puan nakde çevriliyor');
});

test('puanla ödenen kısım PUAN olarak geri veriliyor', async () => {
  const { svc, defter } = sahteOrtam(IPTAL(), [{ ...HARCAMA }]);
  await svc.iadeTalep('bk-1', 'Kaspi 7700', 'musteri-1');
  const iade = defter.find((d) => d.reason === PUAN_IADE_SEBEBI);
  assert.ok(iade, 'puan kullanıcıda kayboldu');
  assert.equal(iade.points, 500);
});

test('DEPOZİTONUN TAMAMI puanla ödendiyse: nakit yok, puan geri', async () => {
  const { svc, iadeTalepleri, defter } = sahteOrtam(IPTAL({ pointsUsed: 2000 }), [
    { detail: 'bk-1', reason: PUAN_HARCAMA_SEBEBI, points: -2000 },
  ]);
  const sonuc = (await svc.iadeTalep('bk-1', 'Kaspi 7700', 'musteri-1')) as {
    puanIadesi?: number;
  };
  assert.equal(iadeTalepleri.length, 0, 'ödenmemiş nakit iade ediliyor');
  assert.equal(sonuc.puanIadesi, 2000);
  assert.ok(defter.some((d) => d.reason === PUAN_IADE_SEBEBI && d.points === 2000));
});

test('puan kullanılmamışsa iade DEĞİŞMİYOR', async () => {
  const { svc, iadeTalepleri } = sahteOrtam(IPTAL({ pointsUsed: 0 }), []);
  await svc.iadeTalep('bk-1', 'Kaspi 7700', 'musteri-1');
  assert.equal(iadeTalepleri[0]!.amount, 2000);
});

test('DEPOZİTO YANDIYSA ne nakit ne puan iade ediliyor', async () => {
  // Geç iptal: depozito ceza olarak uzmanda kalıyor. Puanı geri vermek,
  // cezanın yarısını AYNA'ya ödetmek olurdu.
  const { svc } = sahteOrtam(IPTAL({ depositForfeited: true }), [{ ...HARCAMA }]);
  await assert.rejects(() => svc.iadeTalep('bk-1', 'Kaspi 7700', 'musteri-1'), /iade hakkı/);
});
