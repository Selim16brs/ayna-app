import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { BookingsService } from './bookings.service';

/**
 * ÖDEME BEYANI — kurucu, 05.09.2026.
 *
 *   "Müşteri salona gittiğinde hizmet saati başladığında otomatik olarak
 *    müşteri ekranında ilgili randevuda Ödeme Yap butonu aktif olmalı. şu anda
 *    yok ve randevu açık kalıyor ve tamamlanmıyor. Müşteri ödeme yaptım
 *    butonuna bastığında ayna para kazanıyor. eğer bunu yapmazsa kazanamaz.
 *    ayrıca eğer kuaförde ilk rezervasyondaki fiyat değişmemişse direkt ödeme
 *    yaptım basabilir, eğer değişiklik olduysa ona göre tutarı girer ve ona
 *    göre ayna para kazanır."
 *
 * Buradaki her test o cümlenin bir parçasını kilitliyor.
 */

type Kayit = Record<string, unknown>;

function sahteOrtam(randevu: Kayit) {
  const ayarlar: Record<string, { intValue: number | null; strValue: string | null }> = {
    'policy.confirm_hours': { intValue: 24, strValue: null },
  };
  const defter: Kayit[] = [];
  const denetim: Kayit[] = [];
  const bildirimler: Array<{ userId: string; key: string; params?: Kayit }> = [];
  const prisma = {
    booking: {
      findUnique: () => Promise.resolve({ ...randevu }),
      findFirst: () => Promise.resolve(null),
      findMany: () => Promise.resolve([]),
      update: ({ data }: { data: Kayit }) => {
        for (const [k, v] of Object.entries(data)) randevu[k] = v;
        return Promise.resolve({ ...randevu });
      },
      updateMany: () => Promise.resolve({ count: 0 }),
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
      findMany: () => Promise.resolve([]),
      updateMany: () => Promise.resolve({ count: 0 }),
    },
    loyaltyEntry: {
      findMany: () => Promise.resolve([]),
      create: (a: { data: Kayit }) => {
        defter.push(a.data);
        return Promise.resolve(a.data);
      },
      createMany: (a: { data: Kayit[] }) => {
        defter.push(...a.data);
        return Promise.resolve({ count: a.data.length });
      },
    },
    auditLog: {
      create: (a: { data: Kayit }) => {
        denetim.push(a.data);
        return Promise.resolve({});
      },
    },
    professional: { findUnique: () => Promise.resolve(null) },
    $transaction: async (fn: (tx: unknown) => unknown) => fn(prisma),
  };
  const push = {
    sendToUser: () => Promise.resolve(),
    sendTemplate: (userId: string, key: string, params?: Kayit) => {
      bildirimler.push({ userId, key, ...(params ? { params } : {}) });
      return Promise.resolve();
    },
  };
  const svc = new BookingsService(
    prisma as never,
    push as never,
    { put: async (x: string) => x } as never,
    { refundQuota: () => undefined, findActive: () => Promise.resolve(null) } as never,
  );
  return { svc, randevu, defter, denetim, bildirimler };
}

/** Hizmet saati BAŞLAMIŞ, uzman henüz hiçbir şeye basmamış randevu. */
const HIZMET_GUNU = (ek: Kayit = {}): Kayit => ({
  id: 'bk-1',
  userId: 'musteri-1',
  proId: 'p1',
  status: 'hizmet_gunu',
  price: 20000,
  depositAmount: 2000,
  startAt: new Date(Date.now() - 30 * 60_000),
  balanceDeclaredAt: null,
  finalPrice: null,
  ...ek,
});

/** Zamanlayıcının beklemesini gerektirmeyen küçük bekleme — `void` push'lar için. */
const bekle = () => new Promise((r) => setImmediate(r));

test('HİZMET GÜNÜNDE beyan randevuyu ödeme beklemeye taşıyor', async () => {
  // Eskiden beyan yalnız uzman "işlemi bitirdim" dedikten sonra mümkündü:
  // uzman basmazsa randevu sonsuza kadar açık kalıyordu.
  const { svc, randevu } = sahteOrtam(HIZMET_GUNU());
  await svc.balancePaid('bk-1', 'musteri-1');
  assert.equal(randevu.status, 'odeme_bekliyor', 'randevu hâlâ açık kalıyor');
  assert.ok(randevu.balanceDeclaredAt, 'beyan damgalanmadı');
  assert.ok(randevu.finalizeDeadline, 'uzmanın itiraz penceresi başlamadı');
});

test('MÜŞTERİ BEYAN EDİNCE PUAN YAZILIYOR — "bastığında ayna para kazanıyor"', async () => {
  const { svc, defter } = sahteOrtam(HIZMET_GUNU());
  await svc.balancePaid('bk-1', 'musteri-1');
  await bekle();
  const kazanim = defter.find((d) => d.reason === 'rewards.earn.cashback');
  assert.ok(kazanim, 'beyan puan üretmedi');
  // %1 geri kazanım: 20.000 ₸ → 200 puan.
  assert.equal(kazanim.points, 200);
  assert.equal(kazanim.detail, 'bk-1');
});

test('FİYAT DEĞİŞMEDİYSE finalPrice YAZILMIYOR', async () => {
  // Aynı tutarı kopyalamak "fiyat değişti mi" sorusunu kayıttan okunamaz
  // hâle getirirdi.
  const { svc, randevu } = sahteOrtam(HIZMET_GUNU());
  await svc.balancePaid('bk-1', 'musteri-1', 20000);
  assert.equal(randevu.finalPrice, null);
});

test('FİYAT DEĞİŞTİYSE beyan edilen tutar yazılıyor ve PUAN ONDAN doğuyor', async () => {
  const { svc, randevu, defter, denetim } = sahteOrtam(HIZMET_GUNU());
  await svc.balancePaid('bk-1', 'musteri-1', 30000);
  await bekle();
  assert.equal(randevu.finalPrice, 30000);
  // Rezervasyon fiyatı KORUNUYOR: depozito onun %10'u olarak alınmıştı.
  assert.equal(randevu.price, 20000);
  const kazanim = defter.find((d) => d.reason === 'rewards.earn.cashback');
  assert.equal(kazanim?.points, 300, 'puan hâlâ eski fiyattan hesaplanıyor');
  // §12 — para olayı denetim kaydına giriyor.
  assert.ok(
    denetim.some((d) => d.action === 'booking.final_price'),
    'fiyat değişikliği denetim kaydına yazılmadı',
  );
});

test('TUTAR DEĞİŞTİYSE uzmana TUTARLI bildirim gidiyor', async () => {
  const { svc, bildirimler } = sahteOrtam(HIZMET_GUNU());
  await svc.balancePaid('bk-1', 'musteri-1', 30000);
  await bekle();
  const b = bildirimler.find((x) => x.userId === 'uzman-1');
  assert.equal(b?.key, 'booking.payment_declared_amount', 'uzman değişen tutarı görmüyor');
  assert.equal(b?.params?.tutar, '30000');
});

test('TUTAR AYNIYSA uzmana sade bildirim gidiyor', async () => {
  const { svc, bildirimler } = sahteOrtam(HIZMET_GUNU());
  await svc.balancePaid('bk-1', 'musteri-1');
  await bekle();
  const b = bildirimler.find((x) => x.userId === 'uzman-1');
  assert.equal(b?.key, 'booking.payment_declared');
});

test('GEÇERSİZ TUTAR reddediliyor', async () => {
  for (const kotu of [0, -100, 10.005, Number.NaN]) {
    const { svc, randevu } = sahteOrtam(HIZMET_GUNU());
    await assert.rejects(
      () => svc.balancePaid('bk-1', 'musteri-1', kotu),
      /geçerli bir para tutarı/,
      `${kotu} kabul edildi`,
    );
    assert.equal(randevu.balanceDeclaredAt, null, `${kotu} yine de beyan damgaladı`);
  }
});

test('HİZMET SAATİ GELMEDEN beyan reddediliyor', async () => {
  // Yaşanmamış hizmet için para ve puan doğurmak.
  const { svc, randevu } = sahteOrtam(
    HIZMET_GUNU({ status: 'kesinlesti', startAt: new Date(Date.now() + 3600_000) }),
  );
  await assert.rejects(() => svc.balancePaid('bk-1', 'musteri-1'), /hizmet saati/);
  assert.equal(randevu.status, 'kesinlesti');
});

test('SAATİ GELMİŞ ama zamanlayıcı geç kalmışsa beyan yine kabul ediliyor', async () => {
  // Zamanlayıcı 60 saniyede bir dönüyor ve kapatılabiliyor; müşteri onun
  // gecikmesi yüzünden randevusunu kapatamamazlık etmemeli.
  const { svc, randevu } = sahteOrtam(HIZMET_GUNU({ status: 'kesinlesti' }));
  await svc.balancePaid('bk-1', 'musteri-1');
  assert.equal(randevu.status, 'odeme_bekliyor');
});

test('KAPANMIŞ randevuda beyan reddediliyor', async () => {
  for (const durum of ['tamamlandi', 'iptal_musteri', 'no_show_musteri']) {
    const { svc } = sahteOrtam(HIZMET_GUNU({ status: durum }));
    await assert.rejects(
      () => svc.balancePaid('bk-1', 'musteri-1'),
      /ödeme beyan edilemez/,
      `${durum} durumunda beyan kabul edildi`,
    );
  }
});

test('UZMAN ödeme beyanı yapamıyor — beyan MÜŞTERİNİNDİR', async () => {
  const { svc } = sahteOrtam(HIZMET_GUNU());
  await assert.rejects(() => svc.balancePaid('bk-1', 'uzman-1'));
});

test('ZAMANLAYICI otomatik kesinleştirmede beyan alanlarını OKUYOR', async () => {
  /*
   * Ödül hesabının iki girdisi var: beyan damgası (yoksa puan yok) ve ödenen
   * tutar (varsa puan ondan doğar). Zamanlayıcı `select` ile yalnız birkaç
   * alan çekiyor; bu ikisi listeden düşerse ikisi de `undefined` gelir ve
   * kural o yolda SESSİZCE uygulanmaz — hiçbir tip hatası vermeden.
   */
  const kaynak = readFileSync(new URL('./bookings.scheduler.ts', import.meta.url), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
  const i = kaynak.indexOf("status: 'odeme_bekliyor', finalizeDeadline:");
  assert.ok(i > 0, 'otomatik kesinleştirme sorgusu bulunamadı');
  const sorgu = kaynak.slice(i, i + 400);
  assert.match(sorgu, /balanceDeclaredAt: true/);
  assert.match(sorgu, /finalPrice: true/);
});
