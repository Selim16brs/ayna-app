import assert from 'node:assert/strict';
import { test } from 'node:test';
import { AdOrdersService } from './ad-orders.service';

/**
 * TEK ÖDEME = TEK REKLAM.
 *
 * `onayla` ve `reddet` durum kapısı taşımıyordu:
 *
 *   · Yayındaki siparişi yeniden onaylamak İKİNCİ bir banner üretiyor ve
 *     `bannerId`yi onun üstüne yazıyordu. İlk banner yayında kalıyor ama
 *     artık hiçbir siparişe bağlı değil — panelden sipariş üzerinden
 *     kapatılamayan ÖKSÜZ bir reklam. Tek ödemeye iki reklam.
 *   · Yayındaki siparişi reddetmek durumu `reddedildi` yazıyor ama BANNER'A
 *     DOKUNMUYORDU: uzman "ödemen doğrulanamadı" görürken reklamı akmaya
 *     devam ediyordu.
 *
 * Yavaş bağlantıda çift tıklamak yetiyordu.
 */

type Kayit = Record<string, unknown>;

function servis(siparis: Kayit) {
  const bannerlar: Kayit[] = [];
  const yuklenen: string[] = [];
  const prisma = {
    adOrder: {
      create: ({ data }: { data: Kayit }) => Promise.resolve({ id: 'ad-1', ...data }),
      findUnique: () => Promise.resolve({ ...siparis }),
      findFirst: () => Promise.resolve(null),
      findMany: () => Promise.resolve([]),
      update: ({ data }: { data: Kayit }) => {
        Object.assign(siparis, data);
        return Promise.resolve({ ...siparis });
      },
    },
    adBanner: {
      create: (a: { data: Kayit }) => {
        const b = { id: `bn-${bannerlar.length + 1}`, ...a.data };
        bannerlar.push(b);
        return Promise.resolve(b);
      },
    },
    specialist: { findFirst: () => Promise.resolve({ proId: 'p1' }) },
    business: { findFirst: () => Promise.resolve(null) },
    setting: { findUnique: () => Promise.resolve({ intValue: 200_000 }) },
    auditLog: { create: () => Promise.resolve({}) },
  };
  const svc = new AdOrdersService(
    prisma as never,
    { sendTemplate: () => Promise.resolve() } as never,
    {
      put: async (x: string, prefix: string) => {
        yuklenen.push(prefix);
        return `https://depo/${prefix}/x.jpg`;
      },
    } as never,
  );
  return { svc, siparis, bannerlar, yuklenen };
}

const SIPARIS = (ek: Kayit = {}): Kayit => ({
  id: 'ad-1',
  userId: 'u1',
  proId: 'p1',
  proName: 'Salon A',
  placement: 'one_cikanlar',
  months: 1,
  title: 'Kampanya',
  subtitle: '',
  description: '',
  image: 'x',
  status: 'bekliyor',
  receiptUri: 'data:image/jpeg;base64,X',
  ...ek,
});

test('bekleyen sipariş onaylanınca TEK banner doğuyor', async () => {
  const { svc, bannerlar, siparis } = servis(SIPARIS());
  await svc.onayla('ad-1', 'admin');
  assert.equal(bannerlar.length, 1);
  assert.equal(siparis.status, 'yayinda');
  assert.equal(siparis.bannerId, 'bn-1');
});

test('YAYINDAKİ sipariş yeniden onaylanamıyor — öksüz banner yok', async () => {
  const { svc, bannerlar } = servis(SIPARIS({ status: 'yayinda', bannerId: 'bn-1' }));
  await assert.rejects(() => svc.onayla('ad-1', 'admin'), /zaten işlendi/);
  assert.equal(bannerlar.length, 0, 'ikinci banner üretildi — tek ödemeye iki reklam');
});

test('REDDEDİLMİŞ sipariş sessizce yayına alınamıyor', async () => {
  const { svc, bannerlar } = servis(SIPARIS({ status: 'reddedildi' }));
  await assert.rejects(() => svc.onayla('ad-1', 'admin'), /zaten işlendi/);
  assert.equal(bannerlar.length, 0);
});

test('YAYINDAKİ sipariş "reddedildi" yapılamıyor', async () => {
  // Durum değişir, banner akmaya devam ederdi: uzman "ödemen doğrulanamadı"
  // görürken reklamı yayında olurdu.
  const { svc, siparis } = servis(SIPARIS({ status: 'yayinda', bannerId: 'bn-1' }));
  await assert.rejects(() => svc.reddet('ad-1', 'admin'), /zaten işlendi/);
  assert.equal(siparis.status, 'yayinda');
});

test('DEKONTSUZ sipariş yayına alınamıyor', async () => {
  const { svc, bannerlar } = servis(SIPARIS({ receiptUri: null }));
  await assert.rejects(() => svc.onayla('ad-1', 'admin'), /Dekont/);
  assert.equal(bannerlar.length, 0);
});

test('yayın penceresi SİPARİŞTEKİ ay sayısından geliyor', async () => {
  const { svc, bannerlar } = servis(SIPARIS({ months: 3 }));
  await svc.onayla('ad-1', 'admin');
  const b = bannerlar[0]!;
  const gun = ((b.endsAt as Date).getTime() - (b.startsAt as Date).getTime()) / 86_400_000;
  assert.ok(Math.abs(gun - 90) < 0.01, `pencere ${gun} gün`);
});

test('REKLAM GÖRSELİ depolamaya yükleniyor', async () => {
  /*
   * Buradan geçmiyordu: telefondan seçilen fotoğraf ham base64 olarak
   * veritabanı satırına yazılıyordu. Kayıt megabaytlarca büyüyor ve reklam
   * listesi HER KULLANICININ keşif ekranında o satırları okuyor. Dekont,
   * portföy, salon fotoğrafı: hepsi depolamadan geçiyordu; reklam atlanmıştı.
   */
  const { svc, yuklenen } = servis(SIPARIS());
  await svc.olustur('u1', {
    proName: 'Salon A',
    placement: 'one_cikanlar',
    title: 'Kampanya',
    image: 'data:image/jpeg;base64,QUJD',
    months: 1,
  });
  assert.ok(yuklenen.includes('ads'), 'reklam görseli depolamaya yüklenmiyor');
});
