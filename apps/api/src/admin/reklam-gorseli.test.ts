import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { AdminService } from './admin.service';

/**
 * REKLAM GÖRSELİ YÜKLENİYOR, LİNK YAPIŞTIRILMIYOR.
 *
 * Kurucu (05.09.2026): "orada link koyarak değil biz görsel upload ederek
 * yapmamız lazım."
 *
 * Panelde alan bir URL kutusuydu; canlıdaki iki reklam Google görsel
 * aramasının önizleme adresleriyle girilmişti (~10 piksel genişlik ve Google
 * istediği an kaldırabilir). Artık dosya seçiliyor, veri adresi sunucuya
 * gidiyor ve sunucu kalıcı depolamaya taşıyor — ham base64'ü satıra yazmak
 * kaydı megabaytlarca büyütür ve o satır HER kullanıcının keşif ekranında
 * okunur.
 */

type Kayit = Record<string, unknown>;

function servis() {
  const yazilan: Kayit[] = [];
  const yuklenen: string[] = [];
  const prisma = {
    adBanner: {
      create: (a: { data: Kayit }) => {
        yazilan.push(a.data);
        return Promise.resolve({ id: 'bn-1', ...a.data });
      },
    },
  };
  const storage = {
    put: async (deger: string, prefix: string) => {
      yuklenen.push(prefix);
      return /^data:/.test(deger) ? `https://depo/${prefix}/x.jpg` : deger;
    },
  };
  return {
    svc: new AdminService(prisma as never, {} as never, storage as never),
    yazilan,
    yuklenen,
  };
}

const GIRDI = (image: string) => ({
  proId: 'p1',
  title: 'Kampanya',
  image,
  startsAt: new Date(Date.now() + 1000).toISOString(),
  endsAt: new Date(Date.now() + 30 * 86_400_000).toISOString(),
});

test('YÜKLENEN görsel depolamaya taşınıyor', async () => {
  const { svc, yazilan, yuklenen } = servis();
  await svc.createAd(GIRDI('data:image/jpeg;base64,QUJD'));
  assert.ok(yuklenen.includes('ads'), 'görsel depolamaya yüklenmiyor');
  assert.equal(yazilan[0]!.image, 'https://depo/ads/x.jpg', 'ham base64 satıra yazıldı');
});

test('ESKİ kayıtların uzak adresi bozulmuyor', async () => {
  const { svc, yazilan } = servis();
  await svc.createAd(GIRDI('https://ornek/gorsel.jpg'));
  assert.equal(yazilan[0]!.image, 'https://ornek/gorsel.jpg');
});

test('PANEL dosya seçtiriyor, URL kutusu yok', () => {
  /*
   * Sunucu doğru davransa bile panel URL kutusu gösterdiği sürece kurucu
   * yine link yapıştırır. Kural ekranın kendisinde.
   */
  const tam = readFileSync(
    new URL('../../../web-admin/app/page.tsx', import.meta.url),
    'utf8',
  ).replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
  // YALNIZ reklam ekranı: kampanya ve blog formlarının kendi alanları var,
  // kurucunun isteği reklamlaydı.
  const bas = tam.indexOf('function AdsView()');
  assert.ok(bas > 0, 'reklam ekranı bulunamadı');
  const son = tam.indexOf('\nfunction ', bas + 1);
  const ekran = tam.slice(bas, son > 0 ? son : undefined);
  assert.doesNotMatch(ekran, /Görsel URL/, 'reklam formunda hâlâ URL kutusu var');
  assert.match(ekran, /accept="image\/\*"/, 'reklam formunda dosya seçici yok');
});
