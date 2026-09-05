import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { BusinessesService } from './businesses.service';

/**
 * KADRODAN ÇIKARMA GERÇEKTEN ÇIKARIYOR — §4.5, sessiz silme yasak.
 *
 * Ekran "kadrodan çıkar" diyordu ve uzmanın açık randevularını gerçekten
 * iptal ediyordu — ama uzmanı kadrodan ÇIKARAN hiçbir sunucu çağrısı yoktu.
 * Kadro listesi sunucudan geliyor: bir sonraki tazelemede uzman geri
 * geliyordu.
 *
 * Mümkün olan en kötü bileşim: yıkıcı olan kısım (randevu iptalleri) gerçek,
 * asıl amaç (çıkarma) hayali.
 */

type Kayit = Record<string, unknown>;

function servis(isletme: Kayit, uzman: Kayit | null) {
  const bildirimler: Kayit[] = [];
  const denetim: Kayit[] = [];
  const prisma = {
    business: { findUnique: () => Promise.resolve({ ...isletme }) },
    specialist: {
      findUnique: () => Promise.resolve(uzman ? { ...uzman } : null),
      update: ({ data }: { data: Kayit }) => {
        Object.assign(uzman!, data);
        return Promise.resolve({ ...uzman });
      },
    },
  };
  const svc = new BusinessesService(
    prisma as never,
    {
      record: (d: Kayit) => {
        denetim.push(d);
        return Promise.resolve();
      },
    } as never,
    {} as never,
    {} as never,
    {
      sendTemplate: (userId: string, key: string, params?: Kayit) => {
        bildirimler.push({ userId, key, ...(params ?? {}) });
        return Promise.resolve();
      },
    } as never,
  );
  return { svc, uzman, bildirimler, denetim };
}

const ISLETME = { id: 'b1', ownerUserId: 'salon-1', name: 'Vurgun studio', professionalId: 'p1' };
const UZMAN = (ek: Kayit = {}): Kayit => ({
  id: 'sp-1',
  userId: 'uzman-1',
  businessId: 'b1',
  kind: 'salon_bound',
  ...ek,
});

const bekle = () => new Promise((r) => setImmediate(r));

test('uzman GERÇEKTEN kadrodan çıkıyor', async () => {
  const { svc, uzman } = servis(ISLETME, UZMAN());
  await svc.removeStaff('b1', 'sp-1', 'salon-1');
  assert.equal(uzman!.businessId, null, 'uzman kadroda kaldı — tazelemede geri gelir');
});

test('uzman BAĞIMSIZ olarak çalışmaya devam ediyor — hesabı silinmiyor', async () => {
  // Salonun, uzmanın hesabını silme yetkisi yok: kartı, hizmetleri ve
  // geçmişi duruyor.
  const { svc, uzman } = servis(ISLETME, UZMAN());
  await svc.removeStaff('b1', 'sp-1', 'salon-1');
  assert.equal(uzman!.kind, 'independent');
  assert.equal(uzman!.id, 'sp-1');
});

test('UZMANA BİLDİRİM gidiyor — sessiz silme yasak', async () => {
  const { svc, bildirimler } = servis(ISLETME, UZMAN());
  await svc.removeStaff('b1', 'sp-1', 'salon-1');
  await bekle();
  const b = bildirimler.find((x) => x.userId === 'uzman-1');
  assert.ok(b, 'uzman kendi kadro durumunu ekrandan öğrenmek zorunda kalıyor');
  assert.equal(b.key, 'staff.removed');
  assert.equal(b.salon, 'Vurgun studio');
});

test('DENETİM KAYDI yazılıyor', async () => {
  const { svc, denetim } = servis(ISLETME, UZMAN());
  await svc.removeStaff('b1', 'sp-1', 'salon-1');
  assert.ok(denetim.some((d) => d.action === 'business.staff_removed'));
});

test('BAŞKA SALONUN uzmanı çıkarılamıyor', async () => {
  const { svc } = servis(ISLETME, UZMAN({ businessId: 'b9' }));
  await assert.rejects(() => svc.removeStaff('b1', 'sp-1', 'salon-1'), /kadroda böyle bir uzman/);
});

test('SALON SAHİBİ OLMAYAN çıkaramıyor', async () => {
  const { svc } = servis(ISLETME, UZMAN());
  await assert.rejects(() => svc.removeStaff('b1', 'sp-1', 'baskasi'));
});

test('EKRAN sunucuya yazmadan randevu iptal etmiyor', () => {
  /*
   * Sıra kritik: önce sunucudan çıkarma, sonra iptaller. Ters olsaydı
   * çıkarma başarısız olduğunda randevular iptal edilmiş ama uzman hâlâ
   * salonda olurdu — geri alınamaz bir yarım işlem.
   */
  const ekran = readFileSync(
    new URL('../../../mobile/app/seller/staff.tsx', import.meta.url),
    'utf8',
  ).replace(/\/\*[\s\S]*?\*\//g, '');
  const i = ekran.indexOf('kadrodanCikar(kimlik)');
  const j = ekran.indexOf('cikanUzmanRandevulari(kimlik)');
  assert.ok(i > 0, 'ekran sunucuya hiç yazmıyor');
  assert.ok(j > i, 'randevular sunucudan çıkarma yapılmadan iptal ediliyor');
  // `await` şart: `void` ile çağrılırsa hata yakalanmadan akış devam eder ve
  // çıkarma başarısızken randevular yine iptal edilir.
  assert.match(ekran.slice(Math.max(0, i - 40), i), /await kadrodanCikar$|await $/);
  // Hata yakalanıyor ve akış DURUYOR.
  assert.match(ekran.slice(i, j), /catch[\s\S]*return;/);
});
