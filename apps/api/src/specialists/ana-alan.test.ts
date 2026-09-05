import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { SpecialistsService } from './specialists.service';

/**
 * ANA ALAN, HİZMET VERİLEN ALANLARDAN BİRİ OLMAK ZORUNDA.
 *
 * `sectors` (hizmet verilen alanlar) her hizmet güncellemesinde yeniden
 * türetiliyordu; tekil `sector` sütunu ise KAYIT ANINDAKİ değerde kalıyordu.
 *
 * Canlıda görülen (05.09.2026): sector "makeup", sectors ["hair","nails"].
 * Uzman makyaj yapmıyor ama ana alanı makyaj görünüyor — kart uzmanlık
 * etiketini oradan okuduğu için müşteriye hiç verilmeyen bir hizmet alanı
 * yazılıyordu.
 */

type Kayit = Record<string, unknown>;

function sahteOrtam(pro: Kayit) {
  const yazilan: Kayit[] = [];
  const prisma = {
    specialist: { findUnique: () => Promise.resolve({ userId: 'u1', proId: 'p1' }) },
    business: { findFirst: () => Promise.resolve(null) },
    professional: {
      findUnique: () => Promise.resolve({ ...pro }),
      update: ({ data }: { data: Kayit }) => {
        yazilan.push(data);
        Object.assign(pro, data);
        return Promise.resolve({ ...pro, servicesJson: data.servicesJson ?? '[]' });
      },
    },
  };
  const svc = new SpecialistsService(
    prisma as never,
    { sendTemplate: () => Promise.resolve() } as never,
    { put: async (x: string) => x } as never,
    { tara: () => Promise.resolve() } as never,
    {} as never,
    {} as never,
  );
  return { svc, pro, yazilan };
}

const HIZMET = (id: string) => ({ id, name: id, price: 5000, durationMin: 60 });

test('ana alan hizmet verilen alanlarda DEĞİLSE düzeltiliyor', async () => {
  const { svc, yazilan } = sahteOrtam({ id: 'p1', sector: 'makeup', sectors: ['makeup'] });
  await svc.setMyServices('u1', [HIZMET('hair.haircut'), HIZMET('nails.manicure')]);
  const data = yazilan[0]!;
  assert.deepEqual(data.sectors, ['hair', 'nails'], 'alan seti türetilmedi');
  assert.equal(data.sector, 'hair', 'ana alan hâlâ hiç hizmet verilmeyen alanda');
});

test('ana alan HÂLÂ GEÇERLİYSE uzmanın seçimine dokunulmuyor', async () => {
  // Uzman saç + tırnak yapıyor ve ana alanını tırnak seçmiş: sıralamayı
  // ilk alana çekmek onun kendi kararını ezerdi.
  const { svc, yazilan } = sahteOrtam({ id: 'p1', sector: 'nails', sectors: ['nails'] });
  await svc.setMyServices('u1', [HIZMET('hair.haircut'), HIZMET('nails.manicure')]);
  assert.equal(yazilan[0]!.sector, undefined, 'geçerli ana alan gereksiz yere değiştirildi');
});

test('hiçbir alan türetilemezse ana alana DOKUNULMUYOR', async () => {
  // Katalog dışı kimlikler: alan seti boş çıkar. Ana alanı silmek ya da
  // rastgele bir alana çekmek, var olan tek bilgiyi kaybetmek olurdu.
  const { svc, yazilan } = sahteOrtam({ id: 'p1', sector: 'makeup', sectors: [] });
  await svc.setMyServices('u1', [HIZMET('bilinmeyen-hizmet')]);
  assert.equal(yazilan[0]!.sector, undefined);
  assert.equal(yazilan[0]!.sectors, undefined);
});

test('mevcut kayıtlar için temizlik SQL’i GUARD’LI', () => {
  /*
   * Kod düzeltmesi yalnız hizmetlerini bir daha kaydeden uzmanı kurtarır;
   * canlıdaki satır aylarca yanlış alanda kalabilir. SQL onu düzeltiyor —
   * ama guard'sız bir UPDATE, alan seti hiç türetilmemiş (boş) kayıtların
   * tek bilgisini de silerdi.
   */
  const sql = readFileSync('prisma/pre-push/18-ana-alan.sql', 'utf8');
  assert.match(sql, /UPDATE professionals/);
  assert.match(sql, /array_length\(sectors, 1\) > 0/, 'boş alan setli kayıt korunmuyor');
  assert.match(sql, /NOT \(sector = ANY\(sectors\)\)/, 'zaten geçerli ana alan da eziliyor');
});
