import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ilkRandevuOdulu, uzmanGelmediOdulu, yorumOdulu } from './olay-odulleri';
import { EARN_RULES } from './earn-rules';

/**
 * PUAN YALNIZ GERÇEK OLAYDAN KAZANILIR.
 *
 * Kurucu: "puan ekonomisini kontrol ettim ve orda kullanıcının
 * gerçekleştirmediği şeylerden puan kazandığını düşünüyorum... dürüst
 * çalışmamız lazım."
 *
 * CANLI VERİTABANI DENETİMİ ONU HAKLI ÇIKARDI:
 *   provider_noshow  1000 puan — `no_show_uzman` randevusu SIFIR
 *   review           6 ödül (240) — gerçek yorum sayısı 1
 *   first_booking     300 puan — 1 tamamlanmış randevu (tek doğru olan)
 *
 * 1200 puan (= 1200 ₸) karşılıksızdı. Sebep: `POST /loyalty/earn`
 * istemcinin BEYANINA inanıyordu; tutarı ve günlük adedi denetliyor ama
 * olayın olup olmadığını hiç sormuyordu.
 */

function prismaSahte(over: Record<string, unknown> = {}) {
  const yazilan: Record<string, unknown>[] = [];
  return {
    yazilan,
    prisma: {
      rating: { findFirst: () => Promise.resolve(over['rating'] ?? null) },
      booking: {
        findFirst: () => Promise.resolve(over['tamamlanan'] ?? null),
        findUnique: () => Promise.resolve(over['booking'] ?? null),
      },
      loyaltyEntry: {
        findFirst: () => Promise.resolve(over['zaten'] ?? null),
        createMany: ({ data }: { data: unknown[] }) => {
          yazilan.push(...(data as Record<string, unknown>[]));
          return Promise.resolve({});
        },
      },
      setting: { findUnique: () => Promise.resolve(null), findMany: () => Promise.resolve([]) },
      auditLog: { create: () => Promise.resolve({}) },
    },
  };
}

/* ── İSTEMCİ BEYANI ────────────────────────────────────────────────────── */

test('istemci beyanıyla kazanılabilen sebep KALMADI', () => {
  /*
   * Bu tablo doluyken giriş yapmış herhangi biri "uzman gelmedi" deyip
   * günde 2000 ₸ basabiliyordu. Puan bir ödemenin %50'sini karşıladığı için
   * bu gerçek para demek.
   */
  assert.equal(
    EARN_RULES.size,
    0,
    `istemcinin talep edebildiği sebep var: ${[...EARN_RULES.keys()]}`,
  );
});

/* ── YORUM ─────────────────────────────────────────────────────────────── */

test('yorum YOKSA puan yok', () => {
  const { prisma, yazilan } = prismaSahte({ rating: null });
  return yorumOdulu(prisma as never, 'u1', 'b1').then(() => {
    assert.equal(yazilan.length, 0, 'yorum olmadan puan yazıldı');
  });
});

test('yorum VARSA puan yazılıyor', async () => {
  const { prisma, yazilan } = prismaSahte({ rating: { id: 'r1' } });
  await yorumOdulu(prisma as never, 'u1', 'b1');
  assert.equal(yazilan.length, 1);
  assert.equal(yazilan[0]!['points'], 40);
  // Olay kimliği kayda giriyor: tekrarı bununla engelleniyor.
  assert.equal(yazilan[0]!['detail'], 'b1');
});

test('AYNI yorum ikinci kez puan üretmiyor', async () => {
  /*
   * Canlıda 1 yoruma 6 ödül çıkmasının sebebi tam olarak buydu: her
   * "değerlendir" dokunuşu yeni bir kazanım yazıyordu.
   */
  const { prisma, yazilan } = prismaSahte({ rating: { id: 'r1' }, zaten: { id: 'l1' } });
  await yorumOdulu(prisma as never, 'u1', 'b1');
  assert.equal(yazilan.length, 0, 'aynı olaydan ikinci puan yazıldı');
});

/* ── İLK RANDEVU ───────────────────────────────────────────────────────── */

test('TAMAMLANMIŞ randevu yoksa ilk randevu puanı yok', async () => {
  const { prisma, yazilan } = prismaSahte({ tamamlanan: null });
  await ilkRandevuOdulu(prisma as never, 'u1');
  assert.equal(yazilan.length, 0);
});

test('tamamlanmış randevu varsa bir kez veriliyor', async () => {
  const { prisma, yazilan } = prismaSahte({ tamamlanan: { id: 'b9' } });
  await ilkRandevuOdulu(prisma as never, 'u1');
  assert.equal(yazilan[0]!['points'], 300);
});

test('ilk randevu puanı ÖMÜR BOYU bir kez', async () => {
  const { prisma, yazilan } = prismaSahte({ tamamlanan: { id: 'b9' }, zaten: { id: 'l1' } });
  await ilkRandevuOdulu(prisma as never, 'u1');
  assert.equal(yazilan.length, 0);
});

/* ── UZMAN GELMEDİ (en kritik: 1000 ₸) ─────────────────────────────────── */

test('randevu no_show_uzman DEĞİLSE telafi puanı YOK', async () => {
  /*
   * Denetimde bulunan asıl ihlal: 1000 puan verilmiş, o kullanıcının
   * `no_show_uzman` durumunda hiç randevusu yok.
   */
  for (const durum of ['kesinlesti', 'tamamlandi', 'iptal_musteri', 'no_show_musteri']) {
    const { prisma, yazilan } = prismaSahte({ booking: { id: 'b1', userId: 'u1', status: durum } });
    await uzmanGelmediOdulu(prisma as never, 'b1');
    assert.equal(yazilan.length, 0, `${durum} durumunda telafi puanı yazıldı`);
  }
});

test('randevu gerçekten no_show_uzman ise telafi veriliyor', async () => {
  const { prisma, yazilan } = prismaSahte({
    booking: { id: 'b1', userId: 'u1', status: 'no_show_uzman' },
  });
  await uzmanGelmediOdulu(prisma as never, 'b1');
  assert.equal(yazilan[0]!['points'], 1000);
  assert.equal(yazilan[0]!['detail'], 'b1');
});

test('aynı randevudan ikinci telafi yok', async () => {
  const { prisma, yazilan } = prismaSahte({
    booking: { id: 'b1', userId: 'u1', status: 'no_show_uzman' },
    zaten: { id: 'l1' },
  });
  await uzmanGelmediOdulu(prisma as never, 'b1');
  assert.equal(yazilan.length, 0);
});

test('randevu yoksa telafi yok', async () => {
  const { prisma, yazilan } = prismaSahte({ booking: null });
  await uzmanGelmediOdulu(prisma as never, 'b1');
  assert.equal(yazilan.length, 0);
});

/* ── İSTEMCİ ARTIK PUAN İSTEMİYOR ──────────────────────────────────────── */

test('mobil uygulama kendi puan talebini GÖNDERMİYOR', () => {
  const kod = readFileSync(
    join(import.meta.dirname, '..', '..', '..', 'mobile', 'src', 'store.ts'),
    'utf8',
  )
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*'))
    .join('\n');
  for (const sebep of [
    'rewards.earn.provider_noshow',
    'rewards.earn.review',
    'rewards.earn.first_booking',
    'rewards.earn.w2w_like',
  ]) {
    assert.equal(kod.includes(sebep), false, `istemci hâlâ ${sebep} için puan istiyor`);
  }
});
