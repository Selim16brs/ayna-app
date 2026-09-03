/**
 * DİL BÜTÜNLÜĞÜ — arayüzde sabit metin kalmasın.
 *
 * Kurucu: "uzman adının altındaki hizmetler kullanıcı arayüz dili değişse
 * de Türkçe kalıyor... buna benzer dil değişimine uyarlanmayan şeyler
 * varsa onları da düzeltmen lazım."
 *
 * Denetimde ONE ekran/bileşen metni i18n'den geçmiyordu — üçü bu oturumda
 * benim yazdığım takvim bileşenindeydi. Bu dosya tekrarını engelliyor.
 *
 * KAPSAM: kullanıcıya GÖRÜNEN metin. Kod içi sabitler, rota adları,
 * bileşen adları ve yorumlar dışarıda.
 */

import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { hizmetAdiCevir, hizmetEtiketiCevir } from './hizmet-adi';

const kok = join(import.meta.dirname, '..');

function dosyalar(dizin: string): string[] {
  return readdirSync(dizin, { withFileTypes: true }).flatMap((g) => {
    const yol = join(dizin, g.name);
    if (g.isDirectory()) return dosyalar(yol);
    return g.name.endsWith('.tsx') && !g.name.includes('.test.') ? [yol] : [];
  });
}

/** Yorumsuz kaynak — gerekçe anlatan yorumlar bulguya karışmasın. */
const yorumsuz = (k: string) =>
  k
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((l) => {
      const t = l.trim();
      return !t.startsWith('//') && !t.startsWith('*');
    })
    .join('\n');

/** Türkçe'ye özgü harfler — sabit metnin en güvenilir işareti. */
const TURKCE = /[çğıöşüÇĞİÖŞÜ]/;

test('ekranlarda ve bileşenlerde SABİT metin yok', () => {
  const suclular: string[] = [];
  for (const dizin of ['app', 'src/ui']) {
    for (const yol of dosyalar(join(kok, dizin))) {
      const kod = yorumsuz(readFileSync(yol, 'utf8'));
      const ad = yol.split('/mobile/')[1]!;
      // JSX metin düğümü: >Metin<
      for (const m of kod.matchAll(/>\s*([^<>{}\n]{3,60})\s*</g)) {
        const t = m[1]!.trim();
        if (TURKCE.test(t)) suclular.push(`${ad}: "${t}"`);
      }
      // Kullanıcıya görünen metin prop'ları
      for (const m of kod.matchAll(
        /(label|placeholder|title|accessibilityLabel|accessibilityHint)="([^"]{3,60})"/g,
      )) {
        if (TURKCE.test(m[2]!)) suclular.push(`${ad}: ${m[1]}="${m[2]}"`);
      }
    }
  }
  assert.deepEqual(
    suclular,
    [],
    `i18n'den geçmeyen metin:\n  ${suclular.join('\n  ')}\n` +
      "Hepsi t('anahtar') üzerinden gelmeli — yoksa dil değişince Türkçe kalır.",
  );
});

/*
 * KAYITLI HİZMET ADI.
 *
 * `Booking.service` hizmetin KİMLİĞİNİ değil METNİNİ saklıyor: randevu
 * kurulurken etiket o anki dilde donduruluyor. Ekran görüntüsünde arayüz
 * Rusça'yken hizmet "Saç boyama (kök) + Keratin / Botoks" kalıyordu.
 */

test('katalogdaki hizmet adı seçili dile çevriliyor', () => {
  assert.equal(hizmetAdiCevir('Saç boyama (kök)', 'ru'), 'Окрашивание (корни)');
  assert.equal(hizmetAdiCevir('Keratin / Botoks', 'ru'), 'Кератин / Ботокс');
  assert.equal(hizmetAdiCevir('Saç boyama (kök)', 'kk'), 'Шаш бояу (түбір)');
});

test('birleşik etiket parça parça çevriliyor', () => {
  // Ekran görüntüsündeki tam metin.
  assert.equal(
    hizmetEtiketiCevir('Saç boyama (kök) + Keratin / Botoks', 'ru'),
    'Окрашивание (корни) + Кератин / Ботокс',
  );
  // Ayraç korunuyor: kaybolursa iki hizmet tek uzun ad gibi okunur.
  assert.ok(hizmetEtiketiCevir('Saç boyama (kök) + Keratin / Botoks', 'ru').includes(' + '));
});

test('hizmet adının İÇİNDEKİ ayraçlardan bölünmüyor', () => {
  // "Keratin / Botoks" ve "Kesim & fön" adların KENDİSİNDE ayraç taşıyor;
  // onlardan bölmek adı ortadan ikiye keserdi.
  assert.equal(hizmetEtiketiCevir('Keratin / Botoks', 'ru'), 'Кератин / Ботокс');
  assert.equal(hizmetEtiketiCevir('Kesim & fön', 'ru'), 'Стрижка и укладка');
});

test('zaten çevrilmiş etiket bozulmuyor', () => {
  // Kayıt Rusça yazılmışsa ve arayüz Türkçe ise geri çevrilmeli.
  assert.equal(hizmetAdiCevir('Окрашивание (корни)', 'tr'), 'Saç boyama (kök)');
  // Aynı dile çevirmek kimliği değiştirmiyor.
  assert.equal(hizmetAdiCevir('Окрашивание (корни)', 'ru'), 'Окрашивание (корни)');
});

test('KATALOG DIŞI ad olduğu gibi kalıyor', () => {
  /*
   * Uzmanın kendi yazdığı serbest hizmet adının çevirisi YOK. Uydurmak
   * yerine kaynağın kendi sözcüğü gösteriliyor — yanlış çeviri üretmek
   * kullanıcıyı daha çok yanıltır.
   */
  assert.equal(hizmetAdiCevir('Roza özel bakım paketi', 'ru'), 'Roza özel bakım paketi');
  assert.equal(
    hizmetEtiketiCevir('Roza paketi + Keratin / Botoks', 'ru'),
    'Roza paketi + Кератин / Ботокс',
  );
});

test('boş ve bozuk girdi çökertmiyor', () => {
  assert.equal(hizmetAdiCevir('', 'ru'), '');
  assert.equal(hizmetEtiketiCevir('   ', 'ru'), '');
  // Bilinmeyen dil kodu varsayılana (tr) düşer.
  assert.equal(hizmetAdiCevir('Окрашивание (корни)', 'xx'), 'Saç boyama (kök)');
});
