import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { KATALOG } from '@ayna/domain';
import { servicesOf } from './taxonomy';

/**
 * "YAKINDA" ROZETİ — brief §7.4'ün iki yarısı.
 *
 * Brief: "alt hizmette aktif ve yayında en az 1 uzman yoksa rozet görünür;
 * müşteri o alt hizmette YİNE DE talep oluşturabilir."
 *
 * İkinci yarı en az birincisi kadar önemli: rozet bir KAPI olsaydı, hiç
 * uzman gelmemiş kategori sonsuza kadar boş kalırdı — eski `active: false`
 * tam olarak bunu yapıyordu ve bu yüzden kaldırıldı.
 *
 * Kanca React'e bağlı olduğu için mantık burada KAYNAK üzerinden ve
 * saf yardımcılarla doğrulanıyor; ekranlar Node'da render edilemiyor.
 */

const oku = (p: string) => readFileSync(join(__dirname, p), 'utf8');
const kanca = oku('yakinda.ts');
const cards = oku('ui/ServiceCards.tsx');
const chips = oku('ui/ServiceChips.tsx');
const kategoriEkrani = readFileSync(join(__dirname, '..', 'app', 'category', '[id].tsx'), 'utf8');

test('ROZET SEÇİMİ ENGELLEMİYOR — talep yine bırakılabilir', () => {
  /*
   * Brief'in kalbi. `disabled`, `pointerEvents="none"` ya da rozetli
   * hizmeti listeden eleyen bir filtre, arz olmayan yerde talep toplamayı
   * imkânsız kılardı — ters pazar yerinin varlık sebebini iptal ederdi.
   */
  for (const [ad, kaynak] of [
    ['ServiceCards', cards],
    ['ServiceChips', chips],
  ] as const) {
    assert.doesNotMatch(kaynak, /disabled=/, `${ad} rozetli hizmeti tıklanamaz yapıyor`);
    assert.doesNotMatch(kaynak, /pointerEvents/, `${ad} rozetli hizmete dokunuşu kesiyor`);
    assert.doesNotMatch(
      kaynak,
      /\.filter\(\([^)]*\) =>\s*!?\s*yakinda/i,
      `${ad} rozetli hizmeti listeden eliyor`,
    );
  }
  // Kategori ekranı da kapanmıyor: rozet varken talep kartı hâlâ çiziliyor.
  const rozetIndex = kategoriEkrani.indexOf('kategoriYakinda(sector)');
  const talepIndex = kategoriEkrani.indexOf('demandRoute');
  assert.ok(rozetIndex > 0, 'kategori ekranında rozet yok');
  assert.ok(talepIndex > 0, 'kategori ekranında talep kartı yok');
  assert.doesNotMatch(
    kategoriEkrani,
    /kategoriYakinda\(sector\) \? [\s\S]{0,200}?\) : \([\s\S]{0,80}?demandCard/,
    'rozet varken talep kartı gizleniyor',
  );
});

test('AĞ YOKKEN rozet gösterilmiyor — uydurma yok', () => {
  /*
   * Sunucuya ulaşılamadığında "hiçbir yerde uzman yok" varsaymak,
   * çevrimdışı kullanıcıya BÜTÜN kataloğu "Yakında" diye gösterirdi.
   * Bilgi yoksa rozet de yok.
   */
  assert.match(
    kanca,
    /if \(!data\) return \{ biliniyor: false/,
    'sunucu cevabı yokken durum "bilinmiyor" sayılmıyor',
  );
  assert.match(kanca, /biliniyor && yakindaOlanlar\.has\(id\)/, 'rozet, bilgi yokken de çiziliyor');
  assert.match(kanca, /if \(!biliniyor\) return false;/, 'kategori rozeti bilgi yokken çiziliyor');
});

test('kategori rozeti ancak HEPSİ arzsızsa çıkıyor', () => {
  /*
   * Tek bir alt hizmette bile uzman varsa kategori çalışıyordur. Ona
   * "Yakında" demek kullanıcıyı VAR OLAN uzmandan çevirirdi.
   */
  assert.match(
    kanca,
    /alt\.every\(\(s\) => yakindaOlanlar\.has\(s\.id\)\)/,
    'kategori rozeti "hepsi" koşulu kullanmıyor',
  );
  assert.match(
    kanca,
    /if \(alt\.length === 0\) return false;/,
    'alt hizmeti olmayan kategori boş dizide every ile rozet alıyor',
  );
});

test('rozet her kategoride ÇİZİLEBİLİR durumda — kanca katalogla uyumlu', () => {
  // Kanca `servicesOf` üzerinden çalışıyor; bir kategori boş dönerse rozet
  // mantığı o kategoride hiç işlemez. Katalogdaki her kategorinin alt
  // hizmeti olmalı.
  const bos = KATALOG.map((k) => k.id).filter((id) => servicesOf(id).length === 0);
  assert.deepEqual(bos, [], `alt hizmeti olmayan kategori: ${bos.join(', ')}`);
});

test('fotoğraflı teklif akışı kategorileri KESMİYOR', () => {
  /*
   * `CATEGORIES.slice(0, 6)` vardı: 13 kategorinin 7'si bu akışta
   * görünmüyordu. Şerit zaten yatay kayıyor, kesme bir yerleşim gereği
   * değildi. Brief §1: ekrana özel varyasyon yasak.
   */
  const foto = readFileSync(join(__dirname, '..', 'app', 'quote', 'new.tsx'), 'utf8');
  assert.doesNotMatch(foto, /CATEGORIES\.slice\(/, 'kategori listesi kırpılıyor');
});

test('rozet metni ÜÇ DİLDE var', () => {
  for (const dil of ['tr', 'kk', 'ru']) {
    const kaynak = readFileSync(
      join(__dirname, '..', '..', '..', 'packages', 'i18n', 'src', 'messages', `${dil}.ts`),
      'utf8',
    );
    assert.ok(kaynak.includes("'catalog.soon':"), `${dil} rozet metni yok`);
    assert.ok(kaynak.includes("'catalog.soon_hint':"), `${dil} açıklama metni yok`);
  }
});
