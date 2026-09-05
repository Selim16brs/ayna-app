import assert from 'node:assert/strict';
import { test } from 'node:test';
import { OffersService } from './offers.service';

/**
 * KAMPANYA ŞEHRİ — üç yazım tek şehir.
 *
 * Kampanyanın şehri, sahibinin keşif kaydından KOPYALANIYOR. O kayıt
 * haritadan işaretlenmişse şehir 'Алматы' oluyor (ters geocode Kazakistan'da
 * Rusça döner). Uygulama 'Almatı' diye sorunca düz metin eşleşmesi tutmuyor
 * ve kampanya HİÇBİR müşteriye görünmüyordu.
 *
 * Canlıda (05.09.2026) tam olarak bu vardı: aktif "Cuma İndirimi"
 * kampanyasının şehri 'Алматы', uzmanın şehri 'Almatı'.
 */

type Kayit = Record<string, unknown>;

function sahteOrtam() {
  const sorgular: Kayit[] = [];
  const prisma = {
    offer: {
      findMany: (a: { where: Kayit }) => {
        sorgular.push(a.where);
        return Promise.resolve([]);
      },
    },
    user: { findMany: () => Promise.resolve([]) },
    professional: { findMany: () => Promise.resolve([]) },
  };
  const svc = new OffersService(prisma as never, {} as never, {} as never);
  return { svc, sorgular };
}

test('şehir sorgusu TÜM YAZIMLARI kapsıyor', async () => {
  const { svc, sorgular } = sahteOrtam();
  await svc.listPublic('tr', 'Almatı');
  const where = sorgular[0]!;
  const city = where.city as { in?: string[] } | string | undefined;
  assert.ok(
    typeof city === 'object' && Array.isArray(city.in),
    'şehir hâlâ düz metin eşleşiyor — Rusça yazımlı kampanya görünmüyor',
  );
  assert.ok(city.in.includes('Almatı'), 'kanonik yazım sorguda yok');
  assert.ok(city.in.includes('Алматы'), 'Rusça yazım sorguda yok — canlıdaki hata bu');
});

test('RUSÇA sorulunca TÜRKÇE yazımlı kampanya da bulunuyor', async () => {
  const { svc, sorgular } = sahteOrtam();
  await svc.listPublic('ru', 'Алматы');
  const city = sorgular[0]!.city as { in: string[] };
  assert.ok(city.in.includes('Almatı'));
  assert.ok(city.in.includes('Алматы'));
});

test('şehir verilmezse süzgeç HİÇ eklenmiyor', async () => {
  // Boş şehri "hiçbir şey" diye süzmek, tüm kampanyaları gizlerdi.
  const { svc, sorgular } = sahteOrtam();
  await svc.listPublic('tr', undefined);
  assert.equal(sorgular[0]!.city, undefined);
});

test('TANINMAYAN şehir olduğu gibi sorulur', async () => {
  // Uydurma yok: bilinmeyen bir şehri en yakın benzerine çekmek, kullanıcıya
  // başka şehrin kampanyalarını göstermek olurdu.
  const { svc, sorgular } = sahteOrtam();
  await svc.listPublic('tr', 'Berlin');
  assert.deepEqual((sorgular[0]!.city as { in: string[] }).in, ['Berlin']);
});
