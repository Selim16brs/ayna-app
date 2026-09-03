import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { hizmetleriGrupla } from './hizmet-gruplama';
import { hizmetKategorisi } from './hizmet-adi';
import { TAXONOMY } from './taxonomy';

/**
 * PROFİLDE HİYERARŞİ VE RANDEVUDA İKON — brief §4.7 ve §4.8.
 *
 * §4.7: "Profilde uzmanın hizmetleri kategori → alt hizmet hiyerarşisiyle
 * gruplu gösterilir; kategori ikonları başlıklarda kullanılır."
 * §4.8: "Her randevu kartında ilgili hizmetin kategori ikonu + alt hizmet
 * adı görünür."
 */

const yorumsuz = (x: string) =>
  x.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
const profil = yorumsuz(readFileSync(join(__dirname, '..', 'app', 'uzman', '[id].tsx'), 'utf8'));
const randevular = yorumsuz(
  readFileSync(join(__dirname, '..', 'app', '(tabs)', 'bookings.tsx'), 'utf8'),
);

const satir = (serviceId: string | null, name: string) => ({ id: name, serviceId, name });

test('hizmetler KATEGORİYE göre gruplanıyor', () => {
  const g = hizmetleriGrupla([
    satir('hair.coloring', 'Kök boyası'),
    satir('nails.manicure', 'Klasik manikür'),
    satir('hair.haircut', 'Kesim'),
  ]);
  assert.deepEqual(
    g.map((x) => x.kategoriId),
    ['hair', 'nails'],
  );
  assert.deepEqual(
    g[0]!.satirlar.map((s) => s.name),
    ['Kök boyası', 'Kesim'],
    'aynı kategorinin satırları bir arada değil',
  );
});

test('AYNI alt hizmetin birden çok satırı korunuyor', () => {
  // Brief §4.1'in tüm anlamı: "Kök boyası" ve "Tam boya" ayrı satırlar.
  const g = hizmetleriGrupla([
    satir('hair.coloring', 'Kök boyası'),
    satir('hair.coloring', 'Tam boya'),
  ]);
  assert.equal(g.length, 1);
  assert.equal(g[0]!.satirlar.length, 2, 'ikinci satır yutuldu');
});

test('sıra KATALOG SIRASI — uzmanın ekleme sırası değil', () => {
  /*
   * Uzman hizmetlerini rastgele eklemiş olabilir; müşteri her profilde
   * aynı düzeni görmeli. Alfabetik de olamaz: dil değişince sıra
   * değişirdi.
   */
  /*
   * ÇİFT BİLEREK SEÇİLDİ: katalogda `nails` (2.) `body_contouring`dan
   * (9.) önce ama ALFABETİK olarak sonra gelir. Alfabetik sıraya kayan
   * bir uygulama bu testi geçemez — ilk denememde `hair`/`other` çifti
   * her iki sıralamada da aynı sonucu verdiği için mutasyonu kaçırdı.
   */
  const g = hizmetleriGrupla([
    satir('body_contouring.lpg', 'LPG'),
    satir('nails.manicure', 'Manikür'),
  ]);
  assert.deepEqual(
    g.map((x) => x.kategoriId),
    ['nails', 'body_contouring'],
    'katalog sırası korunmuyor',
  );
  const beklenen = TAXONOMY.map((c) => c.id);
  assert.ok(beklenen.indexOf('nails') < beklenen.indexOf('body_contouring'));
  assert.ok('body_contouring' < 'nails', 'çift artık alfabetik farkı göstermiyor');
});

test('KATALOG DIŞI hizmet kaybolmuyor — sona, kategorisiz gruba', () => {
  /*
   * Eski kayıtlar ve serbest yazılmış hizmetler. Atmak, uzmanın GERÇEKTEN
   * sunduğu bir hizmeti profilden silmek olurdu.
   */
  const g = hizmetleriGrupla([
    satir(null, 'Roza özel paketi'),
    satir('hair.haircut', 'Kesim'),
    satir('boyle.bir.hizmet.yok', 'Eski kayıt'),
  ]);
  assert.equal(g.length, 2);
  assert.equal(g[1]!.kategoriId, null, 'kategorisiz grup sonda değil');
  assert.deepEqual(
    g[1]!.satirlar.map((s) => s.name),
    ['Roza özel paketi', 'Eski kayıt'],
  );
});

test('kategorisiz satır YOKSA boş grup eklenmiyor', () => {
  // Boş bir "Diğer hizmetler" başlığı, olmayan bir şey vaat ederdi.
  const g = hizmetleriGrupla([satir('hair.haircut', 'Kesim')]);
  assert.equal(g.length, 1);
  assert.equal(g[0]!.kategoriId, 'hair');
});

test('TEK kategoride başlık ÇİZİLMİYOR', () => {
  // Tek başlıklı bir grup bilgi taşımaz, yalnız yer kaplar.
  assert.match(profil, /gruplar\.length > 1 \?/, 'tek kategoride de başlık çiziliyor');
});

test('başlıkta KATEGORİ İKONU var', () => {
  assert.match(
    profil,
    /g\.kategoriId \? <HizmetIkonu id=\{g\.kategoriId\}/,
    'başlıkta kategori ikonu yok',
  );
});

test('RANDEVU KARTINDA kategori ikonu — katalog dışıysa çizilmiyor', () => {
  /*
   * Rastgele bir kategori ikonu koymak, uzmanın serbest yazdığı bir
   * hizmeti yanlış kategoriye ait göstermek olurdu.
   */
  assert.match(
    randevular,
    /\{hizmetKategori \? <HizmetIkonu id=\{hizmetKategori\} tarz="satir" \/> : null\}/,
    'randevu kartında koşullu kategori ikonu yok',
  );
});

test('randevu metninden KATEGORİ çözülüyor', () => {
  // `Booking.service` kimliği değil METNİ saklıyor; kategori ters dizinden.
  assert.equal(hizmetKategorisi('Kesim & Şekillendirme'), 'hair');
  // Ters dizin TAM etiketi arıyor (bkz. `hizmet-adi.ts`): yaklaşık
  // eşleşme yanlış kategoriye bağlar, o yüzden bilerek dar.
  assert.equal(hizmetKategorisi('Маникюр классический'), 'nails', 'rusça etiket çözülmüyor');
  assert.equal(hizmetKategorisi('Классикалық маникюр'), 'nails', 'kazakça etiket çözülmüyor');
  assert.equal(hizmetKategorisi('Маникюр'), undefined, 'eksik etiket yine de eşleşti');
});

test('BİRLEŞİK etikette İLK hizmet belirliyor', () => {
  // İkon tek; iki kategoriyi tek ikonla anlatmanın yolu yok ve ilk
  // hizmet randevunun ana işi.
  assert.equal(hizmetKategorisi('Kesim & Şekillendirme + Manikür (klasik)'), 'hair');
  assert.equal(hizmetKategorisi('Manikür (klasik) + Kesim & Şekillendirme'), 'nails');
});

test('KATALOG DIŞI metinde kategori YOK', () => {
  assert.equal(hizmetKategorisi('Roza özel bakım paketi'), undefined);
  assert.equal(hizmetKategorisi(''), undefined);
  assert.equal(hizmetKategorisi('   '), undefined);
});
