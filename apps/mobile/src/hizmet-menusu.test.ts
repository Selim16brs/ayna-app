import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

/**
 * UZMANIN HİZMET MENÜSÜ — brief §4.1.
 *
 * "Seçilen her alt hizmet altında uzman KENDİ hizmetlerini manuel ekler:
 * serbest ad + fiyat + süre (şablon yok)."
 *
 * Ekranlar Node'da render edilemediği için kaynak ve mağaza mantığı
 * üzerinden doğrulanıyor.
 */

const oku = (p: string) => readFileSync(join(__dirname, p), 'utf8');
/**
 * Yorumlar atılıyor: bu dosyadaki testler KODU sınıyor, kodun yanındaki
 * açıklamayı değil. İlk sürümüm `seedSellerServices` sözcüğünü kendi
 * açıklama satırımda bulup yanlış alarm verdi.
 */
const yorumsuz = (x: string) =>
  x.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
const store = yorumsuz(oku('store.ts'));
const hizmetler = yorumsuz(
  readFileSync(join(__dirname, '..', 'app', 'seller', 'services.tsx'), 'utf8'),
);
const offline = yorumsuz(
  readFileSync(join(__dirname, '..', 'app', 'seller', 'offline.tsx'), 'utf8'),
);

test('YENİ HESAP BOŞ BAŞLIYOR — uydurma hizmet yok', () => {
  /*
   * `seedSellerServices()` her uzman/salon hesabına SEKİZ saç hizmeti
   * dolduruyordu. Tırnak uzmanı kendi randevu ekranında hiç girmediği saç
   * hizmetlerini görüyor; "Hizmetlerim"i bir kez kaydettiğinde o sekiz
   * satır SUNUCUYA gidiyor ve hiç vermediği hizmetlerin arzı sayılıyordu.
   *
   * Kurucu: "sistem hiçbir şeyi kendiliğinden uydurmamalı."
   */
  assert.doesNotMatch(store, /seedSellerServices/, 'hizmet tohumu geri gelmiş');
  assert.match(
    store,
    /const bosHizmetListesi = \(\): SellerServiceRow\[\] => \[\];/,
    'yeni hesap boş listeyle başlamıyor',
  );
  assert.match(store, /sellerServices: bosHizmetListesi\(\)/, 'başlangıç değeri boş liste değil');
});

test('satır UZMANIN KENDİ adını taşıyor ve katalog bağı var', () => {
  // İkisi de zorunlu: ad olmadan şablona döneriz, bağ olmadan hizmet
  // aramada ve arz hesabında görünmez.
  const tip = store.slice(store.indexOf('export type SellerServiceRow'));
  const govde = tip.slice(0, tip.indexOf('};'));
  for (const alan of ['key', 'serviceId', 'name', 'price', 'dur']) {
    assert.match(govde, new RegExp(`\\b${alan}\\b`), `satırda ${alan} yok`);
  }
});

test('sunucuya KATALOG BAĞIYLA gönderiliyor', () => {
  /*
   * `serviceId` gitmezse sunucu satırı kataloğa bağlayamaz: arama,
   * talep eşleşmesi ve "Yakında" hesabı o hizmeti hiç görmez.
   */
  const yazma = store.slice(store.indexOf('setSellerServices: async (rows)'));
  const govde = yazma.slice(0, yazma.indexOf('api.setMyServices'));
  assert.match(govde, /serviceId: r\.serviceId/, 'katalog bağı gönderilmiyor');
  assert.match(govde, /name: r\.name/, 'uzmanın kendi adı gönderilmiyor');
});

test('ADSIZ, FİYATSIZ ya da SÜRESİZ satır KAYDEDİLMİYOR', () => {
  /*
   * Müşteriye adsız hizmet, 0 ₸ ya da kimsenin yazmadığı bir süre
   * göstermek yarım kaydı gerçek bir teklif gibi sunmaktır. Süre sonradan
   * eklendi: boş bırakılınca sunucu 60 dk uyduruyordu.
   *
   * "Kaydet" ile satır içindeki "Ekle" AYNI kuralı okuyor; ayrı süzgeç
   * yazılsaydı ikisi zamanla ayrışırdı.
   */
  assert.match(hizmetler, /rows\.filter\(satirGecerli\)/, 'yarım satırlar süzülmüyor');
  assert.match(
    hizmetler,
    /satirGecerli = \(r: SellerServiceRow\) =>\s*!!r\.name\.trim\(\) && Number\(r\.price\) > 0 && Number\(r\.dur\) > 0/,
    'kural ad + fiyat + süreyi birlikte istemiyor',
  );
});

test('AYNI alt hizmete birden çok satır eklenebiliyor', () => {
  /*
   * Şablonun kalkmasının tüm anlamı bu: "Boya" diyen uzman kök boyası ile
   * tam boyayı ayrı fiyatlayabilmeli. Ekleme satırı ÜZERİNE YAZMIYOR,
   * listeye EKLİYOR.
   */
  assert.match(hizmetler, /setRows\(\(cur\) => \[\s*\.\.\.cur,/, 'ekleme satırı listeye eklemiyor');
  assert.match(hizmetler, /sil = async \(key: string\)/, 'satır silinemiyor');
});

test('OFFLINE RANDEVU uzmanın kendi adını gösteriyor', () => {
  /*
   * Eskiden katalog etiketi yazıyordu. Uzman "Kök boyası" ve "Tam boya"
   * ekleyip randevu açtığında ikisi de "Boya" görünürdü — hangisini
   * seçtiğini ayırt edemezdi.
   */
  assert.match(
    offline,
    /const names = keys\.map\(\(k\) => rowByKey\[k\]\?\.name \?\? ''\);/,
    'randevu adı uzmanın kendi adı değil',
  );
  assert.doesNotMatch(
    offline,
    /setService\([\s\S]{0,80}tri\(svcById/,
    'randevu adı hâlâ katalog etiketinden',
  );
});

test('OFFLINE seçim SATIR bazında — aynı alt hizmetin iki satırı ayrı seçilebiliyor', () => {
  // Seçim `serviceId` üzerinden olsaydı iki satır tek seçim gibi
  // davranırdı ve uzman hangisini sattığını belirtemezdi.
  assert.match(offline, /selectedIds\.includes\(r\.key\)/, 'seçim satır anahtarıyla değil');
});

test('persist SÜRÜMÜ yükseltildi — eski biçim ekranı çökertmiyor', () => {
  /*
   * v1'de `Record<altHizmetId, {price,dur}>` idi; artık düz liste. Eski
   * biçim kalıcı kalsaydı ekranlar dizi bekleyip nesne bulur ve uzmanın
   * hizmet ekranı çökerdi.
   */
  assert.match(store, /version: 2,/, 'persist sürümü yükseltilmemiş');
  const gecis = store.slice(store.indexOf('migrate: (persisted, version)'));
  assert.match(gecis.slice(0, 400), /version < 2/, 'eski biçim düşürülmüyor');
  assert.match(gecis.slice(0, 400), /delete rest\.sellerServices/, 'eski liste temizlenmiyor');
});

test('sunucudan gelen BAĞSIZ satır menüye alınmıyor', () => {
  // Kataloğa bağlanamayan satır hiçbir ekranda çalışmaz; menüde tutmak
  // uzmana çalışıyor izlenimi verirdi.
  const okuma = store.slice(store.indexOf('api\n              .myServices()'));
  assert.match(
    okuma.slice(0, 1200),
    /if \(!bag \|\| !findServiceWithCategory\(bag\)\) continue;/,
    'bağsız satır süzülmüyor',
  );
});

test('"KAYDEDİLDİ" ancak GERÇEKTEN kaydedildiyse', () => {
  /*
   * Sunucu hatası yutuluyor ve ekran yine "Kaydedildi" diyordu. Uzmanın
   * keşif kartı yoksa sunucu `NO_DISCOVERY_CARD` fırlatıyor: hizmetler
   * hiçbir yere yazılmıyor, müşteri onları hiç görmüyor, uzman kaydettiğini
   * sanıyor. Kurucunun "uzman hizmet ekliyor ama müşteri göremiyor"
   * dediği sessizliğin son halkası buydu.
   */
  assert.match(store, /setSellerServices: async \(rows\)/, 'kaydetme sonucu bildirmiyor');
  assert.match(
    store,
    /await api\.setMyServices\(gonderilecek\);\s*\n\s*return true;/,
    'sonuç dönmüyor',
  );
  assert.doesNotMatch(
    store.slice(store.indexOf('setSellerServices: async')),
    /api\.setMyServices\([^;]*\)\.catch\(\(\) => undefined\)/,
    'hata hâlâ yutuluyor',
  );
  assert.match(
    hizmetler,
    /t\(oldu \? 'seller\.services\.saved' : 'seller\.services\.save_err'\)/,
    'ekran her hâlde "kaydedildi" diyor',
  );
  // Satır içi "Ekle" ve "Sil" de aynı sonucu okuyor.
  assert.match(
    hizmetler,
    /const oldu = await setSellerServices\(guncel\.filter\(satirGecerli\)\)/,
    'ekleme sessiz',
  );
  assert.match(
    hizmetler,
    /const oldu = await setSellerServices\(kalan\.filter\(satirGecerli\)\)/,
    'silme sessiz',
  );
});
