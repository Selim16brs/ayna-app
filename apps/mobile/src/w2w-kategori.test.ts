import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { gonderiKategorisi } from './hizmet-adi';
import { TAXONOMY } from './taxonomy';

/**
 * W2W KATEGORİLERİ — brief §1 ve §4.10.
 *
 * §4.10: "Memnuniyet paylaşımı kartında hizmetin kategori etiketi/ikonu
 * yer alır."
 *
 * Şeritte DÖRT kategori elle yazılıydı ve biri (`skincare`) katalog
 * geçişinden sonra ARTIK YOKTU: o filtre hiçbir gönderiyi bulamıyordu.
 * Kalan dokuz kategorinin hiç filtresi yoktu — masaj paylaşımı yapan biri
 * kendi gönderisini şeritte bulamazdı.
 */

const yorumsuz = (x: string) =>
  x.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
const ekran = yorumsuz(readFileSync(join(__dirname, '..', 'app', '(tabs)', 'circle.tsx'), 'utf8'));
const yeniGonderi = yorumsuz(
  readFileSync(join(__dirname, '..', 'app', 'circle', 'new.tsx'), 'utf8'),
);

test('şerit KATALOGDAN türüyor — elle yazılmış liste yok', () => {
  assert.match(
    ekran,
    /\.\.\.CATEGORIES\.map\(\(c\) => \(\{/,
    'kategori şeridi katalogdan gelmiyor',
  );
  assert.doesNotMatch(
    ekran,
    /'circle\.cat\.(hair|skincare|makeup|nails)'/,
    'elle yazılmış kategori filtresi duruyor',
  );
  assert.doesNotMatch(ekran, /'skincare'/, 'artık var olmayan kategori kimliği duruyor');
});

test('yeni gönderi KOD saklıyor — etiket değil', () => {
  /*
   * Etiket saklanınca gönderi O ANKİ dile çakılıyordu: rusça arayüzdeki
   * kullanıcı türkçe yazılmış gönderide "Saç" görüyor, filtre de sabit
   * TR metinle eşleştiği için dil değiştiren kullanıcının gönderileri
   * şeritten kayboluyordu.
   */
  assert.match(
    yeniGonderi,
    /useState<string>\(CATEGORIES\[0\]!\.id\)/,
    'başlangıç değeri kod değil',
  );
  assert.match(yeniGonderi, /onPress=\{\(\) => setCategory\(cat\.id\)\}/, 'seçim kodu saklamıyor');
  assert.doesNotMatch(yeniGonderi, /setCategory\(label\)/, 'etiket saklanıyor');
});

test('ESKİ gönderiler kaybolmuyor — etiket de çözülüyor', () => {
  // Geçiş öncesi gönderiler kategoriyi etiketle sakladı; üç dilde de.
  assert.equal(gonderiKategorisi('hair'), 'hair', 'kod çözülmüyor');
  assert.equal(gonderiKategorisi('Saç'), 'hair', 'türkçe etiket çözülmüyor');
  assert.equal(gonderiKategorisi('Волосы'), 'hair', 'rusça etiket çözülmüyor');
  assert.equal(gonderiKategorisi('Шаш'), 'hair', 'kazakça etiket çözülmüyor');
  assert.equal(gonderiKategorisi('SAÇ'), 'hair', 'büyük harf çözülmüyor');
});

test('TANINMAYAN değer uydurma kategori üretmiyor', () => {
  /*
   * Kartta ikon çizilmemeli ve metin OLDUĞU GİBİ kalmalı: rastgele bir
   * kategori ikonu koymak yanlış bilgi olurdu.
   */
  assert.equal(gonderiKategorisi('Roza özel paketi'), undefined);
  assert.equal(gonderiKategorisi(''), undefined);
  assert.equal(gonderiKategorisi('skincare'), undefined, 'kalkmış kimlik hâlâ çözülüyor');
});

test('HER katalog kategorisi çözülebiliyor — üç dilde', () => {
  // Şerit katalogdan türüyor; bir kategorinin adı çözülemezse o filtre
  // hiçbir gönderiyi bulamaz.
  for (const c of TAXONOMY) {
    assert.equal(gonderiKategorisi(c.id), c.id, `${c.id} kodu çözülmüyor`);
    for (const dil of ['tr', 'kk', 'ru'] as const) {
      assert.equal(gonderiKategorisi(c.ad[dil]), c.id, `${c.id} · ${dil} etiketi çözülmüyor`);
    }
  }
});

test('KARTTA ikon koşullu — katalog dışıysa çizilmiyor', () => {
  assert.match(
    ekran,
    /\{postKategori \? <HizmetIkonu id=\{postKategori\} tarz="satir" \/> : null\}/,
    'kartta koşullu kategori ikonu yok',
  );
  assert.match(
    ekran,
    /postKategori \? kategoriAdi\(postKategori, locale\) : post\.category/,
    'katalog dışı metin olduğu gibi bırakılmıyor',
  );
});
