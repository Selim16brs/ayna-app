import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { SpecialistsService } from './specialists.service';

/**
 * SERTİFİKALAR GERİ OKUNUYOR MU?
 *
 * Kayıtta gönderiliyor ve veritabanına yazılıyordu ama GERİ OKUYACAK UÇ
 * YOKTU — yalnız yazma vardı. Uzman profilini açtığında sertifika alanını
 * boş görüyor, hepsini yeniden yüklemesi gerekiyordu.
 *
 * Salon adresiyle AYNI SINIFTAN hata: veri sunucuda duruyor, ekran onu
 * hiç istemiyor.
 */

function servis(sertifikalar: string[] | null) {
  const prisma = {
    specialist: {
      findUnique: () =>
        Promise.resolve(sertifikalar === null ? null : { certificates: sertifikalar }),
    },
  };
  return new SpecialistsService(
    prisma as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
  );
}

test('kayıtta yüklenen sertifikalar geri geliyor', async () => {
  const r = await servis(['https://cdn/a.jpg', 'https://cdn/b.jpg']).myCertificates('u1');
  assert.deepEqual(r.certificates, ['https://cdn/a.jpg', 'https://cdn/b.jpg']);
});

test('uzman kaydı yoksa BOŞ dizi — çökmüyor', async () => {
  assert.deepEqual((await servis(null).myCertificates('u1')).certificates, []);
});

test("OKUMA UCU controller'da açık", () => {
  /*
   * Servis doğru olup da uç açılmazsa hiçbir şey değişmez: uygulama yine
   * sertifikaları isteyemez.
   */
  const kaynak = readFileSync(join(import.meta.dirname, 'specialists.controller.ts'), 'utf8');
  assert.match(kaynak, /@Get\('me\/certificates'\)/, 'okuma ucu yok');
  const i = kaynak.indexOf("@Get('me/certificates')");
  assert.match(kaynak.slice(i, i + 200), /@UseGuards\(JwtAuthGuard\)/, 'uç kimlik doğrulamasız');
});

test('BOŞ YANIT yerel listeyi EZMİYOR', () => {
  /*
   * Uzman az önce sertifika eklediyse ve istek o an düştüyse, boş bir
   * cevabın yereli silmesi yüklediklerini kaybettirirdi.
   */
  const magaza = readFileSync(
    join(import.meta.dirname, '..', '..', '..', 'mobile', 'src', 'store.ts'),
    'utf8',
  );
  assert.match(
    magaza,
    /myCertificates\(\)[\s\S]{0,220}if \(r\.certificates\.length\) set\(\{ sellerCerts: r\.certificates \}\)/,
    'boş yanıt yerel sertifikaları siliyor',
  );
});
