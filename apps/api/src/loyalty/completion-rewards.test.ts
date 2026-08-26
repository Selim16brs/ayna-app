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

test('geri kazanım oranı ekrandaki vaatle aynı (%3)', () => {
  assert.equal(DEFAULT_CASHBACK_PCT, 3);
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
  await grantCompletionCashback(prisma, [{ id: 'b1', userId: 'u1', price: 20_000 }]);
  assert.equal(yazilanlar.length, 1);
  assert.equal(yazilanlar[0]!.points, 600);
  assert.equal(yazilanlar[0]!.detail, 'b1', 'randevu kimliği ayırt edici anahtar');
});

test('AYNI randevu iki kez kazanım üretmez', async () => {
  // Randevu hem müşteri teyidiyle hem zamanlayıcıyla completed olabilir.
  const { prisma, yazilanlar } = sahtePrisma(['b1']);
  await grantCompletionCashback(prisma, [{ id: 'b1', userId: 'u1', price: 20_000 }]);
  assert.equal(yazilanlar.length, 0, 'çift yazım puanı ikiye katlardı');
});

test('toplu çağrıda yalnız yazılmamış olanlar yazılır', async () => {
  const { prisma, yazilanlar } = sahtePrisma(['b1']);
  await grantCompletionCashback(prisma, [
    { id: 'b1', userId: 'u1', price: 20_000 },
    { id: 'b2', userId: 'u2', price: 10_000 },
  ]);
  assert.deepEqual(
    yazilanlar.map((y) => y.detail),
    ['b2'],
  );
});

test('sahipsiz (offline) randevu kazanım üretmez', async () => {
  const { prisma, yazilanlar } = sahtePrisma();
  await grantCompletionCashback(prisma, [{ id: 'b1', userId: null, price: 20_000 }]);
  assert.equal(yazilanlar.length, 0);
});

test('sıfıra yuvarlanan kazanım defteri kirletmez', async () => {
  const { prisma, yazilanlar } = sahtePrisma();
  await grantCompletionCashback(prisma, [{ id: 'b1', userId: 'u1', price: 30 }]);
  assert.equal(yazilanlar.length, 0);
});

test('admin oranı uygulanır', async () => {
  const { prisma, yazilanlar } = sahtePrisma([], 10);
  await grantCompletionCashback(prisma, [{ id: 'b1', userId: 'u1', price: 20_000 }]);
  assert.equal(yazilanlar[0]!.points, 2_000);
});

test('oran 0 ise geri kazanım kapanır', async () => {
  const { prisma, yazilanlar } = sahtePrisma([], 0);
  await grantCompletionCashback(prisma, [{ id: 'b1', userId: 'u1', price: 20_000 }]);
  assert.equal(yazilanlar.length, 0);
});

test('boş liste sorgu bile açmaz', async () => {
  const { prisma, yazilanlar } = sahtePrisma();
  assert.equal(await grantCompletionCashback(prisma, []), 0);
  assert.equal(yazilanlar.length, 0);
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
