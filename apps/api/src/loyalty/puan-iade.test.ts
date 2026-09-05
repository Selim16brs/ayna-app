import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  PUAN_HARCAMA_SEBEBI,
  PUAN_IADE_SEBEBI,
  iadeEdilecekNakit,
  randevuPuaniniIadeEt,
} from './puan-iade';

/**
 * PUAN NAKDE ÇEVRİLEMEZ — ama kaybolmaz da.
 *
 * Müşteri depozitonun bir kısmını puanla ödeyebiliyor. İade hakkı doğduğunda
 * iade tutarı DEPOZİTONUN TAMAMIYDI: müşteri randevu alır, %25'ini puanla
 * öder, ücretsiz iptal penceresinde iptal eder ve tamamını NAKİT geri alırdı.
 * Puanı paraya çevirmenin kapısı buydu.
 */

type Kayit = Record<string, unknown>;

function sahtePrisma(defter: Kayit[] = []) {
  const yazilan: Kayit[] = [];
  const prisma = {
    loyaltyEntry: {
      findMany: ({ where }: { where: { detail: string; reason: { in: string[] } } }) =>
        Promise.resolve(
          defter.filter(
            (d) => d.detail === where.detail && where.reason.in.includes(String(d.reason)),
          ),
        ),
      createMany: ({ data }: { data: Kayit[] }) => {
        yazilan.push(...data);
        defter.push(...data);
        return Promise.resolve({ count: data.length });
      },
    },
    setting: { findMany: () => Promise.resolve([]), findUnique: () => Promise.resolve(null) },
    auditLog: { create: () => Promise.resolve({}) },
  };
  return { prisma: prisma as never, yazilan, defter };
}

const harcama = (bookingId: string, puan: number) => ({
  detail: bookingId,
  reason: PUAN_HARCAMA_SEBEBI,
  points: -puan,
});

test('NAKİT İADE puanla ödenen kısmı içermiyor', () => {
  // 2.000 ₸ depozito, 500'ü puanla → nakit iade 1.500 ₸.
  assert.equal(iadeEdilecekNakit(2000, 500), 1500);
  assert.equal(iadeEdilecekNakit(2000, 0), 2000);
});

test('depozitonun TAMAMI puanla ödendiyse nakit iade YOK', () => {
  assert.equal(iadeEdilecekNakit(2000, 2000), 0);
});

test('bozuk veri KASADAN PARA ÇIKARMIYOR', () => {
  // Puan tutarı depozitoyu aşamaz ama veri bozulsa bile negatif iade olmasın.
  assert.equal(iadeEdilecekNakit(2000, 5000), 0);
  assert.equal(iadeEdilecekNakit(null, 100), 0);
  assert.equal(iadeEdilecekNakit('abc', 100), 0);
});

test('harcanan puan İADE EDİLİYOR', async () => {
  const { prisma, yazilan } = sahtePrisma([harcama('b1', 500)]);
  const iade = await randevuPuaniniIadeEt(prisma, 'b1', 'u1');
  assert.equal(iade, 500);
  assert.equal(yazilan[0]!.points, 500);
  assert.equal(yazilan[0]!.reason, PUAN_IADE_SEBEBI);
  assert.equal(yazilan[0]!.detail, 'b1');
});

test('İKİNCİ çağrı puanı bir daha yazmıyor', async () => {
  // İptal + iade talebi gibi iki ayrı yol aynı randevuya dokunabiliyor.
  const { prisma, yazilan } = sahtePrisma([harcama('b1', 500)]);
  await randevuPuaniniIadeEt(prisma, 'b1', 'u1');
  const ikinci = await randevuPuaniniIadeEt(prisma, 'b1', 'u1');
  assert.equal(ikinci, 0, 'çift iade — bedava puan basılıyor');
  assert.equal(yazilan.length, 1);
});

test('YENİDEN HARCANAN puan yeniden iade edilebiliyor', async () => {
  /*
   * Sahte dekont geri alınıyor → puan iade ediliyor → müşteri doğru dekontu
   * puanla yeniden yüklüyor → yeni harcama. Basit bir "daha önce iade
   * edildi mi" kontrolü ikinci harcamayı sonsuza kadar iade edilemez
   * yapardı; hesap DEFTERDEN türetiliyor.
   */
  const { prisma, defter } = sahtePrisma([harcama('b1', 500)]);
  assert.equal(await randevuPuaniniIadeEt(prisma, 'b1', 'u1'), 500);
  defter.push(harcama('b1', 300)); // ikinci yükleme
  assert.equal(await randevuPuaniniIadeEt(prisma, 'b1', 'u1'), 300);
});

test('harcama yoksa iade de yok', async () => {
  const { prisma, yazilan } = sahtePrisma([]);
  assert.equal(await randevuPuaniniIadeEt(prisma, 'b1', 'u1'), 0);
  assert.equal(yazilan.length, 0);
});

test('sahipsiz randevuda iade yazılmıyor', async () => {
  const { prisma, yazilan } = sahtePrisma([harcama('b1', 500)]);
  assert.equal(await randevuPuaniniIadeEt(prisma, 'b1', null), 0);
  assert.equal(yazilan.length, 0);
});
