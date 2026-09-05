import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  CASHBACK_REASON,
  DEFAULT_CASHBACK_PCT,
  REFERRAL_POINTS,
  REFERRAL_REASON,
  cashbackPoints,
  grantCompletionCashback,
} from './completion-rewards';

test('geri kazanım oranı brief §5 ile aynı (%1)', () => {
  // Brief §5: "Kazanım = hizmet bedelinin %1'i". §10 eski "%15 + %3 cashback"
  // modelini açıkça geçersiz ilan ediyor.
  assert.equal(DEFAULT_CASHBACK_PCT, 1);
});

test('cashbackPoints: %3', () => {
  assert.equal(cashbackPoints(20_000, 3), 600);
  assert.equal(cashbackPoints(15_000, 3), 450);
});

test('cashbackPoints aşağı yuvarlar — fazla puan basılmaz', () => {
  assert.equal(cashbackPoints(999, 3), 29); // 29,97
  assert.equal(cashbackPoints(100, 3), 3);
  assert.equal(cashbackPoints(33, 3), 0); // 0,99 → 0
});

test('cashbackPoints geçersiz girdide 0', () => {
  for (const p of [0, -100, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.equal(cashbackPoints(p, 3), 0, `fiyat ${p}`);
  }
  for (const o of [0, -3, Number.NaN]) {
    assert.equal(cashbackPoints(20_000, o), 0, `oran ${o}`);
  }
});

// ── grantCompletionCashback ─────────────────────────────────────────────────

// Geri kazanımın ÖN KOŞULU müşterinin ödeme beyanı (kurucu, 05.09.2026).
// Testlerin çoğu beyan edilmiş bir randevuyu anlatıyor; damga tek yerde.
const BEYAN = new Date('2026-09-05T10:00:00Z');

function sahtePrisma(mevcut: string[] = [], pct: number | null = null) {
  const yazilanlar: Array<{ userId: string; points: number; detail: string }> = [];
  const prisma = {
    // Kod artık her kazanımda denetim kaydı yazıyor; sahte istemci de taşımalı.
    auditLog: { create: async () => ({}) },
    setting: {
      findUnique: async () => (pct === null ? null : { intValue: pct }),
      findMany: async () => [],
    },
    loyaltyEntry: {
      findMany: async ({ where }: { where: { detail: { in: string[] } } }) =>
        where.detail.in.filter((d) => mevcut.includes(d)).map((detail) => ({ detail })),
      createMany: async ({ data }: { data: unknown[] }) => {
        yazilanlar.push(...(data as typeof yazilanlar));
        return { count: data.length };
      },
    },
  };
  return { prisma: prisma as never, yazilanlar };
}

test('tamamlanan randevu geri kazanım üretir', async () => {
  const { prisma, yazilanlar } = sahtePrisma();
  await grantCompletionCashback(prisma, [
    { id: 'b1', userId: 'u1', price: 20_000, balanceDeclaredAt: BEYAN },
  ]);
  assert.equal(yazilanlar.length, 1);
  // Brief §5 — %1: 20.000 ₸ hizmette 200 puan (eskiden %3 → 600).
  assert.equal(yazilanlar[0]!.points, 200);
  assert.equal(yazilanlar[0]!.detail, 'b1', 'randevu kimliği ayırt edici anahtar');
});

test('AYNI randevu iki kez kazanım üretmez', async () => {
  // Randevu hem müşteri teyidiyle hem zamanlayıcıyla completed olabilir.
  const { prisma, yazilanlar } = sahtePrisma(['b1']);
  await grantCompletionCashback(prisma, [
    { id: 'b1', userId: 'u1', price: 20_000, balanceDeclaredAt: BEYAN },
  ]);
  assert.equal(yazilanlar.length, 0, 'çift yazım puanı ikiye katlardı');
});

test('toplu çağrıda yalnız yazılmamış olanlar yazılır', async () => {
  const { prisma, yazilanlar } = sahtePrisma(['b1']);
  await grantCompletionCashback(prisma, [
    { id: 'b1', userId: 'u1', price: 20_000, balanceDeclaredAt: BEYAN },
    { id: 'b2', userId: 'u2', price: 10_000, balanceDeclaredAt: BEYAN },
  ]);
  assert.deepEqual(
    yazilanlar.map((y) => y.detail),
    ['b2'],
  );
});

test('sahipsiz (offline) randevu kazanım üretmez', async () => {
  const { prisma, yazilanlar } = sahtePrisma();
  await grantCompletionCashback(prisma, [
    { id: 'b1', userId: null, price: 20_000, balanceDeclaredAt: BEYAN },
  ]);
  assert.equal(yazilanlar.length, 0);
});

test('sıfıra yuvarlanan kazanım defteri kirletmez', async () => {
  const { prisma, yazilanlar } = sahtePrisma();
  await grantCompletionCashback(prisma, [
    { id: 'b1', userId: 'u1', price: 30, balanceDeclaredAt: BEYAN },
  ]);
  assert.equal(yazilanlar.length, 0);
});

test('admin oranı uygulanır', async () => {
  const { prisma, yazilanlar } = sahtePrisma([], 10);
  await grantCompletionCashback(prisma, [
    { id: 'b1', userId: 'u1', price: 20_000, balanceDeclaredAt: BEYAN },
  ]);
  assert.equal(yazilanlar[0]!.points, 2_000);
});

test('oran 0 ise geri kazanım kapanır', async () => {
  const { prisma, yazilanlar } = sahtePrisma([], 0);
  await grantCompletionCashback(prisma, [
    { id: 'b1', userId: 'u1', price: 20_000, balanceDeclaredAt: BEYAN },
  ]);
  assert.equal(yazilanlar.length, 0);
});

test('boş liste sorgu bile açmaz', async () => {
  const { prisma, yazilanlar } = sahtePrisma();
  assert.equal(await grantCompletionCashback(prisma, []), 0);
  assert.equal(yazilanlar.length, 0);
});

test('BEYAN EDİLMEMİŞ randevu puan üretmez — kurucu: "basmazsa kazanamaz"', async () => {
  const { prisma, yazilanlar } = sahtePrisma();
  // Uzman sessiz kaldığında zamanlayıcı randevuyu 24 saat sonra kendiliğinden
  // kapatıyor. Müşteri hiçbir şey beyan etmemişken puan yazılırsa "ödeme
  // yaptım"a basmak anlamsızlaşır ve puan bedavaya dağıtılırdı.
  await grantCompletionCashback(prisma, [{ id: 'b1', userId: 'u1', price: 20_000 }]);
  assert.equal(yazilanlar.length, 0);
  await grantCompletionCashback(prisma, [
    { id: 'b1', userId: 'u1', price: 20_000, balanceDeclaredAt: null },
  ]);
  assert.equal(yazilanlar.length, 0);
});

test('puan REZERVASYON fiyatından değil, ÖDENEN tutardan doğar', async () => {
  const { prisma, yazilanlar } = sahtePrisma();
  // Kasada fiyat 20.000 → 30.000 oldu; %1 geri kazanım 300 puan olmalı.
  await grantCompletionCashback(prisma, [
    { id: 'b1', userId: 'u1', price: 20_000, finalPrice: 30_000, balanceDeclaredAt: BEYAN },
  ]);
  assert.equal(yazilanlar[0]!.points, 300);
});

test('fiyat DÜŞTÜYSE puan da düşer', async () => {
  const { prisma, yazilanlar } = sahtePrisma();
  await grantCompletionCashback(prisma, [
    { id: 'b1', userId: 'u1', price: 20_000, finalPrice: 10_000, balanceDeclaredAt: BEYAN },
  ]);
  assert.equal(yazilanlar[0]!.points, 100);
});

test('kazanım sebebi sabit — rapor ve tekillik buna dayanıyor', () => {
  assert.equal(CASHBACK_REASON, 'rewards.earn.cashback');
});

// ── D9 referans ödülü ───────────────────────────────────────────────────────
// Ödemenin kendisi gerçek veritabanında 15 senaryoyla sınandı (damga, çift
// ödeme, eşzamanlılık, silinmiş davet eden). Buradaki testler kuralın
// sayısal sabitlerini kilitler.

test('referans ödülü 300 puan', () => {
  assert.equal(REFERRAL_POINTS, 300);
});

test('referans kazanım sebebi sabit — geçmiş kayıtlarla aynı anahtar', () => {
  assert.equal(REFERRAL_REASON, 'rewards.earn.referral');
});
