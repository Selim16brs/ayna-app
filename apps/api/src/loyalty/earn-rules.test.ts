import assert from 'node:assert/strict';
import { test } from 'node:test';
import { EARN_RULES, ONCE_PER_LIFETIME, ruleFor } from './earn-rules';

/**
 * İSTEMCİ BEYANIYLA PUAN KAZANIMI KAPALI.
 *
 * ── BU DOSYA BİR KEZ DAHA YAZILDI ──────────────────────────────────────
 *
 * Önceki hâli "ara çözüm"ü koruyordu: istemci sebebi söylüyor, sunucu
 * tutarı ve günlük adedi kendisi belirliyordu. Bu, para basma açığını
 * KÜÇÜLTMÜŞTÜ ama KAPATMAMIŞTI — çünkü olayın olup olmadığı hiç
 * sorulmuyordu.
 *
 * Kurucu denetimi bunu canlıda yakaladı: "uzman gelmedi" için 1000 puan
 * verilmişti ama o kullanıcının `no_show_uzman` durumunda sıfır randevusu
 * vardı; "yorum" için 6 ödül vardı, gerçek yorum sayısı 1'di.
 *
 * Kazanım artık `olay-odulleri.ts` içinden, olayın veritabanındaki kanıtı
 * okunarak yazılıyor. Bu dosya kapının KAPALI kalmasını bekliyor.
 */

test('hiçbir sebep istemci beyanıyla kazanılamıyor', () => {
  /*
   * Tablo doluyken giriş yapmış herhangi biri "uzman gelmedi" deyip günde
   * 2000 ₸ basabiliyordu. Puan bir ödemenin %50'sini karşıladığı için bu
   * gerçek para.
   */
  assert.equal(EARN_RULES.size, 0, `açık kalan sebep: ${[...EARN_RULES.keys()].join(', ')}`);
});

test('olay sebepleri BU KAPIDAN geçemiyor', () => {
  // Kazanımın meşru yolu `olay-odulleri.ts`; buradan istenirse kanıt aranmaz.
  for (const sebep of [
    'rewards.earn.review',
    'rewards.earn.first_booking',
    'rewards.earn.provider_noshow',
    'rewards.earn.w2w_like',
  ]) {
    assert.equal(ruleFor(sebep), undefined, `${sebep} hâlâ istemciden istenebiliyor`);
  }
});

test('uydurma sebep de kural üretmiyor', () => {
  assert.equal(ruleFor('rewards.earn.hediye'), undefined);
  assert.equal(ruleFor(''), undefined);
  // Düz nesnede bu satır Object.prototype döndürüyordu — Map ile kapatıldı.
  for (const tuzak of ['__proto__', 'constructor', 'toString']) {
    assert.equal(ruleFor(tuzak), undefined, `prototip tuzağı açık: ${tuzak}`);
  }
});

test('günlük teorik kazanım tavanı SIFIR', () => {
  // Açık öncesinde tek istekle 10.000 basılabiliyordu; ara çözümde tavan
  // 2320 ₸/gün'dü. Artık istemci hiçbir şey basamıyor.
  const tavan = [...EARN_RULES.values()].reduce((n, r) => n + r.points * r.dailyLimit, 0);
  assert.equal(tavan, 0, `istemci hâlâ günde ${tavan} puan basabiliyor`);
});

test('ömür boyu listesi de boş — dayanağı kalmadı', () => {
  // Tekillik artık kazanımın yazıldığı yerde (`olay-odulleri`) kanıta bağlı.
  assert.equal(ONCE_PER_LIFETIME.size, 0);
});
