import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { renderPush, type PushTemplateKey } from './push.templates';

/**
 * SUNUCUDAN GİDEN BİLDİRİMLER ÜÇ DİLDE.
 *
 * Kurucu: "kk/ru çeviri turu başlat."
 *
 * Uygulamanın kendi sözlüğü zaten üç dilde tamdı; eksik olan SUNUCUDAN
 * giden bildirimlerdi: 34 yerde Türkçe cümle koda gömülüydü ve Kazak ya
 * da Rus kullanıcı telefonunda Türkçe bildirim alıyordu.
 */

const kok = join(__dirname, '..');
const gez = (d: string): string[] =>
  readdirSync(d).flatMap((ad) => {
    const tam = join(d, ad);
    return statSync(tam).isDirectory() ? gez(tam) : tam.endsWith('.ts') ? [tam] : [];
  });

test('HAM push YALNIZ kullanıcı metni taşıyan iki yerde', () => {
  /*
   * `sendToUser` ham başlık/gövde alıyor. Yalnız İKİ yerde meşru:
   *   · mesajlaşma — başlık gönderenin ADI, gövde kullanıcının YAZDIĞI
   *     mesaj; şablona sokmak kullanıcının cümlesini bizimkiyle
   *     değiştirmek olurdu.
   *   · Always duyurusu — metni uzman yazıyor.
   * Bunların dışındaki her bildirim şablondan geçmeli.
   */
  const suclu = gez(kok)
    .filter((f) => !f.includes('.test.') && !f.endsWith('push.service.ts'))
    .filter((f) => /\.sendToUser\(/.test(readFileSync(f, 'utf8')))
    .map((f) => f.slice(kok.length + 1));
  assert.deepEqual(
    suclu.sort(),
    ['always/always.service.ts', 'messaging/messaging.service.ts'],
    'şablona taşınmamış bildirim var (Kazak/Rus kullanıcı Türkçe alır)',
  );
});

test('HER ŞABLON ÜÇ DİLDE de DOLU ve TÜRKÇEDEN FARKLI', () => {
  /*
   * Eksik dilde sessizce Türkçeye düşülüyor: çeviri unutulursa kimse fark
   * etmez. Bu test her anahtarı üç dilde de çözüp Türkçesiyle
   * karşılaştırıyor.
   *
   * İSTİSNA: içinde yalnız marka adı ve yer tutucu olan metinler üç dilde
   * aynı olabilir — çeviri eksikliği değil, çevrilecek sözcük yokluğu.
   */
  const kaynak = readFileSync(join(__dirname, 'push.templates.ts'), 'utf8');
  const anahtarlar = [...kaynak.matchAll(/^ {2}\| '([^']+)'/gm)].map(
    (m) => m[1] as PushTemplateKey,
  );
  assert.ok(anahtarlar.length >= 40, `şablon sayısı beklenenden az: ${anahtarlar.length}`);

  const eksik: string[] = [];
  for (const k of anahtarlar) {
    const tr = renderPush('tr', k);
    for (const dil of ['kk', 'ru'] as const) {
      const c = renderPush(dil, k);
      assert.ok(c.title.trim() && c.body.trim(), `${dil}/${k}: boş`);
      if (c.title === tr.title && c.body === tr.body) eksik.push(`${dil}/${k}`);
    }
  }
  assert.deepEqual(eksik, [], 'bu şablonlar çevrilmemiş (Türkçeyle birebir aynı)');
});

test('YER TUTUCULAR üç dilde de AYNI', () => {
  /*
   * Çeviride `{slot}` düşerse o bilgi o dilde HİÇ görünmez: kullanıcı
   * "randevu oluştu" der ama hangi saate olduğunu okuyamaz. Sessiz kayıp.
   */
  const kaynak = readFileSync(join(__dirname, 'push.templates.ts'), 'utf8');
  const anahtarlar = [...kaynak.matchAll(/^ {2}\| '([^']+)'/gm)].map(
    (m) => m[1] as PushTemplateKey,
  );
  const yerTutucu = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
  const bozuk: string[] = [];
  for (const k of anahtarlar) {
    const tr = renderPush('tr', k);
    const beklenen = JSON.stringify([...yerTutucu(tr.title), ...yerTutucu(tr.body)]);
    for (const dil of ['kk', 'ru'] as const) {
      const c = renderPush(dil, k);
      const olan = JSON.stringify([...yerTutucu(c.title), ...yerTutucu(c.body)]);
      if (olan !== beklenen) bozuk.push(`${dil}/${k}: ${olan} ≠ ${beklenen}`);
    }
  }
  assert.deepEqual(bozuk, [], 'yer tutucular dillere göre değişiyor');
});

test('BİLİNMEYEN DİL Türkçeye düşüyor — boş bildirim gitmiyor', () => {
  const c = renderPush('de', 'booking.confirmed');
  assert.equal(c.title, renderPush('tr', 'booking.confirmed').title);
});
