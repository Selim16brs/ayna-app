import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

/**
 * CANLI VERİ DÜZELTMESİ — GUARD'I OLMAYAN UPDATE YAZILAMAZ.
 *
 * Çalışma saatleri ekranı pazarı uzman adına kapatıyordu; kod düzeltildi ama
 * mevcut kayıtlarda pazar kapalı kaldı (canlıda doğrulandı: pazar günü
 * `{"slots":[],"closed":true}`).
 *
 * Düzeltme SQL'i tehlikeli olabilirdi: pazarı BİLEREK kapatmış bir uzmanın
 * kararını ezmek, aynı hatayı ters yönde yapmak olurdu. Bu yüzden yalnız
 * kaydın TAM OLARAK eski varsayılan desene uyduğu satırlar düzeltiliyor.
 *
 * Bu test, SQL'in ileride "hepsini aç" hâline gelmesini engelliyor.
 */

const sql = readFileSync(
  new URL('../../prisma/pre-push/23-pazar-kapali-duzeltme.sql', import.meta.url),
  'utf8',
);

test('SQL yalnız ESKİ VARSAYILAN deseni düzeltiyor', () => {
  assert.match(sql, /UPDATE professionals/);
  // Desen karşılaştırması: koşulsuz bir UPDATE olamaz.
  assert.match(sql, /eski_desen/, 'desen karşılaştırması yok — blanket UPDATE');
  assert.match(sql, /jsonb_array_elements/, 'JSON içeriği karşılaştırılmıyor');
});

test('SIRA FARKI yok sayılıyor', () => {
  // Aynı yedi satır farklı sırada kaydedilmiş olabilir; sıraya duyarlı bir
  // karşılaştırma o kayıtları düzeltmeden bırakırdı.
  assert.match(sql, /ORDER BY \(x->>'wd'\)::int/);
});

test('DÜZELTİLEN desende pazar AÇIK, saatler korunuyor', () => {
  const yeni = /yeni_desen[\s\S]*?';/.exec(sql)?.[0] ?? '';
  assert.match(yeni, /"wd":0,"open":true/, 'pazar açılmıyor');
  assert.ok(!/"open":false/.test(yeni), 'yeni desende kapalı gün var');
  assert.ok(!/"from":"(?!10:00)/.test(yeni), 'varsayılan pencere değişmiş');
});

test('TABLO YOKSA sessizce çıkıyor — kurulum sırası bozulmuyor', () => {
  assert.match(sql, /information_schema\.tables WHERE table_name = 'professionals'/);
});
