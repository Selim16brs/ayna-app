import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { puanHarca } from './puan-harca';

/**
 * ÇİFT HARCAMA YARIŞI KAPALI.
 *
 * Harcayan iki yol da (ödül kullanımı, depozitoda puan) oku → kontrol et →
 * yaz kalıbını kilitsiz kullanıyordu. Aynı kullanıcıdan gelen iki eşzamanlı
 * istek (telefonda çift dokunuş yeter) ikisi de aynı bakiyeyi okuyup ikisi de
 * yazabiliyordu: 1.000 puanla 1.000'lik ödül İKİ KEZ alınabiliyordu.
 *
 * Defter okuyucusu bunu `overspent` diye SAYIYORDU — yani sonucu görüyorduk,
 * sebebini engellemiyorduk.
 */

type Kayit = Record<string, unknown>;

/** Kilidi taklit eden sahte Prisma: transaction'lar SIRAYLA koşuyor. */
function sahtePrisma(defter: Kayit[]) {
  const kilitliCagrilar: string[] = [];
  let kuyruk: Promise<unknown> = Promise.resolve();
  const client = {
    $executeRaw: (...args: unknown[]) => {
      kilitliCagrilar.push(String(args[0]));
      return Promise.resolve(0);
    },
    loyaltyEntry: {
      findMany: () => Promise.resolve([...defter]),
      create: (a: { data: Kayit }) => {
        // Defter satırı TAM olmalı: bakiye yeniden okunurken `createdAt` ve
        // `expiresAt` alanları kullanılıyor.
        const satir = { expiresAt: null, createdAt: new Date(), ...a.data };
        defter.push(satir);
        return Promise.resolve(satir);
      },
    },
  };
  const prisma = {
    ...client,
    // Gerçek `FOR UPDATE` kilidinin yaptığı şey: aynı kullanıcının işlemleri
    // sıraya girer. Sahte istemci bunu kuyrukla taklit ediyor.
    $transaction: (fn: (tx: unknown) => Promise<unknown>) => {
      const sonuc = kuyruk.then(() => fn(client));
      kuyruk = sonuc.catch(() => undefined);
      return sonuc;
    },
  };
  return { prisma: prisma as never, defter, kilitliCagrilar };
}

const kazanim = (puan: number) => ({ points: puan, expiresAt: null, createdAt: new Date(0) });

test('bakiye yeterliyse harcama yazılıyor', async () => {
  const { prisma, defter } = sahtePrisma([kazanim(1000)]);
  const r = await puanHarca(prisma, { userId: 'u1', reason: 'rewards.redeem.x', points: 400 });
  assert.equal(r.ok, true);
  assert.equal(r.ok && r.harcanan, 400);
  assert.equal(defter.at(-1)!.points, -400);
});

test('bakiye YETMİYORSA hiçbir şey yazılmıyor', async () => {
  const { prisma, defter } = sahtePrisma([kazanim(300)]);
  const r = await puanHarca(prisma, { userId: 'u1', reason: 'rewards.redeem.x', points: 400 });
  assert.equal(r.ok, false);
  assert.equal(defter.length, 1, 'karşılıksız harcama yazıldı');
});

test('İKİ EŞZAMANLI harcama bakiyeyi AŞAMIYOR', async () => {
  /*
   * Asıl açık buydu: 1.000 puanla 1.000'lik iki istek. Kilitsizken ikisi de
   * geçiyor ve bakiye −1.000 oluyordu.
   */
  const { prisma, defter } = sahtePrisma([kazanim(1000)]);
  const [a, b] = await Promise.all([
    puanHarca(prisma, { userId: 'u1', reason: 'rewards.redeem.x', points: 1000 }),
    puanHarca(prisma, { userId: 'u1', reason: 'rewards.redeem.x', points: 1000 }),
  ]);
  const basarili = [a, b].filter((x) => x.ok).length;
  assert.equal(basarili, 1, 'iki istek de geçti — bakiyenin iki katı harcandı');
  const toplam = defter.reduce((n, d) => n + Number(d.points), 0);
  assert.ok(toplam >= 0, `defter eksiye düştü: ${toplam}`);
});

test('KULLANICI SATIRI kilitleniyor', async () => {
  // Kilit olmazsa yarış geri gelir; kilidin varlığı davranışla değil ancak
  // çağrının kendisiyle görülebiliyor.
  const { prisma, kilitliCagrilar } = sahtePrisma([kazanim(1000)]);
  await puanHarca(prisma, { userId: 'u1', reason: 'rewards.redeem.x', points: 10 });
  assert.ok(
    kilitliCagrilar.some((c) => /FOR UPDATE/i.test(c)),
    'kullanıcı satırı kilitlenmiyor',
  );
});

test('TAVAN HESABI kilit altındaki GÜNCEL bakiyeyle yapılıyor', async () => {
  // Depozito yolu tavanı (bakiyenin %25'i) böyle uyguluyor: eski bakiyeden
  // hesaplansaydı, araya giren bir harcamadan sonra tavan yanlış çıkardı.
  const { prisma } = sahtePrisma([kazanim(1000)]);
  const r = await puanHarca(
    prisma,
    { userId: 'u1', reason: 'rewards.spend.deposit', points: 0 },
    (bakiye) => Math.floor(bakiye / 4),
  );
  assert.equal(r.ok && r.harcanan, 250);
});

test('hesap SIFIR dönerse yazım yok', async () => {
  const { prisma, defter } = sahtePrisma([kazanim(1000)]);
  const r = await puanHarca(prisma, { userId: 'u1', reason: 'x', points: 0 }, () => 0);
  assert.equal(r.ok, false);
  assert.equal(defter.length, 1);
});

/** Yorumları eler — test kendi açıklamasıyla eşleşmesin. */
function yorumsuz(url: URL): string {
  return readFileSync(url, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
}

test('bakiye TRANSACTION İSTEMCİSİYLE okunuyor', () => {
  /*
   * Kilit `tx` içinde alınıyor. Bakiye `prisma` ile (transaction DIŞINDAN)
   * okunursa ayrı bir bağlantı kullanılır, kilidin koruduğu satırı değil
   * kilitten ÖNCEKİ hâli görür — yarış aynen geri gelir. Davranış testi bunu
   * göremiyor (sahte istemcide tek defter var), kaynak görüyor.
   */
  const kaynak = yorumsuz(new URL('./puan-harca.ts', import.meta.url));
  assert.match(
    kaynak,
    /loadLedgerState\(\s*tx as unknown as PrismaService/,
    'bakiye transaction dışından okunuyor — kilit işe yaramaz',
  );
});

test('ÖDÜL KULLANIMI kilitli kapıdan geçiyor', () => {
  // `redeem` kendi `loyaltyEntry.create` çağrısını yaparsa kilit atlanır.
  const kaynak = yorumsuz(new URL('./loyalty.service.ts', import.meta.url));
  const i = kaynak.indexOf('async redeem(');
  assert.ok(i > 0, 'redeem bulunamadı');
  const govde = kaynak.slice(i, kaynak.indexOf('\n  }\n', i));
  assert.match(govde, /puanHarca\(/, 'ödül kullanımı kilitsiz harcıyor');
  assert.doesNotMatch(
    govde,
    /loyaltyEntry\.create/,
    'ödül kullanımı deftere doğrudan yazıyor — çift harcama yarışı geri geldi',
  );
});
