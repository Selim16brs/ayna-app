import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { ReguleUyariService } from './regule-uyari.service';

/**
 * REGÜLE HİZMET KUYRUĞU — brief §5.
 *
 * "Uzman, manuel hizmet adına bu işlemleri yazarsa admin panelde
 * moderasyon kuyruğuna düşer."
 *
 * Brief "düşer" diyor, "reddedilir" DEMİYOR. Anahtar kelime taraması hata
 * yapar; otomatik reddetme meşru bir uzmanın kaydını sessizce boşa
 * çıkarırdı. Bu dosyanın en önemli testi tam olarak bunu koruyor.
 */

interface Yazilan {
  createMany?: { data: { proId: string; serviceName: string; reason: string }[] };
  deleteMany?: unknown;
}

function servis(hata = false) {
  const yazilan: Yazilan = {};
  const prisma = {
    regulatedServiceFlag: {
      createMany: (a: NonNullable<Yazilan['createMany']>) => {
        if (hata) return Promise.reject(new Error('veritabanı yok'));
        yazilan.createMany = a as never;
        return Promise.resolve({ count: 0 });
      },
      deleteMany: (a: unknown) => {
        if (hata) return Promise.reject(new Error('veritabanı yok'));
        yazilan.deleteMany = a;
        return Promise.resolve({ count: 0 });
      },
      count: () => Promise.resolve(3),
      findMany: () =>
        Promise.resolve([
          {
            id: 'f1',
            proId: 'p1',
            serviceName: 'Dudak dolgusu',
            reason: 'Enjeksiyon (dolgu)',
            createdAt: new Date('2026-09-03T10:00:00Z'),
            professional: { id: 'p1', name: 'Aigul', city: 'Almatı' },
          },
        ]),
      update: (a: unknown) => Promise.resolve(a),
    },
  };
  return { svc: new ReguleUyariService(prisma as never), yazilan };
}

test('regüle ad kuyruğa düşüyor', async () => {
  const { svc, yazilan } = servis();
  await svc.tara('p1', [
    { id: 'hair.haircut', name: 'Kesim' },
    { serviceId: null, name: 'Dudak dolgusu' },
  ]);
  assert.deepEqual(yazilan.createMany?.data, [
    { proId: 'p1', serviceName: 'Dudak dolgusu', reason: 'Enjeksiyon (dolgu)' },
  ]);
});

test('meşru hizmetler kuyruğa HİÇ dokunmuyor', async () => {
  const { svc, yazilan } = servis();
  await svc.tara('p1', [
    { id: 'nails.nail_extensions', name: 'Dolgu' },
    { id: 'hair.keratin', name: 'Saç botoksu' },
    { id: 'skin.facial', name: 'Cilt beyazlatma' },
  ]);
  assert.equal(yazilan.createMany, undefined, 'meşru hizmet için satır yazıldı');
});

test('TARAMA HATASI hizmet kaydını düşürmüyor', async () => {
  /*
   * Uyarı İKİNCİL bir kayıt. Veritabanı yazımı patladığında `tara`
   * hata fırlatsaydı, çağıran taraftaki hizmet kaydı da düşerdi ve
   * uzman hizmetsiz kalırdı — regüle olmayan hizmetleri yüzünden.
   */
  const { svc } = servis(true);
  await svc.tara('p1', [{ name: 'Dudak dolgusu' }]);
  // Fırlatmadıysa test buraya geliyor.
  assert.ok(true);
});

test('AYNI ad kuyruğu şişirmiyor', () => {
  /*
   * Uzman "Hizmetlerim"i her kaydettiğinde tarama çalışıyor. Tekilliği
   * veritabanı garanti ediyor (`@@unique([proId, serviceName])`) ve
   * `skipDuplicates` çakışanı atlıyor. Şema kısıtı kalkarsa kuyruk aynı
   * uyarının kopyalarıyla dolar ve yönetici için kullanılmaz hâle gelir.
   */
  const sema = readFileSync(
    join(import.meta.dirname, '..', '..', 'prisma', 'schema.prisma'),
    'utf8',
  );
  const model = sema.slice(sema.indexOf('model RegulatedServiceFlag'));
  assert.match(
    model.slice(0, model.indexOf('\n}')),
    /@@unique\(\[proId, serviceName\]\)/,
    'aynı ad için tekillik kısıtı yok',
  );
  const kaynak = readFileSync(join(import.meta.dirname, 'regule-uyari.service.ts'), 'utf8');
  assert.match(kaynak, /skipDuplicates: true/, 'çakışan satır atlanmıyor');
});

test('ARTIK SUNULMAYAN ad için bekleyen uyarı kapanıyor', async () => {
  // Uzman "Dudak dolgusu"nu listeden sildiyse uyarının yöneticinin
  // önünde durması anlamsız.
  const { svc, yazilan } = servis();
  await svc.tara('p1', [{ id: 'hair.haircut', name: 'Kesim' }]);
  assert.deepEqual(yazilan.deleteMany, { where: { proId: 'p1', status: 'pending' } });
});

test('YÖNETİCİNİN KARAR VERDİĞİ satırlara dokunulmuyor', async () => {
  /*
   * Temizlik YALNIZ `pending` satırları siliyor. `cleared`/`removed`
   * kayıtlar denetim izi: kimin ne yazdığı ve yöneticinin ne dediği.
   * Silinselerdi aynı ad her kayıtta yeniden kuyruğa düşerdi.
   */
  const { svc, yazilan } = servis();
  await svc.tara('p1', [{ name: 'Dudak dolgusu' }]);
  const w = (yazilan.deleteMany as { where: { status?: string } }).where;
  assert.equal(w.status, 'pending', 'karar verilmiş satırlar da siliniyor');
});

test('kuyruk yöneticiye UZMANIN YAZDIĞI adı gösteriyor', async () => {
  // Karar bu ada dayanıyor; özetlemek kararı verenden kanıtı saklamak olurdu.
  const { svc } = servis();
  const [satir] = await svc.kuyruk();
  assert.equal(satir!.serviceName, 'Dudak dolgusu');
  assert.equal(satir!.reason, 'Enjeksiyon (dolgu)');
  assert.equal(satir!.proName, 'Aigul');
});

test('KAYIT ENGELLENMİYOR — tarama, kaydetmeden SONRA çalışıyor', () => {
  /*
   * Brief §5 "moderasyon kuyruğuna düşer" diyor. Tarama kaydın ÖNÜNE
   * geçseydi ve bir istisna fırlatsaydı, uzmanın hizmet listesi hiç
   * yazılmazdı. Sıra bu yüzden korunuyor.
   */
  const kaynak = readFileSync(
    join(import.meta.dirname, '..', 'specialists', 'specialists.service.ts'),
    'utf8',
  );
  const govde = kaynak.slice(kaynak.indexOf('async setMyServices'));
  const kayit = govde.indexOf('servicesJson: JSON.stringify(kesilmis)');
  const tarama = govde.indexOf('this.regule.tara(');
  assert.ok(kayit > 0 && tarama > 0, 'tarama setMyServices içinde çağrılmıyor');
  assert.ok(tarama > kayit, 'tarama kayıttan ÖNCE çalışıyor — kaydı düşürebilir');
  // Reddetme yok: kayıt akışında istisna fırlatan bir dal olmamalı.
  assert.doesNotMatch(
    govde.slice(0, govde.indexOf('\n  }\n')),
    /throw new \w*Exception[\s\S]{0,120}regule/i,
    'regüle hizmet kaydı reddediliyor — brief yalnız kuyruk istiyor',
  );
});

test('UZMAN KAYDINDA da taranıyor', () => {
  /*
   * Yalnız "Hizmetlerim" ekranında taransaydı, kayıtta regüle hizmet
   * yazıp bir daha o ekrana girmeyen uzman hiç görünmezdi.
   */
  const kaynak = readFileSync(
    join(import.meta.dirname, '..', 'specialists', 'specialists.service.ts'),
    'utf8',
  );
  const kayit = kaynak.slice(0, kaynak.indexOf('async setMyServices'));
  assert.match(kayit, /this\.regule\.tara\(/, 'uzman kaydında tarama yok');
});
