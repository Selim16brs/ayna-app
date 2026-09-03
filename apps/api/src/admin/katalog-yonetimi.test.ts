import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { KATALOG } from '@ayna/domain';
import { AdminService } from './admin.service';

/**
 * PANEL KATALOG YÖNETİMİ — brief §4.12 + §7.3.
 *
 * Panel `service_categories` satırlarını olduğu gibi gösteriyor ve
 * yönetici bunları serbestçe düzenleyebiliyordu. Katalog `@ayna/domain`e
 * taşındıktan sonra bunun ÜÇ SESSİZ YALANI oldu — hiçbiri hata vermiyor,
 * hepsi "kaydedildi" diyordu:
 *
 *   1. Ad değiştirmek hiçbir şey yapmıyordu (uygulama katalogdan okuyor).
 *   2. Silmek kendini geri alıyordu (sync açılışta geri ekliyor).
 *   3. Eklemek ölü satır üretiyordu (uygulama listeyi katalogdan kuruyor).
 */

function servis(over: { rows?: unknown[]; pros?: unknown[]; gizli?: unknown[] } = {}) {
  const yazilan: { code: string; sortOrder: number }[] = [];
  const prisma = {
    serviceCategory: {
      findMany: () => Promise.resolve(over.rows ?? []),
      findUnique: ({ where }: { where: { id?: string } }) =>
        Promise.resolve(
          (over.rows as { id: string; code: string }[] | undefined)?.find(
            (r) => r.id === where.id,
          ) ?? null,
        ),
      update: (a: unknown) => Promise.resolve(a),
      delete: () => Promise.resolve({}),
      updateMany: (a: { where: { code: string }; data: { sortOrder: number } }) => {
        yazilan.push({ code: a.where.code, sortOrder: a.data.sortOrder });
        return Promise.resolve({ count: 1 });
      },
    },
    specialist: { findMany: () => Promise.resolve(over.gizli ?? []) },
    professional: { findMany: () => Promise.resolve(over.pros ?? []) },
  };
  return { svc: new AdminService(prisma as never, {} as never, {} as never), yazilan };
}

test('liste YÖNETİCİNİN SIRASINDA geliyor', async () => {
  /*
   * Katalog sırasında dönüyordu: yönetici sırayı değiştirip kaydediyor,
   * panel yine eski dizilimi gösteriyordu. Kaydın işe yaramadığını sanıp
   * tekrar tekrar denerdi — üstelik uygulamada sıra DEĞİŞMİŞTİ.
   */
  const { svc } = servis({
    rows: [
      { id: 'r1', code: 'nails', sortOrder: 1 },
      { id: 'r2', code: 'hair', sortOrder: 2 },
    ],
  });
  const liste = await svc.categories();
  assert.equal(liste[0]!.code, 'nails', 'panel yöneticinin sırasını göstermiyor');
  assert.equal(liste[1]!.code, 'hair');
});

test('liste KATALOGDAN geliyor — panelde ölü satır yok', async () => {
  /*
   * Eskiden `service_categories` neyse o gösteriliyordu. Eski taksonomiden
   * kalan satırlar (`skincare`, `pmu`) panelde durmaya devam ederdi.
   */
  const { svc } = servis({ rows: [{ id: 'r1', code: 'olmayan_kategori', sortOrder: 1 }] });
  const liste = await svc.categories();
  assert.deepEqual(
    liste.map((c) => c.code),
    KATALOG.map((k) => k.id),
    'panel listesi katalogdan sapmış',
  );
});

test('ÜÇ DİLLİ ad gösteriliyor', async () => {
  // Kurucunun kk/ru karşılıklarını görebileceği tek yer burası.
  const { svc } = servis();
  const sac = (await svc.categories()).find((c) => c.code === 'hair')!;
  assert.equal(sac.nameTr, 'Saç');
  assert.equal(sac.nameRu, 'Волосы');
  assert.equal(sac.nameKk, 'Шаш');
});

test('ARZ DURUMU sayılıyor — brief §7.4', async () => {
  /*
   * Yöneticinin nereye uzman bulması gerektiğini görebileceği tek yer.
   * Sıfırsa o kategori müşteriye "Yakında" rozetiyle çıkıyor.
   */
  const { svc } = servis({
    pros: [
      { id: 'p1', servicesJson: JSON.stringify([{ id: 'hair.haircut' }, { id: 'hair.coloring' }]) },
    ],
  });
  const liste = await svc.categories();
  const sac = liste.find((c) => c.code === 'hair')!;
  assert.equal(sac.suppliedCount, 2);
  assert.equal(sac.serviceCount, 8);
  assert.equal(liste.find((c) => c.code === 'nails')!.suppliedCount, 0);
});

test('CEZALI uzman arz saymıyor', async () => {
  const { svc } = servis({
    pros: [{ id: 'p1', servicesJson: JSON.stringify([{ id: 'hair.haircut' }]) }],
    gizli: [{ proId: 'p1' }],
  });
  assert.equal((await svc.categories()).find((c) => c.code === 'hair')!.suppliedCount, 0);
});

test('SIRALAMA kaydediliyor — panelden değiştirilebilen tek şey', async () => {
  const { svc, yazilan } = servis();
  await svc.reorderCategories(['nails', 'hair', 'makeup']);
  assert.deepEqual(yazilan, [
    { code: 'nails', sortOrder: 1 },
    { code: 'hair', sortOrder: 2 },
    { code: 'makeup', sortOrder: 3 },
  ]);
});

test('KATALOGDA OLMAYAN kod sıralamayı YARIM uygulamıyor', async () => {
  /*
   * Yanlış kod sessizce atlansaydı sıranın bir kısmı uygulanır, bir kısmı
   * uygulanmazdı — yönetici kaydettiğini sanıp bambaşka bir sıra görürdü.
   */
  const { svc, yazilan } = servis();
  await assert.rejects(() => svc.reorderCategories(['hair', 'boyle_bir_kategori_yok']));
  assert.deepEqual(yazilan, [], 'hatalı istekte kısmen yazıldı');
});

test('kategori EKLENEMİYOR — ölü satır üretmiyor', async () => {
  await assert.rejects(
    () => servis().svc.createCategory({ code: 'yeni', nameTr: 'Yeni', icon: '✨', tone: 'rose' }),
    /katalo/i,
    'panelden kategori eklenebiliyor',
  );
});

test('katalog kategorisinin ADI değiştirilemiyor', async () => {
  /*
   * Uygulama adları katalogdan okuyor. "Kaydedildi" deyip telefonda eski
   * adı bırakan bir düğme, hiç olmayan bir düğmeden kötüdür.
   */
  const { svc } = servis({ rows: [{ id: 'r1', code: 'hair', sortOrder: 1 }] });
  await assert.rejects(() => svc.updateCategory('r1', { nameTr: 'Saç Bakımı' }), /katalo/i);
});

test('katalog kategorisi SİLİNEMİYOR — silme kendini geri alıyordu', async () => {
  // `CategorySyncService` her açılışta eksik kategorileri geri ekliyor.
  const { svc } = servis({ rows: [{ id: 'r1', code: 'hair', sortOrder: 1 }] });
  await assert.rejects(() => svc.deleteCategory('r1'), /katalo/i);
});

test('KATALOG DIŞI satır silinebiliyor — eski kalıntı temizlenebilsin', async () => {
  const { svc } = servis({ rows: [{ id: 'r9', code: 'skincare', sortOrder: 6 }] });
  assert.deepEqual(await svc.deleteCategory('r9'), { deleted: true });
});

test('PANEL ekranında ad ve ekleme kutuları YOK', () => {
  /*
   * Sunucu reddediyor ama panel formu duruyorsa yönetici yine deneyip
   * hata alır. Çalışmayan kutuyu göstermemek, reddetmekten iyidir.
   */
  const sayfa = readFileSync(
    join(import.meta.dirname, '..', '..', '..', 'web-admin', 'app', 'page.tsx'),
    'utf8',
  );
  const ekran = sayfa.slice(
    sayfa.indexOf('function ServicesView'),
    sayfa.indexOf('function PricesView'),
  );
  assert.doesNotMatch(ekran, /createCategory/, 'kategori ekleme formu duruyor');
  assert.doesNotMatch(ekran, /deleteCategory/, 'silme düğmesi duruyor');
  assert.doesNotMatch(ekran, /nameTr:/, 'ad düzenleme kutusu duruyor');
  assert.match(ekran, /api\.reorderCategories/, 'sıralama kaydedilmiyor');
});
