import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { SpecialistsService, hizmetSatirlariniNormalle } from './specialists.service';

/**
 * HİZMET SATIRLARI — brief §4.1.
 *
 * "Seçilen her alt hizmet altında uzman KENDİ hizmetlerini manuel ekler:
 * serbest ad + fiyat + süre (şablon yok)." Katalog bağı zorunlu.
 */

test('uzmanın KENDİ adı korunuyor — katalog etiketiyle değiştirilmiyor', () => {
  /*
   * Brief "şablon yok" diyor. Adı katalogdan yazsaydık uzman "Kök
   * boyası" ile "Tam boya"yı ayırt edemez, ikisi de "Boya" görünürdü.
   */
  const [r] = hizmetSatirlariniNormalle([
    { serviceId: 'hair.coloring', name: 'Kök boyası', price: 15000, durationMin: 60 },
  ]);
  assert.equal(r!.name, 'Kök boyası');
  assert.equal(r!.serviceId, 'hair.coloring');
});

test('AYNI alt hizmet altında BİRDEN ÇOK satır durabiliyor', () => {
  // Şablonun kalkmasının tüm anlamı bu.
  const rows = hizmetSatirlariniNormalle([
    { serviceId: 'hair.coloring', name: 'Kök boyası', price: 15000, durationMin: 60 },
    { serviceId: 'hair.coloring', name: 'Tam boya', price: 25000, durationMin: 120 },
  ]);
  assert.equal(rows.length, 2);
  assert.deepEqual(
    rows.map((r) => r.name),
    ['Kök boyası', 'Tam boya'],
  );
});

test('KATALOĞA BAĞLANMAYAN satır SAKLANMIYOR', () => {
  /*
   * Bağsız hizmet aramada, talep eşleşmesinde ve "Yakında" hesabında
   * görünmez. Kaydetmek, çalışmayan bir şeyi çalışıyor gibi göstermek
   * olurdu — uzman yazdığını sanar, müşteri hiç bulamaz.
   */
  assert.deepEqual(
    hizmetSatirlariniNormalle([
      { name: 'Roza özel paketi', price: 20000, durationMin: 90 },
      { serviceId: 'boyle.bir.hizmet.yok', name: 'X', price: 1000, durationMin: 30 },
      { serviceId: 'hair', name: 'Kategori bağı yeterli değil', price: 1000, durationMin: 30 },
    ]),
    [],
  );
});

test('ADSIZ ya da FİYATSIZ satır saklanmıyor', () => {
  // Müşteriye adsız bir hizmet ya da 0 ₸ göstermek, yarım kalmış bir
  // kaydı gerçek bir teklif gibi sunmaktır.
  assert.deepEqual(
    hizmetSatirlariniNormalle([
      { serviceId: 'nails.manicure', name: '   ', price: 6000, durationMin: 45 },
      { serviceId: 'nails.manicure', name: 'Klasik', price: 0, durationMin: 45 },
      { serviceId: 'nails.manicure', name: 'Klasik', price: -5, durationMin: 45 },
      { serviceId: 'nails.manicure', name: 'Klasik', price: 'çok', durationMin: 45 },
    ]),
    [],
  );
});

test('SÜRE eksikse hizmet düşürülmüyor — makul varsayılana geçiyor', () => {
  /*
   * Ad ve fiyat varsa teklif gerçek. Süreyi diye satırı atmak, uzmanın
   * gerçekten sunduğu hizmeti menüden silmek olurdu; randevu ekranının
   * ise bir sayıya ihtiyacı var.
   */
  const [r] = hizmetSatirlariniNormalle([
    { serviceId: 'skin.facial', name: 'Bakım', price: 12000 },
  ]);
  assert.equal(r!.durationMin, 60);
});

test('ESKİ kayıt biçimi (`id`) hâlâ okunuyor', () => {
  const [r] = hizmetSatirlariniNormalle([
    { id: 'hair.haircut', name: 'Kesim', price: 9000, durationMin: 60 },
  ]);
  assert.equal(r!.serviceId, 'hair.haircut');
});

test('bozuk girdi çökertmiyor', () => {
  assert.deepEqual(hizmetSatirlariniNormalle([null, 42, 'metin', [], {}] as never), []);
  assert.deepEqual(hizmetSatirlariniNormalle([]), []);
});

test('çok uzun ad kırpılıyor', () => {
  // Sınırsız metin listeyi ve randevu kartını bozar.
  const [r] = hizmetSatirlariniNormalle([
    { serviceId: 'hair.haircut', name: 'x'.repeat(500), price: 100, durationMin: 30 },
  ]);
  assert.equal(r!.name.length, 120);
});

/**
 * ── NORMALLEŞTİRME GERÇEKTEN ÇAĞRILIYOR MU ──────────────────────────────
 *
 * Yukarıdaki testler saf fonksiyonu sınıyor. Fonksiyon doğru olup da
 * ÇAĞRILMAZSA hiçbir şey değişmez: bağsız satırlar yine kaydedilir ve
 * hiçbir test bunu görmez. Aşağıdaki iki test o halkayı bağlıyor.
 */
function servis() {
  const yazilan: { servicesJson?: string; sectors?: string[] } = {};
  const prisma = {
    specialist: {
      findUnique: () => Promise.resolve({ proId: 'p1' }),
      update: () => Promise.resolve({}),
    },
    business: { findFirst: () => Promise.resolve(null) },
    professional: {
      findUnique: () => Promise.resolve({ id: 'p1', servicesJson: '[]' }),
      update: (a: { data: { servicesJson?: string; sectors?: string[] } }) => {
        Object.assign(yazilan, a.data);
        return Promise.resolve({ id: 'p1', servicesJson: a.data.servicesJson ?? '[]' });
      },
    },
  };
  const svc = new SpecialistsService(
    prisma as never,
    {} as never,
    {} as never,
    { tara: () => Promise.resolve() } as never,
    {} as never,
  );
  return { svc, yazilan };
}

test('setMyServices BAĞSIZ satırı veritabanına yazmıyor', async () => {
  const { svc, yazilan } = servis();
  await svc.setMyServices('u1', [
    { serviceId: 'hair.coloring', name: 'Kök boyası', price: 15000, durationMin: 60 },
    { name: 'Roza özel paketi', price: 20000, durationMin: 90 },
    { serviceId: 'nails.manicure', name: '', price: 6000, durationMin: 45 },
  ]);
  const kaydedilen = JSON.parse(yazilan.servicesJson ?? '[]') as { name: string }[];
  assert.deepEqual(
    kaydedilen.map((x) => x.name),
    ['Kök boyası'],
    'bağsız ya da yarım satır kaydedildi',
  );
});

test('setMyServices ALAN SETİNİ kaydedilen satırlardan türetiyor', async () => {
  // Bağsız satır alan üretemez; üretseydi uzman hiçbir aramayla
  // eşleşmeyen bir kategoride görünürdü.
  const { svc, yazilan } = servis();
  await svc.setMyServices('u1', [
    { serviceId: 'hair.coloring', name: 'Kök boyası', price: 15000, durationMin: 60 },
    { name: 'Roza paketi', price: 1000, durationMin: 30 },
  ]);
  assert.deepEqual(yazilan.sectors, ['hair']);
});

test('UZMAN KAYDI da normalleştiriyor', () => {
  /*
   * Kayıt yolu tam bir hesap kurmayı gerektiriyor (kullanıcı, şifre,
   * jeton); davranışsal test için stub maliyeti gerçek faydasından
   * büyük. Bu yüzden KAYNAK kontrolü: kayıt satırları normalleştiriciden
   * geçmeli.
   *
   * Geçmezse bağsız hizmet doğrudan `servicesJson`a yazılır ve o uzman
   * hiç eşleşmeyen bir hizmetle yayına girer. `setMyServices` yolu
   * yukarıda DAVRANIŞSAL olarak sınanıyor.
   */
  const kaynak = readFileSync(join(import.meta.dirname, 'specialists.service.ts'), 'utf8');
  const kayit = kaynak.slice(0, kaynak.indexOf('async myServices'));
  assert.match(
    kayit,
    /const hizmetler = hizmetSatirlariniNormalle\(input\.services \?\? \[\]\)/,
    'kayıt satırları normalleştirilmiyor',
  );
  assert.match(
    kayit,
    /servicesJson: JSON\.stringify\(hizmetler\)/,
    'normalleşmemiş liste yazılıyor',
  );
});
