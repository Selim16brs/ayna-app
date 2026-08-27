import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * PREMIUM EKRANI İKİ ROLE GÖRE.
 *
 * Ekran baştan sona SATICI diliyle yazılmıştı — öne çıkarma, yakında
 * görünme, vitrin, kampanya. Müşteri profilindeki paket rozetine dokunan
 * kişi, kendisiyle hiç ilgisi olmayan bir satış sayfası görüyordu.
 */

const ekran = readFileSync(join(import.meta.dirname, '..', 'app', 'membership.tsx'), 'utf8');
const eskiYol = readFileSync(
  join(import.meta.dirname, '..', 'app', 'seller', 'premium.tsx'),
  'utf8',
);

test('avantaj listesi role göre değişiyor', () => {
  assert.match(ekran, /const CUSTOMER_BENEFITS/, 'müşteri avantaj listesi yok');
  assert.match(
    ekran,
    /const benefits = !isSeller\s*\?\s*CUSTOMER_BENEFITS/,
    'liste role bağlı değil',
  );
});

test('müşteriye YALNIZ gerçekten uygulanan avantajlar sunuluyor', () => {
  const m = /const CUSTOMER_BENEFITS[\s\S]*?\n\];/.exec(ekran);
  assert.ok(m, 'CUSTOMER_BENEFITS bulunamadı');

  // Bu ikisinin sunucuda/mağazada karşılığı var.
  assert.ok(m[0].includes('premium.c.boni'), 'Boni listede yok');
  assert.ok(m[0].includes('premium.c.cutout'), 'cut-out foto listede yok');

  // Bu ikisinin YOK. Pasaport ekranı ikisini de sayıyor ama destek modülü
  // paketi hiç okumuyor ve "görünürlük" yalnız duyuru segmenti — müşteriyi
  // öne çıkarmıyor, ona duyuru gönderiyor. Para alınan ekranda verilmeyen
  // şey listelenmez (dosyanın kendi K6 kuralı).
  for (const yasak of ['support', 'visibility']) {
    assert.ok(!m[0].includes(yasak), `uygulanmayan avantaj listelenmiş: ${yasak}`);
  }
});

test('Boni gerçekten sunucuda paket istiyor', () => {
  // Liste bu iddiaya dayanıyor; iddia bozulursa test de düşmeli.
  const ai = readFileSync(
    join(import.meta.dirname, '..', '..', 'api', 'src', 'ai', 'ai.service.ts'),
    'utf8',
  );
  assert.match(ai, /PREMIUM_REQUIRED/, 'AI ucu paketi kontrol etmiyor');
  assert.match(
    ai,
    /membershipTier === 'premium' \|\| .*membershipTier === 'platinum'/,
    'kademe okunmuyor',
  );
});

test('cut-out gerçekten ücretsizde kapalı', () => {
  const store = readFileSync(join(import.meta.dirname, 'store.ts'), 'utf8');
  assert.match(store, /!isSeller && tier === 'free'\) return 'not_premium'/, 'cut-out kapısı yok');
});

test('müşteride Platinum sunulmuyor', () => {
  // Platinum'un tüm ek hakları satıcıya ait (Always, toplu kampanya —
  // ikisi de isProvider kapısının arkasında). Müşteriye 1999₸'lik bir
  // kademeyi karşılığı olmadan satmak, hava satmaktır.
  assert.match(
    ekran,
    /!isSeller \|\| tierParam === 'premium' \? 'premium' : 'platinum'/,
    'müşteri Platinum sekmesine düşebiliyor',
  );
  assert.match(
    ekran,
    /\{isSeller \? \(\s*<View style=\{styles\.tierWrap\}>/,
    'kademe seçici müşteride de çiziliyor',
  );
});

test('tanıtım metni müşteriye satıcı dilinde konuşmuyor', () => {
  assert.match(ekran, /!isSeller\s*\?\s*t\('premium\.c\.tagline'\)/, 'müşteri tanıtım metni yok');
});

test('abonelik ucu rol kapısı koymuyor', () => {
  // Ekranı müşteriye açmak, sunucu reddediyorsa işe yaramaz.
  const ctrl = readFileSync(
    join(
      import.meta.dirname,
      '..',
      '..',
      'api',
      'src',
      'subscriptions',
      'subscriptions.controller.ts',
    ),
    'utf8',
  );
  assert.doesNotMatch(ctrl, /@Roles\(/, 'abonelik ucu role kapalı — müşteri satın alamaz');
});

test('eski yol yönlendiriyor, boş ekran açmıyor', () => {
  // Yol `/seller/premium` → `/membership` taşındı. Eski dosya SİLİNMEDİ:
  // gönderilmiş bildirimlerin derin bağlantıları ve kullanıcının cihazındaki
  // eski OTA sürümü hâlâ oraya gelebilir.
  assert.match(eskiYol, /router\.replace\(/, 'eski yol yönlendirmiyor');
  assert.match(eskiYol, /'\/membership'/, 'yönlendirme hedefi yanlış');
  // Platinum yükseltme bağlantıları `?tier=platinum` taşıyor; düşerse
  // kullanıcı Premium sekmesinde açılır ve yanlış paketi satın alır.
  assert.match(eskiYol, /params: \{ tier \}/, 'tier parametresi kaybediliyor');
});
