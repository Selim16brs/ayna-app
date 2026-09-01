import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BookingsService } from './bookings.service';

/**
 * UÇTAN UCA RANDEVU AKIŞI — müşteri ve uzman SIRAYLA.
 *
 * Kurucunun istediği test: müşteri randevu alır, uzman gereğini yapar, top
 * müşteriye döner… randevu bitene kadar. Her adımda İKİ TARAFIN da ne
 * gördüğü doğrulanıyor.
 *
 * Neden elle tıklamak yerine bu: elle test bir kez geçer ve unutulur; bu her
 * değişiklikte yeniden koşuyor. Bugün üretime çıkan çökme, tam da "bir kez
 * baktım, çalışıyordu" boşluğundan geçmişti.
 */

type Kayit = Record<string, unknown>;

/** Servisin kullandığı kadarıyla sahte veritabanı — tek randevu üzerinden. */
function sahteOrtam(randevu: Kayit) {
  const ayarlar: Record<string, { intValue: number | null; strValue: string | null }> = {
    'rate.deposit_pct': { intValue: 10, strValue: null },
    'policy.hold_minutes': { intValue: 10, strValue: null },
    'policy.response_hours': { intValue: 3, strValue: null },
    'policy.confirm_hours': { intValue: 24, strValue: null },
  };
  const defter: Kayit[] = [];
  const prisma = {
    booking: {
      findUnique: () => Promise.resolve({ ...randevu }),
      findFirst: () => Promise.resolve(null),
      findMany: () => Promise.resolve([]),
      update: ({ data }: { data: Kayit }) => {
        for (const [k, v] of Object.entries(data)) {
          const artis = (v as { increment?: number })?.increment;
          randevu[k] = typeof artis === 'number' ? Number(randevu[k] ?? 0) + artis : v;
        }
        return Promise.resolve({ ...randevu });
      },
      updateMany: () => Promise.resolve({ count: 0 }),
      upsert: () => Promise.resolve({ ...randevu }),
      $executeRaw: () => Promise.resolve(0),
    },
    setting: {
      findUnique: ({ where }: { where: { key: string } }) =>
        Promise.resolve(ayarlar[where.key] ? { key: where.key, ...ayarlar[where.key]! } : null),
      findMany: () => Promise.resolve([]),
    },
    specialist: { findFirst: () => Promise.resolve({ userId: 'uzman-1', proId: 'p1' }) },
    business: { findFirst: () => Promise.resolve(null) },
    user: {
      findUnique: () => Promise.resolve({ pointsUnlockedAt: null }),
      updateMany: () => Promise.resolve({}),
    },
    loyaltyEntry: {
      create: (a: { data: Kayit }) => {
        defter.push(a.data);
        return Promise.resolve(a.data);
      },
      findMany: () => Promise.resolve([]),
    },
    refundRequest: {
      create: () => Promise.resolve({}),
      createMany: () => Promise.resolve({ count: 1 }),
    },
    auditLog: { create: () => Promise.resolve({}) },
    professional: { findUnique: () => Promise.resolve(null) },
    $transaction: async (fn: (tx: unknown) => unknown) => fn(prisma),
    $executeRaw: () => Promise.resolve(0),
  };
  const push = { sendToUser: () => Promise.resolve(), sendTemplate: () => Promise.resolve() };
  const svc = new BookingsService(
    prisma as never,
    push as never,
    { put: async (x: string) => x } as never,
    { refundQuota: () => undefined, findActive: () => Promise.resolve(null) } as never,
  );
  return { svc, randevu, defter };
}

const YENI_RANDEVU = (): Kayit => ({
  id: 'bk-e2e',
  userId: 'musteri-1',
  proId: 'p1',
  status: 'onay_bekliyor',
  price: 23000,
  durationMin: 150,
  startAt: new Date(Date.now() + 48 * 3600_000),
  depositAmount: 0,
  depositForfeited: false,
  rescheduleCount: 0,
  responseReminders: 0,
});

test('MUTLU YOL — talepten tamamlanmaya, iki taraf sırayla', async () => {
  const { svc, randevu } = sahteOrtam(YENI_RANDEVU());

  // 1) MÜŞTERİ talebi gönderdi (kurulum): uzmanın yanıtı bekleniyor.
  assert.equal(randevu.status, 'onay_bekliyor');

  // 2) UZMAN onaylıyor → §4.3 depozito adımı, 10 dakikalık pencere açılıyor.
  await svc.approve('bk-e2e', 'uzman-1');
  assert.equal(randevu.status, 'depozito_bekliyor', 'uzman onayı depozito adımını açmadı');
  assert.ok(Number(randevu.depositAmount) > 0, 'depozito tutarı hesaplanmadı');
  assert.equal(Number(randevu.depositAmount), 2300, '§4.4 — toplamın %10’u değil');
  assert.ok(randevu.depositDeadline, '10 dakikalık pencere damgalanmadı');

  // 3) MÜŞTERİ dekontu yüklüyor → §4.4 "yüklendiği an KESINLESTI".
  await svc.submitDepositReceipt('bk-e2e', 'dekont-veri', 0, 'musteri-1');
  assert.equal(randevu.status, 'kesinlesti', 'dekont randevuyu kesinleştirmedi');

  // 4) Randevu saati geldi (zamanlayıcı işi) → hizmet günü.
  randevu.status = 'hizmet_gunu';

  // 5) UZMAN işi bitiriyor → §4.9 ödeme adımı.
  await svc.complete('bk-e2e', 'uzman-1');
  assert.equal(randevu.status, 'odeme_bekliyor', 'uzman "işlemi bitirdim" ödeme adımını açmadı');

  // 6) MÜŞTERİ "ödemeyi yaptım" diyor → DURUM DEĞİŞMİYOR, yalnız damga.
  //    §3 tek durum: ayrı bir "ödeme bildirildi" durumu açmak diyagramı bozardı.
  await svc.balancePaid('bk-e2e', 'musteri-1');
  assert.equal(randevu.status, 'odeme_bekliyor', 'müşteri beyanı durumu değiştirdi');
  assert.ok(randevu.balanceDeclaredAt, 'ödeme beyanı damgalanmadı');

  // 7) UZMAN "ödemeyi aldım" diyor → tamamlandı + puan.
  await svc.balanceReceived('bk-e2e', 'uzman-1');
  assert.equal(randevu.status, 'tamamlandi', 'uzman onayı randevuyu kapatmadı');
  assert.ok(randevu.completedAt, 'tamamlanma anı damgalanmadı');
});

test('DEĞİŞİKLİK YOLU — uzman başka saat önerir, müşteri karşı öneri yapar', async () => {
  const { svc, randevu } = sahteOrtam(YENI_RANDEVU());
  const yeniSaat = Date.now() + 72 * 3600_000;

  // UZMAN değişiklik öneriyor → karar müşteriye geçiyor.
  await svc.propose('bk-e2e', yeniSaat, 'uzman-1');
  assert.equal(randevu.status, 'degisiklik_onerildi');

  // MÜŞTERİ karşı öneri yapıyor → §4.3 TEK TUR, uzman yalnız Kabul/Red.
  await svc.counter('bk-e2e', yeniSaat + 3600_000, 'musteri-1');
  assert.equal(randevu.status, 'karsi_oneri');

  // UZMAN kabul ediyor → depozito adımı (kesinleşme DEĞİL: para henüz alınmadı).
  await svc.accept('bk-e2e', 'musteri-1');
  assert.equal(randevu.status, 'depozito_bekliyor', 'kabul depozitoyu atlıyor');
});

test('İPTAL YOLU — 3 saatten fazla varken depozito YANMIYOR', async () => {
  const r = YENI_RANDEVU();
  r.status = 'kesinlesti';
  r.depositAmount = 2300;
  const { svc, randevu } = sahteOrtam(r);
  await svc.cancel('bk-e2e', 'fikrim değişti', 'musteri-1');
  assert.equal(randevu.status, 'iptal_musteri');
  assert.equal(randevu.depositForfeited, false, '§4.7 — erken iptalde depozito yanmamalı');
});

test('İPTAL YOLU — 3 saatten az kala depozito YANIYOR', async () => {
  const r = YENI_RANDEVU();
  r.status = 'kesinlesti';
  r.depositAmount = 2300;
  r.startAt = new Date(Date.now() + 60 * 60_000); // 1 saat kaldı
  const { svc, randevu } = sahteOrtam(r);
  await svc.cancel('bk-e2e', 'geç iptal', 'musteri-1');
  assert.equal(randevu.depositForfeited, true, '§4.7 — geç iptalde depozito yanmalı');
});
