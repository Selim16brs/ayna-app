import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { KATALOG } from '@ayna/domain';

/**
 * KATALOG GEÇİŞİ — `service_categories` tablosu uygulamayla aynı kalmalı.
 *
 * `CategorySyncService` EKSİK kategorileri ekliyor ama ESKİLERİ silmiyor.
 * Geçiş SQL'i olmasaydı panelde 12 eski + 13 yeni = 25 satır görünürdü ve
 * beşinin hiçbir ekranda karşılığı olmazdı.
 */

const sql = readFileSync(
  join(import.meta.dirname, '..', '..', 'prisma', 'pre-push', '10-hizmet-katalogu.sql'),
  'utf8',
);

test('artık var olmayan HER kategori kodu geçişte ele alınmış', () => {
  /*
   * Eski liste sabit: geçiş öncesi tabloda bu 12 kod vardı. Katalogda
   * karşılığı kalmayanların HEPSİ SQL'de geçmeli — biri unutulursa
   * panelde ölü satır olarak kalır.
   */
  const eski = [
    'hair',
    'nails',
    'lashes',
    'brows',
    'makeup',
    'skincare',
    'epilation',
    'spa',
    'pmu',
    'bridal',
    'wellness',
    'style',
  ];
  const yeni = new Set(KATALOG.map((k) => k.id));
  const kalkanlar = eski.filter((k) => !yeni.has(k));
  assert.deepEqual(
    kalkanlar.sort(),
    ['bridal', 'brows', 'lashes', 'pmu', 'skincare'],
    'kalkan kategori listesi beklenenden farklı — geçiş gözden geçirilmeli',
  );
  /*
   * SQL'de "geçiyor olmak" YETMEZ: `pmu` talepleri Makyaj'a taşıyan
   * UPDATE'te de geçiyor. Kod SİLME listesinde olmalı — yoksa satır
   * taşındıktan sonra bile panelde durur.
   */
  const silme = sql.slice(sql.indexOf('DELETE FROM "service_categories"'));
  for (const kod of kalkanlar) {
    assert.ok(silme.includes(`'${kod}'`), `${kod} silinmiyor — panelde ölü kategori kalır`);
  }
});

test('bağlı TALEBİ olan satır silinmiyor — veri kopmuyor', () => {
  /*
   * `quote_requests.category_id` bu satırlara bağlı. Koşulsuz DELETE
   * yabancı anahtara takılıp dağıtımı yarıda bırakırdı; daha kötüsü
   * CASCADE olsaydı kullanıcının talebi sessizce silinirdi.
   */
  const silme = sql.slice(sql.indexOf('DELETE FROM "service_categories"'));
  assert.match(
    silme,
    /NOT EXISTS \(SELECT 1 FROM "quote_requests" q WHERE q\."category_id" = s\."id"\)/,
    'silme, bağlı talep kontrolü yapmıyor',
  );
});

test('BİRLEŞEN kategorilerin talepleri hedefe taşınıyor', () => {
  // Kaş talebi `lashes_brows`e, kalıcı makyaj ve gelin talepleri `makeup`e.
  // Taşıma olmasaydı silme koşulu hiç sağlanmaz, satırlar panelde kalırdı.
  const tasima = sql.slice(0, sql.indexOf('DELETE FROM'));
  assert.match(tasima, /UPDATE "quote_requests"[\s\S]*?'lashes_brows'/, 'kaş talepleri taşınmıyor');
  assert.match(tasima, /UPDATE "quote_requests"[\s\S]*?'makeup'/, 'pmu/gelin talepleri taşınmıyor');
});

test('yeniden adlandırma ÇAKIŞMAYA karşı korumalı', () => {
  /*
   * `code` tekil. Hedef kod zaten varsa (sync önce çalıştıysa) korumasız
   * bir UPDATE tekil kısıtına takılır ve TÜM dağıtımı düşürürdü.
   */
  for (const hedef of ['skin', 'lashes_brows']) {
    const i = sql.indexOf(`"code" = '${hedef}'`);
    assert.ok(i > 0, `${hedef} yeniden adlandırması yok`);
    const parca = sql.slice(i, i + 400);
    assert.match(
      parca,
      new RegExp(
        `NOT EXISTS \\(SELECT 1 FROM "service_categories" s2 WHERE s2\\."code" = '${hedef}'\\)`,
      ),
      `${hedef} yeniden adlandırması çakışmaya karşı korumasız`,
    );
  }
});

test('geçiş, ADI DEĞİŞMEYEN kategorileri silmiyor', () => {
  // `hair`, `nails`, `makeup`, `spa`, `epilation`, `wellness`, `style`
  // duruyor; silme listesine biri karışırsa panelde kategori kaybolur.
  const silme = sql.slice(sql.indexOf('DELETE FROM "service_categories"'));
  for (const kalan of ['hair', 'nails', 'epilation', 'spa', 'wellness', 'style']) {
    assert.doesNotMatch(
      silme,
      new RegExp(`'${kalan}'`),
      `${kalan} silme listesinde — hâlâ geçerli bir kategori`,
    );
  }
});
