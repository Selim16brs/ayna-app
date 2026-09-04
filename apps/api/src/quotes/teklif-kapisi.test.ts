import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

/**
 * DOĞRULAMA KAPISI TEKLİF SEÇİMİNDE DE.
 *
 * Kurucu: "bir müşteri ya admin panelinden onaylanmalı ya da mutlaka
 * telefon ile doğrulama yapmalı. aksi takdirde uygulamada KESİNLİKLE
 * randevu veremez."
 *
 * Doğrudan randevu yolu (`bookings.create`) bu kapıyı uyguluyordu. Ama
 * TEKLİF SEÇİMİ randevuyu kendi transaction'ında doğuruyor ve kapıdan hiç
 * geçmiyordu: doğrulanmamış müşteri teklif akışından randevu alabiliyordu.
 * Kural "kesinlikle" diyorsa tek bir yol bile açık kalamaz.
 */

const oku = (f: string) => readFileSync(join(__dirname, '..', f), 'utf8');

test('TEKLİF SEÇİMİ kapıdan geçiyor', () => {
  const s = oku('quotes/quotes.service.ts');
  const i = s.indexOf('async select(');
  assert.ok(i > 0, 'seçim yok');
  const govde = s.slice(i, s.indexOf('$transaction', i));
  assert.match(govde, /randevuVerebilir\(secen\)/, 'kapı yok');
  assert.match(govde, /RANDEVU_KAPISI_KODU/, 'kod ayrı yazılmış');
  // Randevu YAZILMADAN ÖNCE: transaction başladıktan sonra bakmak geç olurdu.
  assert.ok(
    s.indexOf('randevuVerebilir(secen)') < s.indexOf('$transaction', i),
    'kapı randevu yazımından sonra',
  );
});

test('İKİ YOL AYNI KURALI ve AYNI KODU kullanıyor', () => {
  /*
   * Kural iki yerde ayrı yazılsaydı biri değiştiğinde öteki sessizce eski
   * kalırdı; hata kodu da aynı olmalı, yoksa uygulama iki farklı ekran
   * gösterir.
   */
  for (const f of ['bookings/bookings.service.ts', 'quotes/quotes.service.ts']) {
    const s = oku(f);
    assert.match(s, /randevuVerebilir\(/, `${f}: ortak kural kullanılmıyor`);
    assert.match(s, /code: RANDEVU_KAPISI_KODU/, `${f}: ortak kod kullanılmıyor`);
  }
});

test('DUMAN TESTİ bu yolu deniyor', () => {
  /*
   * Birim testi kaynağa bakıyor; asıl kanıt gerçek sunucuya atılan istek.
   * Duman testi hem kapının kapalı olduğunu hem yönetici onayından sonra
   * açıldığını doğruluyor.
   */
  const smoke = readFileSync(join(__dirname, '..', '..', 'scripts', 'duman-testi.mjs'), 'utf8');
  assert.match(smoke, /doğrulanmamış müşteri teklif seçemiyor/, 'kapalı hâli denenmiyor');
  assert.match(smoke, /yönetici müşteriyi onaylayabiliyor/, 'onay yolu denenmiyor');
  assert.match(smoke, /teklif MÜŞTERİNİN listesine düşüyor/, 'teklif dönüşü denenmiyor');
  assert.match(smoke, /rolü SUNUCU damgalıyor/, 'rol damgası denenmiyor');
});
