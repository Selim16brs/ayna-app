import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * TEST HESABI BETİĞİ — üretimde iz bırakmamalı ve parola sızdırmamalı.
 */

const src = readFileSync(
  join(import.meta.dirname, '..', '..', 'scripts', 'test-hesaplari.ts'),
  'utf8',
);

test('parolalar EKRANA basılmıyor', () => {
  // Terminal kaydı, ekran görüntüsü ve CI logları üzerinden sızar.
  assert.ok(!/console\.log\([^)]*parola/i.test(src), 'parola loglanıyor');
  assert.match(src, /writeFileSync\(/, 'parolalar dosyaya yazılmıyor');
  assert.match(src, /mode: 0o600/, 'dosya izni herkese açık');
});

test('idempotent — ikinci çalıştırma ikinci hesap açmıyor', () => {
  assert.match(src, /prisma\.user\.upsert/, 'kullanıcı upsert edilmiyor');
  assert.ok(!/prisma\.user\.create\(/.test(src), 'düz create — tekrar çalışınca çakışır');
});

test('temizleme yolu var — yayına çıkmadan silinebiliyor', () => {
  assert.match(src, /--sil/, 'silme yolu yok');
  assert.match(src, /prisma\.user\.delete/, 'kullanıcı silinmiyor');
});

test('uzman hesabı TAM: KYC onaylı, hizmet listesi, sertifikalar', () => {
  assert.match(src, /kycStatus: t\.rol === 'professional' \? 'approved'/, 'KYC onaylı değil');
  assert.match(src, /servicesJson: JSON\.stringify\(HIZMETLER\)/, 'hizmet listesi yok');
  assert.match(src, /certificates: SERTIFIKALAR/, 'sertifika yok');
});

test('her rol × her katman kapsanıyor', () => {
  for (const k of ['free', 'premium', 'platinum']) {
    const n = (src.match(new RegExp(`katman: '${k}'`, 'g')) ?? []).length;
    assert.equal(n, 2, `${k}: müşteri ve uzman için birer hesap olmalı (bulunan: ${n})`);
  }
});

test('süresi geçmiş üyelik testi bozmasın — bitiş ileri tarihli', () => {
  // `membershipUntil` geçmişte kalırsa platinum kapısı reddeder ve test
  // hesabı "platinum" görünmesine rağmen özellikler kapalı gelir.
  assert.match(src, /membershipUntil: t\.katman === 'free' \? null : new Date\(Date\.now\(\) \+/);
});
