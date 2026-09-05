import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { SEHIRLER, kanonikSehir } from '@ayna/domain';
import { SpecialistsService } from './specialists.service';

/**
 * KONUM KAYDI ŞEHRİ KANONİK YAZIMA ÇEVİRİYOR.
 *
 * Ters geocode Kazakistan'da Rusça ad döndürüyor ('Алматы') ve bu ham hâliyle
 * yazılıyordu. Uygulamanın şehir seçicisi Türkçe yazımı kullandığı için uzman,
 * kendi şehrindeki müşterilerin keşif ekranından sessizce kayboluyordu.
 */

type Kayit = Record<string, unknown>;

function sahteOrtam() {
  const yazilan: Kayit[] = [];
  const prisma = {
    specialist: { findUnique: () => Promise.resolve({ userId: 'u1', proId: 'p1' }) },
    business: { findFirst: () => Promise.resolve(null) },
    professional: {
      update: ({ data }: { data: Kayit }) => {
        yazilan.push(data);
        return Promise.resolve({ lat: 0, lng: 0, city: data.city, district: data.district });
      },
    },
    auditLog: { create: () => Promise.resolve({}) },
  };
  const svc = new SpecialistsService(
    prisma as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
  );
  return { svc, yazilan };
}

test('RUSÇA gelen şehir kanonik yazımla kaydediliyor', async () => {
  const { svc, yazilan } = sahteOrtam();
  await svc.setMyLocation('u1', { lat: 43.2, lng: 76.9, city: 'Алматы' });
  assert.equal(yazilan[0]!.city, 'Almatı', 'ham Rusça yazım kaydediliyor — uzman kayboluyor');
});

test('KAZAKÇA ve LATİN yazımlar da çevriliyor', async () => {
  for (const [gelen, beklenen] of [
    ['Қарағанды', 'Karagandı'],
    ['Shymkent', 'Şımkent'],
    ['Нур-Султан', 'Astana'],
  ]) {
    const { svc, yazilan } = sahteOrtam();
    await svc.setMyLocation('u1', { lat: 1, lng: 1, city: gelen });
    assert.equal(yazilan[0]!.city, beklenen, `${gelen} çevrilmedi`);
  }
});

test('TANINMAYAN şehir olduğu gibi yazılıyor — uydurma yok', async () => {
  const { svc, yazilan } = sahteOrtam();
  await svc.setMyLocation('u1', { lat: 1, lng: 1, city: 'Bilinmeyen Şehir' });
  assert.equal(yazilan[0]!.city, 'Bilinmeyen Şehir');
});

test('şehir GELMEZSE mevcut kayıt silinmiyor', async () => {
  // Ters geocode boş dönebiliyor; boş yazmak uzmanın şehrini uçururdu.
  const { svc, yazilan } = sahteOrtam();
  await svc.setMyLocation('u1', { lat: 1, lng: 1 });
  assert.equal('city' in yazilan[0]!, false);
});

test('temizlik SQL’i ile KOD aynı eşlemeyi yapıyor', () => {
  /*
   * İki ayrı yerde yazılmış eşleme, zamanla ayrışır: SQL bir şehri 'Almatı'
   * derken kod 'Almaty' derse canlı veri ikiye bölünür ve kimse fark etmez.
   */
  const sql = readFileSync('prisma/pre-push/19-sehir-yazimi.sql', 'utf8');
  const ciftler = [...sql.matchAll(/\['([^']+)','([^']+)'\]/g)];
  assert.ok(ciftler.length >= 40, 'SQL eşleme tablosu beklenenden küçük');
  for (const [, ham, hedef] of ciftler) {
    assert.equal(kanonikSehir(ham), hedef, `SQL "${ham}" → "${hedef}" diyor, kod başka`);
    assert.ok(SEHIRLER.includes(hedef), `"${hedef}" kanonik listede yok`);
  }
});
