import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { createQuoteRequestSchema } from './quotes.dto';

/**
 * ÇOKLU HİZMET TALEBİ — brief §4.5.
 *
 * "Çoklu hizmet talebi desteklenir (ör. düğün paketi: hair.event_hair +
 * makeup.bridal + nails.gel_polish). Tek talepte birden fazla alt hizmet
 * seçilebilir."
 *
 * Tek `serviceId` vardı: gelin paketi isteyen müşteri ÜÇ AYRI talep açmak
 * zorundaydı — üç teklif turu, üç pazarlık, aynı gün için birbirinden
 * habersiz üç randevu.
 */

const kaynak = readFileSync(join(import.meta.dirname, 'quotes.service.ts'), 'utf8');

test('DTO çoklu hizmet kabul ediyor', () => {
  const r = createQuoteRequestSchema.safeParse({
    category: 'hair',
    mode: 'describe',
    collectMin: 180,
    serviceIds: ['hair.event_hair', 'makeup.bridal', 'nails.gel_polish'],
  });
  assert.ok(r.success, 'çoklu hizmet reddedildi');
  assert.equal(r.data.serviceIds?.length, 3);
});

test('liste SINIRLI — okunamayacak talep yok', () => {
  // Sınırsız liste uzmana fiyatlayamayacağı bir talep gösterirdi.
  const cok = Array.from({ length: 9 }, (_, i) => `hair.h${i}`);
  assert.equal(
    createQuoteRequestSchema.safeParse({
      category: 'hair',
      mode: 'describe',
      collectMin: 180,
      serviceIds: cok,
    }).success,
    false,
    'dokuz hizmetlik talep kabul edildi',
  );
});

test('TEK hizmet hâlâ çalışıyor — eski istemciler bozulmuyor', () => {
  const r = createQuoteRequestSchema.safeParse({
    category: 'hair',
    mode: 'describe',
    collectMin: 180,
    serviceId: 'hair.haircut',
  });
  assert.ok(r.success);
});

test('KATALOGDA OLMAYAN kimlik saklanmıyor', () => {
  /*
   * Uzman ekranında karşılığı olmayan bir satır ("hair.olmayan")
   * görünürdü: adı çözülemez, teklif verilemez, yalnız kafa karıştırır.
   */
  const govde = kaynak.slice(
    kaynak.indexOf('async create('),
    kaynak.indexOf('async notifyNextWave'),
  );
  assert.match(govde, /\.filter\(\(id\) => altHizmetBul\(id\)\)/, 'katalog doğrulaması yok');
});

test('serviceId listenin İLKİ olarak saklanıyor — eski okuyanlar bozulmuyor', () => {
  /*
   * Uzman kartı, bildirim metni ve panel `serviceId`yi okuyor. Alan boş
   * bırakılsaydı çoklu talepler o ekranlarda hizmetsiz görünürdü.
   */
  const govde = kaynak.slice(
    kaynak.indexOf('async create('),
    kaynak.indexOf('async notifyNextWave'),
  );
  assert.match(govde, /serviceId: hizmetler\[0\] \?\? null/, 'birincil hizmet yazılmıyor');
  assert.match(govde, /serviceIdsJson: JSON\.stringify\(hizmetler\)/, 'liste saklanmıyor');
});

test('ESKİ kayıtta liste yoksa tek hizmetten türetiliyor', () => {
  /*
   * Geçiş öncesi talepler `serviceIdsJson` alanına sahip değil (varsayılan
   * boş dizi). Boş liste dönseydi o taleplerin hizmeti uzman ekranından
   * kaybolurdu.
   */
  const govde = kaynak.slice(kaynak.indexOf('serviceIds: (():'));
  assert.match(
    govde.slice(0, 500),
    /liste\.length \? liste : r\.serviceId \? \[r\.serviceId\] : \[\]/,
    'eski kayıt için tek hizmete düşülmüyor',
  );
});

test('BOZUK JSON talebi düşürmüyor', () => {
  // Tek bir bozuk satır tüm talep listesini çökertmemeli.
  const govde = kaynak.slice(kaynak.indexOf('serviceIds: (():'));
  assert.match(
    govde.slice(0, 600),
    /catch \{[\s\S]{0,120}return r\.serviceId/,
    'bozuk JSON yakalanmıyor',
  );
});

test('şema alanı VARSAYILANLI — eski satırlar okunabiliyor', () => {
  const sema = readFileSync(
    join(import.meta.dirname, '..', '..', 'prisma', 'schema.prisma'),
    'utf8',
  );
  const model = sema.slice(sema.indexOf('model QuoteRequest'));
  assert.match(
    model.slice(0, model.indexOf('\n}')),
    /serviceIdsJson\s+String\s+@default\("\[\]"\)/,
    'çoklu hizmet alanı varsayılansız — eski satırlar okunamaz',
  );
});
