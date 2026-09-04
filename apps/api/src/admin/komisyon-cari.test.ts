import assert from 'node:assert/strict';
import { test } from 'node:test';
import { AdminService } from './admin.service';

/**
 * KOMİSYON CARİSİ — kurucu, 05.09.2026.
 *
 *   "eğer değişiklik olduysa ona göre tutarı girer ve ona göre ayna para
 *    kazanır. bu durumda uzmanda aynaya cari olarak depozito dışında kalan
 *    tutarı alması gerekir."
 *
 * İki kural birden:
 *
 *   · Komisyonun TABANI kasada ödenen tutardır (`finalPrice` varsa o).
 *   · AYNA depozitoyu müşteriden PEŞİN aldı; uzmandan yalnız depozito
 *     DIŞINDA kalan komisyon istenir. Depozito eskiden hiç düşülmüyordu:
 *     panel %10'luk komisyonu fiilen %20 olarak raporluyordu.
 */

type Kayit = Record<string, unknown>;

function servis(randevular: Kayit[], payouts: Kayit[] = []) {
  const prisma = {
    booking: { findMany: () => Promise.resolve(randevular) },
    commissionPayout: { findMany: () => Promise.resolve(payouts) },
    setting: { findUnique: () => Promise.resolve({ intValue: 10 }) },
  };
  return new AdminService(prisma as never, {} as never, {} as never);
}

/** 20.000 ₸ hizmet, %10 depozito peşin alınmış, tamamlanmış randevu. */
const RANDEVU = (ek: Kayit = {}): Kayit => ({
  id: 'b1',
  userId: 'u1',
  proId: 'p1',
  proName: 'Salon A',
  service: 'Saç',
  dateLabel: '1 Eylül',
  status: 'tamamlandi',
  price: 20000,
  depositAmount: 2000,
  finalPrice: null,
  createdAt: new Date(),
  ...ek,
});

test('FİYAT DEĞİŞMEDİYSE uzmanın cari borcu YOK — komisyon zaten depozito', async () => {
  const d = await servis([RANDEVU()]).commissions();
  assert.equal(d.totals.earned, 2000, 'komisyon %10 değil');
  assert.equal(d.totals.deposits, 2000, 'peşin alınan depozito görünmüyor');
  assert.equal(d.totals.outstanding, 0, 'uzmandan ikinci kez komisyon isteniyor');
  assert.equal(d.salons[0]!.outstanding, 0);
});

test('FİYAT YÜKSELDİYSE cari borç YALNIZ ARADAKİ FARK', async () => {
  // Kasada 20.000 → 30.000. Komisyon 3.000, peşin alınan 2.000 → borç 1.000.
  const d = await servis([RANDEVU({ finalPrice: 30000 })]).commissions();
  assert.equal(d.totals.earned, 3000, 'komisyon hâlâ rezervasyon fiyatından');
  assert.equal(d.totals.outstanding, 1000);
  assert.equal(d.salons[0]!.outstanding, 1000);
  assert.equal(d.items[0]!.cari, 1000, 'randevu satırında cari yok');
});

test('FİYAT DÜŞTÜYSE borç doğmuyor — fazla tahsilat sıfır sayılır', async () => {
  const d = await servis([RANDEVU({ finalPrice: 10000 })]).commissions();
  assert.equal(d.totals.earned, 1000);
  assert.equal(d.totals.outstanding, 0);
});

test('UZMANDAN TAHSİLAT cari borcu kapatıyor', async () => {
  const d = await servis(
    [RANDEVU({ finalPrice: 30000 })],
    [{ id: 'p', proId: 'p1', proName: 'Salon A', amount: 1000, note: '', createdAt: new Date() }],
  ).commissions();
  assert.equal(d.totals.collected, 1000);
  assert.equal(d.totals.outstanding, 0, 'tahsil edilmiş borç hâlâ açık görünüyor');
});

test('TAMAMLANMAMIŞ randevunun depozitosu tahsil sayılmıyor', async () => {
  // Kesinleşmiş ama yaşanmamış randevuda komisyon da doğmadı; depozitoyu
  // "tahsil edilmiş komisyon" saymak geliri erken yazmak olurdu.
  const d = await servis([RANDEVU({ status: 'kesinlesti' })]).commissions();
  assert.equal(d.totals.earned, 0);
  assert.equal(d.totals.deposits, 0);
  assert.ok(d.totals.pending > 0, 'bekleyen komisyon görünmüyor');
});
