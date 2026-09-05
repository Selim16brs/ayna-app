import assert from 'node:assert/strict';
import { test } from 'node:test';
import { AdminService } from './admin.service';
import { PUAN_HARCAMA_SEBEBI, PUAN_IADE_SEBEBI } from '../loyalty/puan-iade';

/**
 * SAHTE DEKONT GERİ ALINDIĞINDA PUAN DA GERİ GELİYOR.
 *
 * Geri alma randevuyu `depozito_bekliyor`a döndürüyor ve müşteri düzeltilmiş
 * dekontu yüklüyor. Puan iade edilmediği için müşteri AYNI depozito için
 * ikinci kez puan harcıyordu — hiçbir ekran bunu göstermiyordu, yalnız
 * bakiyesi eksiliyordu.
 */

type Kayit = Record<string, unknown>;

function servis(randevu: Kayit, defter: Kayit[] = []) {
  const prisma = {
    booking: {
      findUnique: () => Promise.resolve({ ...randevu }),
      update: ({ data }: { data: Kayit }) => {
        Object.assign(randevu, data);
        return Promise.resolve({ id: randevu.id, status: randevu.status });
      },
    },
    loyaltyEntry: {
      findMany: ({ where }: { where: { detail: string; reason: { in: string[] } } }) =>
        Promise.resolve(
          defter.filter(
            (d) => d.detail === where.detail && where.reason.in.includes(String(d.reason)),
          ),
        ),
      createMany: (a: { data: Kayit[] }) => {
        defter.push(...a.data);
        return Promise.resolve({ count: a.data.length });
      },
    },
    setting: { findMany: () => Promise.resolve([]), findUnique: () => Promise.resolve(null) },
    auditLog: { create: () => Promise.resolve({}) },
  };
  return {
    svc: new AdminService(prisma as never, {} as never, {} as never),
    randevu,
    defter,
  };
}

const RANDEVU = (ek: Kayit = {}): Kayit => ({
  id: 'bk-1',
  status: 'kesinlesti',
  depositReceiptUri: 'data:image/jpeg;base64,X',
  userId: 'u1',
  pointsUsed: 500,
  ...ek,
});

test('dekont reddedilince harcanan PUAN geri veriliyor', async () => {
  const { svc, defter } = servis(RANDEVU(), [
    { detail: 'bk-1', reason: PUAN_HARCAMA_SEBEBI, points: -500 },
  ]);
  await svc.rejectDepositReceipt('bk-1', 'admin-1');
  const iade = defter.find((d) => d.reason === PUAN_IADE_SEBEBI);
  assert.ok(iade, 'puan kullanıcıda kayboldu — yeniden yüklerken ikinci kez harcayacak');
  assert.equal(iade.points, 500);
});

test('iade edilen puan randevuda SIFIRLANIYOR', async () => {
  // Sıfırlanmazsa iade edilmiş puan ileride nakit iadeden bir kez daha
  // düşülür: müşteri hem puanını alır hem nakdi eksik alır.
  const { svc, randevu } = servis(RANDEVU(), [
    { detail: 'bk-1', reason: PUAN_HARCAMA_SEBEBI, points: -500 },
  ]);
  await svc.rejectDepositReceipt('bk-1', 'admin-1');
  assert.equal(randevu.pointsUsed, 0);
  assert.equal(randevu.status, 'depozito_bekliyor');
});

test('puan kullanılmamışsa fazladan kayıt yazılmıyor', async () => {
  const { svc, defter } = servis(RANDEVU({ pointsUsed: 0 }), []);
  await svc.rejectDepositReceipt('bk-1', 'admin-1');
  assert.equal(defter.length, 0);
});
