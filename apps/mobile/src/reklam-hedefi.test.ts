/**
 * REKLAM HEDEFİ ve BULUNAMAYAN PROFİL.
 *
 * Kurucu: "senin için seçtiklerimize tıklayınca hiçbir şey açılmıyor."
 *
 * İKİ ayrı hata vardı:
 *   1. İstemci reklam siparişinde `currentUser.id` — yani KULLANICI
 *      kimliği — gönderiyordu; sunucu doğrulamadan `pro_id` alanına
 *      yazıyordu. Kart olmayan bir uzmana gidiyordu.
 *   2. Uzman ekranı bulunamayan kaydı "henüz gelmedi" sanıp SONSUZA KADAR
 *      dönüyordu. Uygulamanın kendi kuralı bunu yasaklıyor: "uygulama
 *      donmaz, sonsuz spinner göstermez."
 *
 * Biri düzelse öteki kalsa yine kötü: doğru kimlikle bile silinmiş bir
 * uzmana gidilebilir ve ekran yine kilitlenir. İkisi de bekçili.
 */

import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const kok = join(import.meta.dirname, '..');
const oku = (y: string) => readFileSync(join(kok, y), 'utf8');

const reklamEkrani = oku('app/seller/ads.tsx');
const uzmanEkrani = oku('app/professional/[id].tsx');
const istemci = oku('src/api.ts');
const katalog = oku('src/catalog.ts');

test('istemci reklam siparişinde KİMLİK GÖNDERMİYOR', () => {
  // `proId: currentUser?.id` hatanın ta kendisiydi.
  assert.ok(
    !/proId:\s*currentUser/.test(reklamEkrani),
    'reklam siparişi hâlâ kullanıcı kimliğini uzman kimliği diye gönderiyor',
  );
  const i = istemci.indexOf('createAdOrder');
  const imza = istemci.slice(i, istemci.indexOf('=> post', i));
  assert.ok(!/\bproId\b/.test(imza), 'api istemcisi hâlâ proId kabul ediyor');
});

test('reklam AÇIKLAMASI toplanıyor ve gönderiliyor', () => {
  // Kurucu: "reklamın neyi anlattığını anlatan bir alan olmalı."
  assert.match(reklamEkrani, /'ads\.f\.description'/, 'açıklama alanı ekranda yok');
  assert.match(reklamEkrani, /description: aciklama\.trim\(\)/, 'açıklama siparişe eklenmiyor');
  assert.match(reklamEkrani, /multiline/, 'açıklama tek satıra sıkıştırılmış');
  const i = istemci.indexOf('createAdOrder');
  assert.ok(
    /description\?: string;/.test(istemci.slice(i, i + 400)),
    'api istemcisi açıklamayı taşımıyor',
  );
});

test('uzman ekranı BULUNAMADI ile YÜKLENİYOR’u ayırıyor', () => {
  assert.match(katalog, /export function useProfessionalDurumu/, 'durum ayrımı yok');
  assert.match(uzmanEkrani, /durum === 'yok'/, 'ekran bulunamadı durumunu karşılamıyor');
  // Çıkışı olmalı: kullanıcı geri düğmesinden başka yol bulamıyordu.
  assert.match(uzmanEkrani, /'pro\.not_found\.cta'/, 'bulunamadı ekranının çıkışı yok');
});

test('durum hook’u AYNI sorgu anahtarını kullanıyor — ikinci istek yok', () => {
  const i = katalog.indexOf('useProfessionalDurumu');
  const govde = katalog.slice(i, katalog.indexOf('}', katalog.indexOf('return', i)));
  assert.ok(
    govde.includes("queryKey: ['professional', id]"),
    'ayrı anahtar kullanılıyor — aynı profil iki kez çekilir',
  );
});
