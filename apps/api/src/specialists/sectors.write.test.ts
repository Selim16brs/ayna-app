import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { registerSpecialistSchema } from './specialists.dto';

/**
 * Uzmanın HANGİ ALANLARDA hizmet verdiği sunucuya YAZILMALI.
 *
 * Kullanıcı bildirimi: _"her uzman her alanda değil sadece kendi girdikleri
 * alanlarda çıkmalı; bir yogacı ile nail artist aynı ekranda çıkmamalı"_.
 *
 * İki ayrı sebep vardı:
 *  1) Kayıt ekranı hizmet listesini HİÇ göndermiyordu ("Faz 9'da yazılacak"
 *     notu). servicesJson boş kalıyordu.
 *  2) Boş liste görünce public profil sektörün VARSAYILAN menüsünü uyduruyor,
 *     uzmanın hiç seçmediği hizmetleri fiyatlarıyla listeliyordu.
 *
 * Bu test iki yolun da geri kaymasını engeller.
 */

const kok = join(import.meta.dirname, '..');
const oku = (yol: string) => readFileSync(join(kok, yol), 'utf8');

test('kayıt DTO’su hizmet listesini kabul eder', () => {
  const r = registerSpecialistSchema.safeParse({
    name: 'Test Uzman',
    phone: '+77001234567',
    password: 'gizli123',
    kind: 'independent',
    services: [{ id: 'nails-art', name: 'Nail art', price: 13000, durationMin: 90 }],
  });
  assert.ok(r.success, `DTO reddetti: ${!r.success ? JSON.stringify(r.error.issues) : ''}`);
  assert.equal(r.success && r.data.services?.length, 1);
});

test('bozuk hizmet satırı reddedilir — sıfır süre randevu takvimini kırardı', () => {
  const r = registerSpecialistSchema.safeParse({
    name: 'Test Uzman',
    phone: '+77001234567',
    password: 'gizli123',
    kind: 'independent',
    services: [{ id: 'nails-art', name: 'Nail art', price: 13000, durationMin: 0 }],
  });
  assert.equal(r.success, false);
});

/*
 * HİZMET LİSTESİ ARTIK ZORUNLU (kurucu kararı).
 *
 * Alan opsiyoneldi ve 25 kayıttan 24'ü boş geçmişti: haritadan ya da
 * aramadan gelen kullanıcı seçecek hiçbir şey bulamıyor, uzmanın kartı
 * bomboş açılıyordu. Bu test eskiden boş kaydın GEÇERLİ olduğunu şart
 * koşuyordu; premisi değişti.
 */
test('hizmet listesi OLMADAN kayıt reddediliyor', () => {
  const r = registerSpecialistSchema.safeParse({
    name: 'Test Uzman',
    phone: '+77001234567',
    password: 'gizli123',
    kind: 'independent',
  });
  assert.equal(r.success, false, 'hizmetsiz kayıt hâlâ geçiyor');
});

test('BOŞ hizmet dizisi de reddediliyor', () => {
  // `services: []` göndermek alanı atlamanın kılık değiştirmiş hâli.
  const r = registerSpecialistSchema.safeParse({
    name: 'Test Uzman',
    phone: '+77001234567',
    password: 'gizli123',
    kind: 'independent',
    services: [],
  });
  assert.equal(r.success, false, 'boş liste kabul ediliyor');
});

test('tek hizmetle kayıt GEÇERLİ — zorunluluk kaydı kilitlemiyor', () => {
  const r = registerSpecialistSchema.safeParse({
    name: 'Test Uzman',
    phone: '+77001234567',
    password: 'gizli123',
    kind: 'independent',
    services: [{ id: 'hair-cut', name: 'Kesim & fön', price: 9000, durationMin: 60 }],
  });
  assert.ok(r.success, 'tek hizmetli kayıt reddediliyor');
});

test('kayıt servisi servicesJson ve sectors yazıyor', () => {
  const src = oku('specialists/specialists.service.ts');
  assert.ok(src.includes('servicesJson:'), 'kayıtta servicesJson yazılmıyor');
  assert.ok(src.includes('sectors:'), 'kayıtta alan seti yazılmıyor');
  assert.ok(
    src.includes('sectorsFromServiceIds'),
    'alan seti hizmet listesinden türetilmiyor — ikisi ayrışır',
  );
});

test('hizmet güncellemesi alan setini de tazeler', () => {
  // Ayrı tutulsaydı, uzman tırnak hizmetlerini silince tırnak aramasında
  // görünmeye devam ederdi.
  const src = oku('specialists/specialists.service.ts');
  const m = /async setMyServices[\s\S]*?\n {2}\}/.exec(src);
  assert.ok(m, 'setMyServices bulunamadı');
  assert.ok(/sectorsFromServiceIds/.test(m[0]), 'setMyServices alan setini güncellemiyor');
});

test('public profil GERÇEK hesapta menü UYDURMAZ', () => {
  // Uydurma fiyat, uydurma vaattir: müşteri uzmanın vermediği bir hizmeti
  // seçip randevu alabiliyordu.
  const src = oku('catalog/catalog.service.ts');
  const m = /const own = safeParseServices\(p\.servicesJson\);[\s\S]{0,400}?;\n/.exec(src);
  assert.ok(m, 'hizmet listesi seçimi bulunamadı');
  assert.ok(
    /gercekHesap|ownerLink/.test(m[0]),
    'şablon menü hâlâ koşulsuz uygulanıyor — gerçek hesapta uydurma hizmet çıkar',
  );
});

test('liste yanıtı alan setini taşıyor', () => {
  const src = oku('catalog/catalog.service.ts');
  assert.ok(/sectors: p\.sectors/.test(src), 'mapPro alan setini dışa vermiyor');
});
