import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { tr } from '@ayna/i18n';

/**
 * SELAMLAMA — kullanıcının adı.
 *
 * Kurucu: "uzman profılıne kullanıcı adı yazmıyor Gunaydın yazan ksımda."
 *
 * İki hata üst üsteydi ve ikisi de sessizdi:
 *   1. Selamlama metinleri ('Günaydın', 'İyi günler'…) isim için YER
 *      TUTUCU taşımıyordu — doldurulacak bir şey yoktu. Metinlerin kendi
 *      kontrolü `packages/i18n/src/selamlama.test.ts`te: buradan okunan
 *      `@ayna/i18n` derlenmiş çıktı, kaynak değil.
 *   2. Doldurma yanlış anahtarla çağrılıyordu (`name`), oysa uygulamanın
 *      kuralı `{ad}`. `fillParams` bilinmeyen anahtarı olduğu gibi
 *      bırakıyor, yani hata ne çöküyor ne uyarı veriyor.
 */

const oku = (p: string) => readFileSync(join(__dirname, '..', 'app', p), 'utf8');

test('uzman ana ekranı ADI gerçekten basıyor', () => {
  const k = oku('seller/reports.tsx');
  assert.match(k, /t\('benim\.hello\.named'\)/, 'isimli selamlama kullanılmıyor');
  assert.match(k, /ad: firstName/, "isim '{ad}' anahtarıyla verilmiyor");
  // Eski hâli: yer tutucusu olmayan metne yanlış anahtarla doldurma.
  assert.doesNotMatch(
    k,
    /fillParams\(t\(greetingKey\(\)\)/,
    'çıplak selamlamayı doldurmaya çalışıyor',
  );
});

test('adı olmayan hesapta boşta virgül kalmıyor', () => {
  const k = oku('seller/reports.tsx');
  assert.match(k, /firstName\s*\?/, 'ad boşken düz selamlamaya düşmüyor');
});

test('YER TUTUCUSU OLMAYAN metne doldurma yapılmıyor', () => {
  /*
   * Genel kalıp: `fillParams(t('x'), {...})` çağrısı, 'x' metninde hiç
   * yer tutucu yoksa sessizce hiçbir şey yapmaz. Hata görünmez olduğu
   * için tam da böyle kaçmıştı.
   */
  const metinler = tr as Record<string, string>;
  const kok = join(__dirname, '..', 'app');
  const suclular: string[] = [];
  const gez = (d: string) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const t = join(d, e.name);
      if (e.isDirectory()) gez(t);
      else if (e.name.endsWith('.tsx')) {
        const k = readFileSync(t, 'utf8');
        for (const m of k.matchAll(/fillParams\(\s*t\('([\w.]+)'\)/g)) {
          const metin = metinler[m[1]!];
          if (metin && !/\{\w+\}/.test(metin)) {
            suclular.push(`${t.split('/app/')[1]} → '${m[1]}'`);
          }
        }
      }
    }
  };
  gez(kok);
  assert.deepEqual(suclular, [], `yer tutucusuz metne doldurma: ${suclular.join(', ')}`);
});
