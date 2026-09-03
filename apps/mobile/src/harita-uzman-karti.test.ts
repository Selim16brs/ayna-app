/**
 * HARİTADAN AÇILAN UZMAN KARTI — boş profil hâli.
 *
 * Kurucu: "haritada uzman seçildiğinde açılan ekran bu şekilde boş, yani
 * kalitesiz çıkıyor."
 *
 * SEBEP YERLEŞİM DEĞİL VERİ: canlıda 25 uzmanın 24'ünde hizmet listesi,
 * 22'sinde tanıtım, 23'ünde galeri yok. Karttaki her blok koşullu olduğu
 * için hiçbiri çizilmiyor, ekranda kocaman bir boşluk kalıyordu.
 *
 * Boşluğu DOLGU İÇERİKLE kapatmak yanlış olurdu — olmayan bilgiyi varmış
 * gibi göstermek. Durum söyleniyor ve işe yarar bir yol açılıyor.
 */

import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const kok = join(import.meta.dirname, '..');
const ekran = readFileSync(join(kok, 'app/map.tsx'), 'utf8');
const sozluk = readFileSync(join(kok, '../../packages/i18n/src/messages/tr.ts'), 'utf8');

test('boş profil TESPİT ediliyor', () => {
  assert.match(ekran, /const profilBos =/, 'boş profil tespiti yok');
  // Üç işaret de aranmalı: yalnız hizmete bakmak, tanıtımı olan ama
  // listesi olmayan uzmanı da "boş" sayardı.
  for (const kosul of [
    'detail.services.length === 0',
    '!detail.about',
    'detail.portfolio.length === 0',
  ]) {
    assert.ok(ekran.includes(kosul), `boş profil koşulu eksik: ${kosul}`);
  }
});

test('boş ekran yerine DURUM yazılıyor', () => {
  assert.match(ekran, /'pro\.incomplete\.title'/, 'boş profil açıklaması yok');
  assert.ok(sozluk.includes("'pro.incomplete.title':"), 'metin sözlükte yok');
  assert.ok(sozluk.includes("'pro.incomplete.body':"), 'açıklama sözlükte yok');
});

test('boşluk UYDURMA içerikle doldurulmuyor', () => {
  /*
   * Olmayan hizmet/fiyat/yorum üretmek kullanıcıyı yanıltır. Bloklar
   * koşullu kalmalı: veri yoksa çizilmemeli.
   */
  for (const kosul of [
    'detail.services.length > 0 ?',
    'detail.about ?',
    'detail.reviewCount > 0 ?',
  ]) {
    assert.ok(ekran.includes(kosul), `koşul kaldırılmış: ${kosul} — boş veri çizilir`);
  }
});

test('EYLEM profile göre değişiyor', () => {
  /*
   * Hizmet listesi olmayan uzmanda "Randevu al" kullanıcıyı seçecek
   * hiçbir şeyin olmadığı ekrana götürüyordu. Teklif yolu çalışıyor.
   */
  assert.match(ekran, /profilBos \? \(/, 'eylem profile göre değişmiyor');
  assert.match(ekran, /'pro\.incomplete\.cta'/, 'teklif yolu sunulmuyor');
  assert.match(ekran, /router\.push\('\/quote'\)/, 'teklif ekranına gitmiyor');
  // Profili açma yolu KAYBOLMAMALI: kullanıcı yine de bakmak isteyebilir.
  assert.match(ekran, /'pro\.incomplete\.open'/, 'profili açma yolu kalkmış');
});

test('dolu profilde eylem DEĞİŞMİYOR', () => {
  // Hizmeti olan uzmanda akış eskisi gibi: randevu al → profil.
  assert.match(ekran, /'map\.book'/, 'dolu profilde randevu düğmesi kalkmış');
});
