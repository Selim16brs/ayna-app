import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { grantPoints } from './loyalty.grant';
import { DEFAULT_EXPIRY_DAYS } from './loyalty.rules';

type Yazilan = { userId: string; points: number; expiresAt: Date; reason: string; kind: string };

function sahtePrisma() {
  const yazilanlar: Yazilan[] = [];
  const prisma = {
    // Kod artık her kazanımda denetim kaydı yazıyor; sahte istemci de taşımalı.
    auditLog: { create: async () => ({}) },
    setting: { findMany: async () => [] },
    loyaltyEntry: {
      createMany: async ({ data }: { data: unknown[] }) => {
        yazilanlar.push(...(data as Yazilan[]));
        return { count: data.length };
      },
    },
  };
  return { prisma: prisma as never, yazilanlar };
}

test('kazanıma son kullanma tarihi HER ZAMAN konur', async () => {
  const { prisma, yazilanlar } = sahtePrisma();
  const once = Date.now();
  await grantPoints(prisma, { userId: 'u1', reason: 'rewards.earn.welcome', points: 200 });
  assert.equal(yazilanlar.length, 1);
  const e = yazilanlar[0]!;
  assert.ok(e.expiresAt instanceof Date, 'expiresAt konmadı');
  const gun = (e.expiresAt.getTime() - once) / 86_400_000;
  assert.ok(Math.abs(gun - DEFAULT_EXPIRY_DAYS) < 0.01, `${gun} gün sonra doluyor`);
});

test('toplu kazanım: iki tarafa da aynı tarih', async () => {
  const { prisma, yazilanlar } = sahtePrisma();
  await grantPoints(prisma, [
    { userId: 'a', reason: 'rewards.earn.referral', points: 300 },
    { userId: 'b', reason: 'rewards.earn.referral', points: 300 },
  ]);
  assert.equal(yazilanlar.length, 2);
  assert.equal(yazilanlar[0]!.expiresAt.getTime(), yazilanlar[1]!.expiresAt.getTime());
});

test('kayıtlar earn olarak yazılır', async () => {
  const { prisma, yazilanlar } = sahtePrisma();
  await grantPoints(prisma, { userId: 'u1', reason: 'r', points: 5 });
  assert.equal(yazilanlar[0]!.kind, 'earn');
});

test('sıfır ve negatif kazanım defteri kirletmez', async () => {
  const { prisma, yazilanlar } = sahtePrisma();
  const n = await grantPoints(prisma, [
    { userId: 'a', reason: 'r', points: 0 },
    { userId: 'b', reason: 'r', points: -50 },
    { userId: 'c', reason: 'r', points: Number.NaN },
    { userId: 'd', reason: 'r', points: 10 },
  ]);
  assert.equal(n, 1);
  assert.equal(yazilanlar.length, 1);
  assert.equal(yazilanlar[0]!.userId, 'd');
});

test('hepsi elenirse hiç yazım yapılmaz', async () => {
  const { prisma, yazilanlar } = sahtePrisma();
  assert.equal(await grantPoints(prisma, { userId: 'a', reason: 'r', points: 0 }), 0);
  assert.equal(yazilanlar.length, 0);
});

test('ondalık puan tam sayıya indirilir', async () => {
  const { prisma, yazilanlar } = sahtePrisma();
  await grantPoints(prisma, { userId: 'a', reason: 'r', points: 40.9 });
  assert.equal(yazilanlar[0]!.points, 40);
});

// ── Kapının etrafından dolaşan yeni kod var mı? ─────────────────────────────
// K4.4'ün delinme biçimi bir çağrı yerinin expiresAt koymayı unutmasıydı
// (hoş geldin ve blog puanları tam olarak böyle hiç yanmıyordu).
//
// Kural yalnız KAZANIM yazımları için geçerli: harcama kaydında son kullanma
// tarihi zaten olmaz, o yüzden `kind: 'spend'` yazan servisler serbest.
test("kazanım (kind: 'earn') yalnız grantPoints üzerinden yazılır", () => {
  const kok = join(import.meta.dirname, '..');
  const izinli = new Set(['loyalty/loyalty.grant.ts']);

  const dosyalar: string[] = [];
  const gez = (dir: string) => {
    for (const ad of readdirSync(dir)) {
      const tam = join(dir, ad);
      if (statSync(tam).isDirectory()) gez(tam);
      else if (ad.endsWith('.ts') && !ad.endsWith('.test.ts')) dosyalar.push(tam);
    }
  };
  gez(kok);

  const ihlaller = dosyalar
    .filter((f) => {
      const src = readFileSync(f, 'utf8');
      // İki koşulu AYRI AYRI aramak yanlış alarm veriyordu: aynı dosyada
      // `loyaltyEntry.count({ kind: 'earn' })` (okuma) ile `create({ kind:
      // 'spend' })` (yazma) bir arada bulunabiliyor. Yazımın KENDİ gövdesine
      // bakılmalı.
      const yazimlar = [...src.matchAll(/loyaltyEntry\s*\.\s*(?:create|createMany)\s*\(/g)];
      return yazimlar.some((m) => /kind:\s*'earn'/.test(src.slice(m.index, m.index + 400)));
    })
    .map((f) => f.slice(kok.length + 1))
    .filter((f) => !izinli.has(f));

  assert.deepEqual(
    ihlaller,
    [],
    `Deftere doğrudan KAZANIM yazan dosya(lar): ${ihlaller.join(', ')}\n` +
      'Puan kazandırmak için grantPoints() kullan — son kullanma tarihini o koyar.',
  );
});
