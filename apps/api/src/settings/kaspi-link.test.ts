import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * §4.4 — KASPİ BAĞLANTISI: para gideceği yer.
 *
 * Yanlış bir adres, müşterinin parasını başka bir hesaba göndermek demek.
 * Bu yüzden hem biçimi hem "varsayılan, dayatma değil" davranışı bekçileniyor.
 */

const sql = readFileSync(
  join(import.meta.dirname, '..', '..', 'prisma', 'pre-push', '02-kaspi-link.sql'),
  'utf8',
);

test('bağlantı Kaspi işyeri QR biçiminde', () => {
  const m = /https:\/\/qr\.kaspi\.kz\/\d+/.exec(sql);
  assert.ok(m, 'Kaspi işyeri QR adresi yok ya da biçimi farklı');
  assert.ok(m[0].length > 30, 'işyeri kimliği fazla kısa — yanlış hesaba gider');
});

test('panelden değiştirilen değeri EZMİYOR', () => {
  // Bu bir varsayılan. Kurucu paneli kullanıp adresi değiştirdiğinde ya da
  // özelliği kapattığında, sonraki her dağıtım onu geri getirmemeli.
  assert.match(sql, /ON CONFLICT \("key"\) DO NOTHING/, 'dağıtım paneli eziyor');
  assert.ok(!/UPDATE\s+"settings"/i.test(sql), 'mevcut değeri güncelliyor');
});

test('tablo yokken sessizce geçiyor', () => {
  // İlk kurulumda `settings` henüz yok; dosya her açılışta çalışacağı için
  // patlamamalı, yoksa API hiç açılmaz.
  assert.match(sql, /information_schema\.tables WHERE table_name = 'settings'/);
});

test('dağıtım bu dosyayı çalıştırıyor', () => {
  const dockerfile = readFileSync(
    join(import.meta.dirname, '..', '..', '..', '..', 'Dockerfile'),
    'utf8',
  );
  assert.match(dockerfile, /prisma\/pre-push\/\*\.sql/, 'pre-push dosyaları çalıştırılmıyor');
  // db push'tan ÖNCE olmalı (durum eşlemesi bunu gerektiriyor).
  const i = dockerfile.indexOf('pre-push');
  const j = dockerfile.indexOf('prisma db push');
  assert.ok(i > 0 && i < j, 'pre-push, db push’tan sonra çalışıyor');
});
