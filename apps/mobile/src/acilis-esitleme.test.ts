import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import type { UzakKatalog } from '@ayna/domain';
import { acilisKatalogunuEsitle, acilisOlcumuGonder } from './acilis-esitleme';

/** UZAK KATALOG EŞİTLEMESİ — brief §7.1 / §7.3. */

const yuk = (surum: string) => ({
  surum,
  mesajlar: [{ id: 'u1', grup: 'A', etiket: 'neutral', metin: { tr: 'a', kk: 'b', ru: 'c' } }],
});

function kur(cevap: () => Promise<unknown>) {
  const yazilan: UzakKatalog[] = [];
  return { yazilan, indir: cevap, yaz: (k: UzakKatalog) => void yazilan.push(k) };
}

test('GEÇERLİ katalog iniyor ve yazılıyor', async () => {
  const { yazilan, indir, yaz } = kur(() => Promise.resolve(yuk('v1')));
  await acilisKatalogunuEsitle(indir, null, yaz);
  assert.equal(yazilan.length, 1);
  assert.equal(yazilan[0]!.surum, 'v1');
});

test('AĞ HATASI eldeki kataloğu BOZMUYOR', async () => {
  /*
   * En kritik davranış: uçak modunda açılan uygulamada eşitleme
   * patlıyor. Hata yutulmasaydı açılış akışı kırılırdı; katalog
   * silinseydi kullanıcı bir sonraki açılışta eski pakete düşerdi.
   */
  const { yazilan, indir, yaz } = kur(() => Promise.reject(new Error('ağ yok')));
  await acilisKatalogunuEsitle(indir, yuk('v1') as never, yaz);
  assert.equal(yazilan.length, 0);
});

test('BOZUK gövde yazılmıyor', async () => {
  for (const bozuk of [
    null,
    {},
    { surum: 'v2', mesajlar: 'liste-değil' },
    { surum: 'v2', mesajlar: [] },
  ]) {
    const { yazilan, indir, yaz } = kur(() => Promise.resolve(bozuk));
    await acilisKatalogunuEsitle(indir, null, yaz);
    assert.equal(yazilan.length, 0, JSON.stringify(bozuk));
  }
});

test('AYNI SÜRÜM yeniden yazılmıyor', async () => {
  const { yazilan, indir, yaz } = kur(() => Promise.resolve(yuk('v1')));
  await acilisKatalogunuEsitle(indir, { surum: 'v1', mesajlar: [] } as never, yaz);
  assert.equal(yazilan.length, 0);
});

test('SÜRÜM DEĞİŞİNCE yazılıyor', async () => {
  const { yazilan, indir, yaz } = kur(() => Promise.resolve(yuk('v2')));
  await acilisKatalogunuEsitle(indir, { surum: 'v1', mesajlar: [] } as never, yaz);
  assert.equal(yazilan[0]!.surum, 'v2');
});

test('ÖLÇÜM hatası kullanıcıya yansımıyor', async () => {
  // Yakalanmamış reddetme olsaydı bu çağrı süreci uyarıyla kirletirdi.
  acilisOlcumuGonder(() => Promise.reject(new Error('500')), 'msg_01', 'tr', true);
  await new Promise((r) => setTimeout(r, 10));
});

test('ÖLÇÜM gövdesi kişiye ait alan taşımıyor', () => {
  let gonderilen: unknown = null;
  acilisOlcumuGonder(
    (g) => {
      gonderilen = g;
      return Promise.resolve(undefined);
    },
    'msg_01',
    'tr',
    true,
  );
  assert.deepEqual(Object.keys(gonderilen as object).sort(), ['atlandi', 'code', 'locale']);
});

test('ÖLÇÜM isteği OTURUM BAŞLIĞI göndermiyor', () => {
  /*
   * `post()` yardımcısı token'ı kendiliğinden ekliyor. Onu kullansaydık
   * sunucu, istemese de, hangi mesajı KİMİN gördüğünü bilebilecek
   * konuma gelirdi. İstek elle kuruluyor ve yalnız Content-Type taşıyor.
   */
  const k = readFileSync(join(__dirname, 'api.ts'), 'utf8');
  const blok = k.slice(k.indexOf('splashOlcum:'), k.indexOf('splashOlcum:') + 600);
  assert.doesNotMatch(blok, /authHeader/, 'ölçüm isteğine oturum başlığı ekleniyor');
  assert.match(blok, /headers: \{ 'Content-Type': 'application\/json' \}/);
});

test('EŞİTLEME mesaj SEÇİLDİKTEN SONRA başlıyor — açılışı beklemiyor', () => {
  const k = readFileSync(join(__dirname, '..', 'app', '_layout.tsx'), 'utf8');
  const secim = k.indexOf('const sonuc = acilisMesajiHazirla(');
  const esitleme = k.indexOf('acilisKatalogunuEsitle(');
  assert.ok(secim > 0 && esitleme > secim, 'eşitleme seçimden ÖNCE çağrılıyor — açılış beklerdi');
  assert.match(k, /void acilisKatalogunuEsitle\(/, 'eşitleme await ediliyor — açılışı bekletir');
});

test('SEÇİM uzak kataloğu kullanıyor', () => {
  const k = readFileSync(join(__dirname, '..', 'app', '_layout.tsx'), 'utf8');
  const cagri = k.slice(
    k.indexOf('const sonuc = acilisMesajiHazirla('),
    k.indexOf('st.setSonAcilis'),
  );
  assert.match(cagri, /katalog: gecerliKatalog\(st\.acilisKatalog\)/);
});
