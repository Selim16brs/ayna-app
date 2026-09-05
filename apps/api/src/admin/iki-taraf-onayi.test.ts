import assert from 'node:assert/strict';
import { test } from 'node:test';
import { AdminService } from './admin.service';

/**
 * İKİ TARAFIN ONAYI PANELDE GÖRÜNÜYOR.
 *
 * Kurucu (05.09.2026): "her iki tarafın onayı adminde müşterinin ayna
 * parasını aktif hale getirir."
 *
 * Panel bu iki onayı hiç göstermiyordu: yönetici, bir müşterinin puanının
 * neden yazılmadığını — hangi tarafın onayının eksik olduğunu — göremiyordu.
 */

type Kayit = Record<string, unknown>;

function servis(randevular: Kayit[]) {
  const prisma = { booking: { findMany: () => Promise.resolve(randevular) } };
  return new AdminService(prisma as never, {} as never, {} as never);
}

const RANDEVU = (ek: Kayit = {}): Kayit => ({
  id: 'b1',
  userId: 'u1',
  service: 'Saç',
  proName: 'Salon A',
  dateLabel: '5 Eylül',
  price: 20000,
  status: 'odeme_bekliyor',
  source: 'app',
  balanceDeclaredAt: null,
  completedAt: null,
  finalPrice: null,
  depositAmount: 2000,
  depositReceiptUri: null,
  createdAt: new Date(),
  ...ek,
});

test('hiçbir onay yoksa ayna para BEKLİYOR', async () => {
  const [b] = await servis([RANDEVU()]).bookings();
  assert.equal(b!.musteriOdedi, false);
  assert.equal(b!.uzmanAldi, false);
  assert.equal(b!.aynaParaAktif, false);
});

test('YALNIZ müşteri beyan etmişse ayna para hâlâ bekliyor', async () => {
  const [b] = await servis([RANDEVU({ balanceDeclaredAt: new Date() })]).bookings();
  assert.equal(b!.musteriOdedi, true);
  assert.equal(b!.uzmanAldi, false);
  assert.equal(b!.aynaParaAktif, false, 'tek taraflı beyan puanı aktif gösteriyor');
});

test('YALNIZ uzman teyit etmişse ayna para bekliyor', async () => {
  const [b] = await servis([RANDEVU({ completedAt: new Date() })]).bookings();
  assert.equal(b!.musteriOdedi, false);
  assert.equal(b!.aynaParaAktif, false);
});

test('İKİSİ DE onayladıysa ayna para AKTİF', async () => {
  const [b] = await servis([
    RANDEVU({ balanceDeclaredAt: new Date(), completedAt: new Date(), status: 'tamamlandi' }),
  ]).bookings();
  assert.equal(b!.musteriOdedi, true);
  assert.equal(b!.uzmanAldi, true);
  assert.equal(b!.aynaParaAktif, true);
});

test('kasada değişen tutar panelde görünüyor', async () => {
  // Yönetici komisyonu hangi tutardan hesapladığımızı görebilmeli.
  const [b] = await servis([RANDEVU({ finalPrice: 30000 })]).bookings();
  assert.equal(b!.finalPrice, 30000);
});
