/**
 * SALON ALAN SETİ — kayıtta seçilen alanlar keşif kaydına yazılıyor mu.
 *
 * Bulgu: salon kayıtta birden çok hizmet alanı seçiyor (ekran en az birini
 * zorunlu tutuyor) ve bunlar `categories` olarak sunucuya ULAŞIYORDU — ama
 * `Professional.sectors` alanına hiç yazılmıyordu.
 *
 * Sonuç: `servesSector` boş sette tek `sector`e düşüyor. Saç + tırnak yapan
 * salon yalnız saçta görünüyor, tırnak süzgecinde kayboluyordu. Canlıda
 * HER salonun alan seti boştu.
 */

import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { servesSector } from '@ayna/domain';
import { registerBusinessSchema } from './businesses.dto';

const servis = readFileSync(join(import.meta.dirname, 'businesses.service.ts'), 'utf8');

test('onayda keşif kaydına ALAN SETİ yazılıyor', () => {
  assert.match(
    servis,
    /\.\.\.\(b\.categories\.length \? \{ sectors: b\.categories \} : \{\}\)/,
    'salon alan seti keşif kaydına yazılmıyor — kategori süzgecinde kaybolur',
  );
});

/*
 * GEÇERLİ bir kayıt gövdesi — testler yalnız `categories`i değiştiriyor.
 *
 * İlk yazımda eksik alanlı bir gövde kullanmıştım: kayıt zaten başka
 * sebeplerden reddediliyordu, yani test YANLIŞ SEBEPLE geçiyordu ve
 * "alanı opsiyonel yap" mutasyonunu YAKALAYAMADI.
 */
const gecerliKayit = {
  name: 'Test Salon',
  ownerName: 'Sahip Kişi',
  phone: '+77001234567',
  password: 'gizli123',
  sector: 'hair',
  city: 'Almatı',
  district: 'Medeu',
  address: 'Abay caddesi 10',
  // ИП: BİN/IIN 12 hane + resmî ad zorunlu (superRefine).
  entityType: 'ip' as const,
  bin: '123456789012',
  legalName: 'Test Salon ИП',
};

test('geçerli gövde ALANLA kabul ediliyor', () => {
  // Referans: aşağıdaki reddin sebebi gerçekten `categories` olsun.
  const r = registerBusinessSchema.safeParse({ ...gecerliKayit, categories: ['hair'] });
  assert.ok(r.success, 'geçerli kayıt reddediliyor — test gövdesi bozuk');
});

test('en az bir hizmet alanı ZORUNLU', () => {
  // Kurucu: "kayıtta hizmetleri zorunlu yap." Ekran zaten istiyordu;
  // sunucu alansız kaydı kabul ediyordu.
  const bos = registerBusinessSchema.safeParse({ ...gecerliKayit, categories: [] });
  assert.equal(bos.success, false, 'boş alan listesi geçiyor');

  const yok = registerBusinessSchema.safeParse(gecerliKayit);
  assert.equal(yok.success, false, 'alan hiç gönderilmeden kayıt geçiyor');
});

test('alan seti çoklu kategoriyi KORUYOR', () => {
  /*
   * Asıl kayıp buydu: tek `sector` yalnız ilk kategoriyi tutuyor.
   * `sectors` dolu olunca salon her alanında görünüyor.
   */
  const salon = { sector: 'hair', sectors: ['hair', 'nails'] };
  assert.equal(servesSector(salon, 'hair'), true);
  assert.equal(servesSector(salon, 'nails'), true, 'ikinci alan kayboluyor');

  // Eski kayıt (set boş) tek alanına düşüyor — geçişte kimse kaybolmasın.
  const eski = { sector: 'hair', sectors: [] as string[] };
  assert.equal(servesSector(eski, 'hair'), true);
  assert.equal(servesSector(eski, 'nails'), false);
});
