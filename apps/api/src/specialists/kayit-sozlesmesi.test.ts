import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { registerSpecialistSchema } from './specialists.dto';

/**
 * UZMAN KAYIT SÖZLEŞMESİ — uygulamanın GÖNDERDİĞİ, sunucunun KABUL ETTİĞİ.
 *
 * ── BU DOSYA GERÇEK BİR ARIZADAN DOĞDU ──────────────────────────────────
 *
 * Brief §4.1 ile uygulama hizmet satırlarını `serviceId` ile göndermeye
 * başladı. Bu şema hâlâ `id` ZORUNLU tutuyordu ve kayıt TÜMDEN
 * REDDEDİLİYORDU: hizmet seçen her uzman "Geçersiz veri" alıyor, kaydını
 * tamamlayamıyordu. Canlıya çıktı.
 *
 * Hiçbir test yakalamadı çünkü hiçbiri UYGULAMANIN GÖNDERDİĞİ gövdeyi
 * sunucunun ŞEMASINDAN geçirmiyordu: mobil tarafta tipler kendi içinde
 * tutarlıydı, sunucu tarafında şema kendi içinde tutarlıydı, aradaki
 * sözleşmeye kimse bakmıyordu.
 */

/** Uygulamanın kayıt gövdesi — zorunlu alanlar. */
const GOVDE = {
  name: 'Test Uzman',
  phone: '+77001234567',
  password: 'Test12345!',
  city: 'Almatı',
  kind: 'independent' as const,
  entityType: 'freelance' as const,
  certificates: [],
  sector: 'hair',
};

test('UYGULAMANIN gönderdiği alan adı şemada kabul ediliyor', () => {
  /*
   * Alan adı mobil kaynaktan OKUNUYOR, elle yazılmıyor: elle yazsaydım
   * uygulama adı değiştirdiğinde test yine geçer ve arıza yine kaçardı.
   */
  const mobil = readFileSync(
    join(import.meta.dirname, '..', '..', '..', 'mobile', 'src', 'api.ts'),
    'utf8',
  );
  const m = mobil.match(/services\?: \{ (\w+): string; name: string/);
  assert.ok(m, 'mobil kayıt gövdesindeki hizmet alanı okunamadı');
  const alan = m![1]!;

  const r = registerSpecialistSchema.safeParse({
    ...GOVDE,
    services: [{ [alan]: 'hair.haircut', name: 'Kesim', price: 9000, durationMin: 60 }],
  });
  assert.ok(r.success, `uygulamanın gönderdiği "${alan}" alanı reddedildi`);
});

test('ESKİ istemcinin `id` biçimi de kabul ediliyor', () => {
  // Güncellenmemiş bir uygulama sürümü hâlâ `id` gönderiyor olabilir;
  // onun kaydını reddetmek kullanıcıyı hiç uyarmadan dışarıda bırakırdı.
  const r = registerSpecialistSchema.safeParse({
    ...GOVDE,
    services: [{ id: 'hair.haircut', name: 'Kesim', price: 9000, durationMin: 60 }],
  });
  assert.ok(r.success, 'eski biçim reddedildi');
});

test('TEK bağsız satır kaydı DÜŞÜRMÜYOR', () => {
  /*
   * O satır sunucuda zaten eleniyor. Yüzünden kaydın tümünü reddetmek,
   * uzmanı geri kalan üç geçerli hizmetiyle birlikte dışarıda bırakırdı.
   */
  const r = registerSpecialistSchema.safeParse({
    ...GOVDE,
    services: [
      { serviceId: 'hair.haircut', name: 'Kesim', price: 9000, durationMin: 60 },
      { name: 'Roza özel paketi', price: 20000, durationMin: 90 },
    ],
  });
  assert.ok(r.success, 'bağsız satır tüm kaydı düşürdü');
});

test('HİÇBİRİ bağlı değilse kayıt reddediliyor', () => {
  /*
   * Eleme sonrası liste BOŞ kalır. Brief §4.1: "en az 1 alt hizmet
   * seçilmeden kayıt tamamlanamaz." Kabul etseydik uzman hizmetsiz
   * yayına girer, hiçbir aramada çıkmaz ve neden çalışmadığını anlamazdı.
   */
  const r = registerSpecialistSchema.safeParse({
    ...GOVDE,
    services: [{ name: 'Roza özel paketi', price: 20000, durationMin: 90 }],
  });
  assert.equal(r.success, false, 'hiç katalog bağı olmayan kayıt kabul edildi');
});

test('BOŞ hizmet listesi reddediliyor', () => {
  assert.equal(registerSpecialistSchema.safeParse({ ...GOVDE, services: [] }).success, false);
});

test('adsız ya da süresiz satır reddediliyor', () => {
  for (const satir of [
    { serviceId: 'hair.haircut', name: '', price: 9000, durationMin: 60 },
    { serviceId: 'hair.haircut', name: 'Kesim', price: 9000, durationMin: 0 },
  ]) {
    assert.equal(
      registerSpecialistSchema.safeParse({ ...GOVDE, services: [satir] }).success,
      false,
      `kabul edilmemeliydi: ${JSON.stringify(satir)}`,
    );
  }
});
