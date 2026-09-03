import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { KATALOG } from '@ayna/domain';
import { CATEGORIES } from './data';
import { HIZMET_VARSAYILANI, TABAN } from './hizmet-varsayilan';
import {
  TAXONOMY,
  allServices,
  aramaAnahtari,
  hizmetAra,
  kategoriAra,
  kategoriAdi,
} from './taxonomy';

/**
 * KATALOG TEK KAYNAK — brief §1'in bekçisi.
 *
 * Brief: "Hizmet kategorilerinin göründüğü HER ekran ve HER akış bu
 * taksonomiden beslenir. İkinci bir liste, hard-coded kategori veya ekrana
 * özel varyasyon YASAKTIR."
 *
 * Bu dosya o yasağı kodda tutuyor. Geçiş öncesi uygulamada 12 kategori
 * ELLE yazılıydı (`hair-cut`, `brows-micro`, …) ve adları `packages/i18n`
 * içinde ikinci kez duruyordu; ikisi de kaldırıldı.
 */

test('kategoriler katalogla BİREBİR aynı — sayı, kimlik ve sıra', () => {
  assert.deepEqual(
    TAXONOMY.map((c) => c.id),
    KATALOG.map((k) => k.id),
    'uygulama katalogdan sapmış',
  );
  assert.deepEqual(
    CATEGORIES.map((c) => c.id),
    KATALOG.map((k) => k.id),
    'ekranların gördüğü liste katalogdan sapmış',
  );
});

test('alt hizmetler ve KİMLİKLERİ katalogdan geliyor', () => {
  assert.deepEqual(
    allServices().map((s) => s.id),
    KATALOG.flatMap((k) => k.altHizmetler.map((a) => a.id)),
    'alt hizmet kimlikleri katalogla örtüşmüyor',
  );
});

test('kategori adları ÜÇ DİLDE katalogdan okunuyor', () => {
  for (const k of KATALOG) {
    for (const dil of ['tr', 'kk', 'ru'] as const) {
      assert.equal(kategoriAdi(k.id, dil), k.ad[dil], `${k.id} · ${dil} adı katalogla aynı değil`);
    }
  }
});

test('ESKİ kimlikler hiçbir yerde yaşamıyor', () => {
  /*
   * Geçişte en kolay hata: bir ekranda `'hair-cut'` ya da `'skincare'`
   * unutmak. O ekran katalogda olmayan bir kimlikle konuşur ve sessizce
   * boş sonuç döndürür — kullanıcı hata değil, BOŞ LİSTE görür.
   *
   * Kaynağı tarıyoruz çünkü tip denetimi yakalamaz: kimlikler `string`.
   */
  const eski = [
    'hair-cut',
    'hair-color',
    'nails-classic',
    'lashes-classic',
    'brows-shape',
    'skin-facial',
    'epil-sugar',
    'spa-relax',
    'pmu-lip',
    'bridal-look',
    'well-yoga',
    'style-color',
  ];
  const bulunan: string[] = [];
  const gez = (dizin: string) => {
    for (const ad of readdirSync(dizin)) {
      if (ad === 'node_modules' || ad === '.expo') continue;
      const tam = join(dizin, ad);
      if (statSync(tam).isDirectory()) {
        gez(tam);
        continue;
      }
      if (!/\.tsx?$/.test(ad) || ad.endsWith('.test.ts')) continue;
      const kaynak = readFileSync(tam, 'utf8');
      for (const e of eski) if (kaynak.includes(`'${e}'`)) bulunan.push(`${ad}: ${e}`);
    }
  };
  gez(join(__dirname, '..', 'src'));
  gez(join(__dirname, '..', 'app'));
  assert.deepEqual(bulunan, [], `eski taksonomi kimliği kalmış: ${bulunan.join(', ')}`);
});

test('i18n kategori adlarının İKİNCİ KOPYASINI tutmuyor', () => {
  /*
   * Adlar katalogda üç dilde var. `packages/i18n` içinde `category.<id>`
   * anahtarları da vardı: iki kopya, kaçınılmaz ayrışma. Silindiler ve
   * geri gelmemeleri gerekiyor.
   */
  for (const dil of ['tr', 'kk', 'ru']) {
    const kaynak = readFileSync(
      join(__dirname, '..', '..', '..', 'packages', 'i18n', 'src', 'messages', `${dil}.ts`),
      'utf8',
    );
    for (const k of KATALOG) {
      assert.ok(
        !kaynak.includes(`'category.${k.id}':`),
        `${dil}.ts içinde category.${k.id} geri gelmiş — ad iki yerde`,
      );
    }
  }
});

test('HER alt hizmetin süresi ve fiyatı var — hiçbiri tabana düşmüyor', () => {
  /*
   * Varsayılanı olmayan hizmet `TABAN`a düşüyor: 60 dk / 10.000 ₸.
   * Çökmüyor ama uzman kayıt olurken önüne KATALOGLA İLGİSİZ bir sayı
   * geliyor. Katalog büyüdüğünde satır eklemeyi unutursak bu test söyler.
   */
  const eksik = allServices()
    .map((s) => s.id)
    .filter((id) => HIZMET_VARSAYILANI[id] === undefined);
  assert.deepEqual(eksik, [], `varsayılanı olmayan hizmet: ${eksik.join(', ')}`);
});

test('varsayılanlar KATALOGDA OLMAYAN kimlik taşımıyor', () => {
  const gecerli = new Set(allServices().map((s) => s.id));
  const fazla = Object.keys(HIZMET_VARSAYILANI).filter((id) => !gecerli.has(id));
  assert.deepEqual(fazla, [], `katalogda karşılığı olmayan varsayılan: ${fazla.join(', ')}`);
});

test('fiyat ve süre anlamlı — sıfır fiyat ekrana çıkmaz', () => {
  for (const s of allServices()) {
    assert.ok(s.price > 0, `${s.id} fiyatı sıfır`);
    assert.ok(s.durationMin > 0, `${s.id} süresi sıfır`);
  }
  assert.ok(TABAN.price > 0 && TABAN.durationMin > 0);
});

test('ARAMA seçili dile bakmıyor — üç dilde de bulur', () => {
  /*
   * Kazakistan gerçeği: arayüz Kazakça olsa da kullanıcı "маникюр"
   * yazıyor. Eskiden yalnız o anki dildeki etiket taranıyordu ve öteki
   * iki dilde arayan HİÇBİR sonuç göremiyordu.
   */
  assert.ok(kategoriAra('nails', 'Тырнақ'), 'kazakça kategori adı bulunamadı');
  assert.ok(kategoriAra('nails', 'Ногти'), 'rusça kategori adı bulunamadı');
  assert.ok(kategoriAra('nails', 'Tırnak'), 'türkçe kategori adı bulunamadı');
  assert.ok(!kategoriAra('nails', 'Saç'), 'ilgisiz sorgu eşleşti');

  assert.ok(
    hizmetAra('маникюр').some((s) => s.id === 'nails.manicure'),
    'rusça alt hizmet araması sonuç vermedi',
  );
  assert.ok(
    hizmetAra('шугаринг').some((s) => s.id === 'epilation.sugaring'),
    'kazakçadaki rusça alıntı terim aranamıyor',
  );
});

test('TÜRKÇE "İ" arama sonucunu düşürmüyor', () => {
  /*
   * `'İ'.toLowerCase()` JavaScript'te TEK harf değil İKİ kod noktası
   * üretiyor: 'i' + U+0307 (birleşen nokta). Küçültmeden SONRA harf
   * değiştiren kod o noktayı bırakıyor ve "manİkür" ile "manikür"
   * eşleşmiyordu. Klavyeden büyük harf yazan kullanıcı HİÇBİR SONUÇ
   * alamıyordu — sessiz ve tam bir arama arızası.
   */
  assert.equal(aramaAnahtari('MANİKÜR'), aramaAnahtari('manikür'));
  assert.equal(aramaAnahtari('KİRPİK'), aramaAnahtari('kirpik'));
  assert.ok(
    hizmetAra('MANİKÜR').some((s) => s.id === 'nails.manicure'),
    'noktalı büyük İ ile arama bulamıyor',
  );
  assert.ok(kategoriAra('lashes_brows', 'KİRPİK'), 'noktalı büyük İ kategori aramasını düşürüyor');
});

test('TÜRKÇE "I" arama sonucunu düşürmüyor', () => {
  /*
   * `toLocaleLowerCase('tr-TR')` "MANIKÜR"ü "manıkür" yapar ve katalogdaki
   * "manikür"le eşleşmez. Klavyeden büyük harf gelen her sorgu boş sonuç
   * döndürüyordu.
   */
  assert.equal(aramaAnahtari('MANIKÜR'), aramaAnahtari('manikür'));
  assert.ok(
    hizmetAra('MANIKÜR').some((s) => s.id === 'nails.manicure'),
    'büyük harfli türkçe sorgu bulamıyor',
  );
  assert.ok(
    hizmetAra('TIRNAK').length >= 0 && kategoriAra('nails', 'TIRNAK'),
    'büyük harfli kategori sorgusu bulamıyor',
  );
});

test('boş sorgu HER ŞEYİ eşleştirmiyor', () => {
  // Boş sorguyu "her metinde geçer" saymak, arama kutusu temizlenince
  // ekranı rastgele doldururdu.
  assert.ok(!kategoriAra('nails', ''));
  assert.ok(!kategoriAra('nails', '   '));
  assert.equal(hizmetAra('').length, 0);
});

test('tanınmayan kategori kimliği UYDURULMUŞ ad döndürmüyor', () => {
  // Eskiden bilinmeyen kimlik 'category.hair'e düşüyordu: ekranda "Saç"
  // yazıyordu. Yanlış ad göstermektense hiç göstermemek doğru.
  assert.equal(kategoriAdi('boyle-bir-kategori-yok', 'tr'), '');
});
