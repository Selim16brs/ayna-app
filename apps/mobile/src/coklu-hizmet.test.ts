import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

/**
 * ÇOKLU HİZMET TALEBİ — brief §4.5 (uygulama tarafı).
 *
 * "Çoklu hizmet talebi desteklenir (ör. düğün paketi). Tek talepte birden
 * fazla alt hizmet seçilebilir."
 */

const yorumsuz = (x: string) =>
  x.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
const talep = yorumsuz(readFileSync(join(__dirname, '..', 'app', 'demand', 'new.tsx'), 'utf8'));
const cipler = yorumsuz(readFileSync(join(__dirname, 'ui', 'ServiceChips.tsx'), 'utf8'));
const uzmanKarti = yorumsuz(
  readFileSync(join(__dirname, '..', 'app', 'seller', 'requests.tsx'), 'utf8'),
);

test('talep ekranı ÇOKLU seçim tutuyor', () => {
  assert.match(
    talep,
    /const \[serviceIds, setServiceIds\] = useState<string\[\]>/,
    'tek seçim duruyor',
  );
  assert.doesNotMatch(talep, /setServiceId\(/, 'eski tek-seçim ayarlayıcısı kalmış');
});

test('KATEGORİ DEĞİŞİNCE seçim SIFIRLANMIYOR', () => {
  /*
   * Düğün paketi zaten ÜÇ AYRI KATEGORİDEN hizmet topluyor (saç + makyaj
   * + tırnak). Kategori değişince seçimi silmek, çoklu talebi kategori
   * içine hapsederdi — brief'in örneği hiç kurulamazdı.
   */
  const kategoriDokunusu = talep.slice(talep.indexOf('setCategory(cat.id)'));
  assert.doesNotMatch(
    kategoriDokunusu.slice(0, 200),
    /setServiceIds\(\[\]\)/,
    'kategori değişince seçim siliniyor',
  );
});

test('SEÇİLENLERİN TAMAMI ekranda — kategori dışındakiler de', () => {
  /*
   * Kullanıcı kategori değiştirince önceki seçimleri çip bulutundan
   * kayboluyor ve neyi istediğini göremiyordu. Paket talebinin bütünü
   * tek bakışta görünmeli.
   */
  assert.match(talep, /serviceIds\.length > 1 \?/, 'paket özeti yok');
  assert.match(
    talep,
    /setServiceIds\(\(cur\) => cur\.filter\(\(x\) => x !== id\)\)/,
    'özetten çıkarma yok',
  );
});

test('sunucuya LİSTE gidiyor', () => {
  assert.match(talep, /serviceIds\.length \? \{ serviceIds \} : \{\}/, 'liste gönderilmiyor');
});

test('ServiceChips çoklu kipte SEÇİMİ ENGELLEMİYOR, çoğaltıyor', () => {
  // Çoklu kip tek seçimi taklit etseydi (üzerine yazsaydı) paket kurulamazdı.
  assert.match(
    cipler,
    /degistir!\(\s*secilenler!\.includes\(s\.id\)/,
    'çoklu kip aç/kapa yapmıyor',
  );
  assert.match(cipler, /\.\.\.secilenler!, s\.id\]/, 'ikinci hizmet listeye eklenmiyor');
});

test('ServiceChips TEK seçim kipi hâlâ çalışıyor', () => {
  // Kategori ekranı ve başka çağıranlar tek seçim kullanıyor; kip eklerken
  // onları bozmak sessiz bir gerileme olurdu.
  assert.match(cipler, /const coklu = !!degistir && !!secilenler;/, 'kip ayrımı yok');
  assert.match(cipler, /onChange\?\.\(on \? null : s\.id\)/, 'tek seçim yolu kalkmış');
});

test('UZMAN talep edilen hizmetleri GÖRÜYOR', () => {
  /*
   * Kartta yalnız KATEGORİ yazıyordu ("Saç"). Müşteri artık tek talepte
   * birden çok hizmet seçebiliyor; uzman neyi fiyatlayacağını göremezse
   * teklifi tahmine dayanır ve randevuda anlaşmazlık çıkar.
   */
  /*
   * "Kaynakta geçiyor" YETMEZ: değişkeni tanımlayıp render koşulunu
   * kapatmak testi geçerdi. Listenin GERÇEKTEN çizildiği koşul aranıyor.
   */
  assert.match(
    uzmanKarti,
    /\{talepHizmetleri\.length > 0 \? \([\s\S]{0,400}?talepHizmetleri\.map\(/,
    'talep edilen hizmetler kartta çizilmiyor',
  );
  assert.match(
    uzmanKarti,
    /demand\.serviceIds \?\? \(demand\.serviceId \? \[demand\.serviceId\] : \[\]\)/,
    'eski tek-hizmetli talepler uzman kartında görünmüyor',
  );
});

test('ADI ÇÖZÜLEMEYEN kimlik uzmana gösterilmiyor', () => {
  // "hair.olmayan" gibi bir kimlik bilgi değil gürültü olurdu.
  assert.match(
    uzmanKarti,
    /\.map\(\(id\) => findServiceWithCategory\(id\)\?\.service\)/,
    'kimlik çözülmüyor',
  );
  assert.match(
    uzmanKarti,
    /\.filter\(\(x\): x is NonNullable<typeof x> => !!x\)/,
    'çözülemeyen kimlik elenmiyor',
  );
});
