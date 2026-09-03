import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

/**
 * YATAY TAŞMA — düğme satırları ekranı aşmamalı.
 *
 * Kurucu: "profilde kaymalar var." Ekran görüntüsünde profil düzenleme
 * ekranındaki fotoğraf düğmeleri ekrandan taşıyordu: soldaki "Galeriden"
 * ile sağdaki "Fotoğrafı kaldır" kenarlarda KESİLİYORDU.
 *
 * Sebep: "Arka planı temizle" eklenince dört düğme oldu ve satır sığmadı.
 * React Native `flexWrap` olmadan satırı KIRPAR, kaydırmaz — kullanıcı
 * kesilen düğmelere hiç ulaşamıyordu.
 *
 * Bu test aynı tuzağı UYGULAMA GENELİNDE arıyor: sarmayan ve kaymayan bir
 * düğme satırına yeni bir düğme eklendiğinde sessizce kesilir.
 */

const kok = join(__dirname, '..');

test('FOTOĞRAF DÜĞMELERİ satırı sarıyor', () => {
  const s = readFileSync(join(kok, 'app', 'profile', 'edit.tsx'), 'utf8');
  const i = s.indexOf('photoActions: {');
  assert.ok(i > 0, 'photoActions stili yok');
  const govde = s.slice(i, s.indexOf('},', i));
  assert.match(govde, /flexWrap: 'wrap'/, 'satır sarmıyor — düğmeler kesilir');
});

test('DÖRT düğmenin hepsi ekranda', () => {
  /*
   * Taşma çözümü "düğmeyi kaldırmak" olmamalı: dördü de gerekli.
   * Galeriden, Kamera, Arka planı temizle, Fotoğrafı kaldır.
   */
  const s = readFileSync(join(kok, 'app', 'profile', 'edit.tsx'), 'utf8');
  for (const k of [
    'profile.photo.gallery',
    'profile.photo.camera',
    'cutout.clean',
    'profile.photo.remove',
  ]) {
    assert.ok(s.includes(k), `düğme kaldırılmış: ${k}`);
  }
});

test('SERTİFİKA satırı da sarıyor', () => {
  // Sertifika sayısı kullanıcıdan geliyor; sabit bir satıra sığmaz.
  const s = readFileSync(join(kok, 'app', 'profile', 'edit.tsx'), 'utf8');
  const i = s.indexOf('certRow: {');
  if (i > 0) {
    assert.match(s.slice(i, s.indexOf('}', i)), /flexWrap: 'wrap'/, 'sertifika satırı sarmıyor');
  }
});
