import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * PAKET KAPILARI — ücretli özellik SUNUCUDA korunuyor mu?
 *
 * İstemcide kapatmak yeterli değil: paket kontrolü yalnız ekranda yapılırsa,
 * değiştirilmiş bir istemci ücretli özelliği bedava kullanır. Kapı, özelliği
 * SUNAN yerde olmalı.
 *
 * Bu test her ücretli ucun sunucudaki kapısını kilitliyor. Yeni bir ücretli
 * özellik eklenip kapısı unutulursa burada kırılır.
 */

const SRC = join(import.meta.dirname, '..');
const oku = (...p: string[]) =>
  existsSync(join(SRC, ...p)) ? readFileSync(join(SRC, ...p), 'utf8') : '';

/** Sunucuda paket kontrolü YAPMASI gereken uçlar. */
const KORUNMASI_GEREKEN: { ad: string; dosya: string[]; anahtar: RegExp }[] = [
  {
    ad: 'Boni AI kotası (§13.5 — premium)',
    dosya: ['ai', 'ai.service.ts'],
    anahtar: /isPremium|membershipTier/,
  },
  {
    ad: 'W2W bağları (§11 — platinum)',
    dosya: ['always', 'always.service.ts'],
    anahtar: /membershipTier !== 'platinum'/,
  },
];

for (const { ad, dosya, anahtar } of KORUNMASI_GEREKEN) {
  test(`${ad} — kapı SUNUCUDA`, () => {
    const src = oku(...dosya);
    assert.ok(src, `${dosya.join('/')} bulunamadı`);
    assert.match(src, anahtar, `${ad}: sunucu paketi kontrol etmiyor — ücretsiz kullanılabilir`);
  });
}

test('W2W kapısı üyelik BİTİŞİNİ de kontrol ediyor', () => {
  // Süresi dolmuş platinum, platinum değildir. Yalnız `tier === 'platinum'`
  // bakmak, bir kez ödeyip süresiz kullanmak demekti.
  const src = oku('always', 'always.service.ts');
  assert.match(src, /membershipUntil/, 'üyelik bitişi kontrol edilmiyor');
});

test('BİLİNEN AÇIK: cut-out portre kapısı yalnız istemcide', () => {
  // Bu bir hata DEĞİL, bilinçli bir kabul: cut-out uzman/salonun temel
  // sunumu (tier'dan bağımsız), müşteri avatarı içinse premium bir "hoşluk".
  // Sunucuda kapı olmadığı için değiştirilmiş bir istemci bunu ücretsiz
  // kullanabilir. Maliyeti: remove.bg çağrısı. Ücretli bir özelliği
  // gelirle ilişkilendirdiğimiz gün kapı SUNUCUYA taşınmalı.
  //
  // Test, durumun BİLİNDİĞİNİ kayda geçiriyor: kapı sunucuya eklenirse bu
  // test kırılır ve yorum güncellenir.
  const auth = oku('auth', 'auth.controller.ts');
  assert.ok(
    !/cutout[\s\S]{0,400}(isPremium|membershipTier)/.test(auth),
    'cut-out artık sunucuda korunuyor — bu testi ve yorumunu güncelle',
  );
});
