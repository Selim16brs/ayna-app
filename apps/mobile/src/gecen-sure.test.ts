import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { gecenSureYazisi, yorumDonemiYazisi } from './gecen-sure';

/**
 * "AZ ÖNCE" TÜRKÇE SABİT DEĞİL.
 *
 * Bildirimler, puan hareketleri ve yorumlar ekrana Türkçe zaman yazısıyla
 * geliyordu: Kazak ya da Rus kullanıcı listede Türkçe bir satır görüyordu.
 * (CLAUDE.md: tüm kullanıcı metinleri i18n anahtarı.)
 */

const oku = (...p: string[]) => readFileSync(join(__dirname, '..', ...p), 'utf8');
const t = ((k: string) => k) as never;
const DK = 60_000;
const SA = 60 * DK;
const GUN = 24 * SA;

test('EŞİKLER — dakika, saat, gün', () => {
  const simdi = 1_700_000_000_000;
  assert.equal(gecenSureYazisi(simdi, simdi, t), 'time.just_now');
  assert.equal(gecenSureYazisi(simdi - 59_000, simdi, t), 'time.just_now');
  assert.equal(gecenSureYazisi(simdi - 5 * DK, simdi, t), 'time.min_ago');
  assert.equal(gecenSureYazisi(simdi - 3 * SA, simdi, t), 'time.hour_ago');
  assert.equal(gecenSureYazisi(simdi - 2 * GUN, simdi, t), 'time.day_ago');
});

test('İLERİ TARİHLİ damga "az önce" — eksi sayı yazılmıyor', () => {
  /*
   * Cihaz saati geri alınmışsa fark negatif çıkıyor. "-3 dk önce" yazmak
   * kullanıcıya bozuk bir ekran gösterirdi.
   */
  const simdi = 1_700_000_000_000;
  assert.equal(gecenSureYazisi(simdi + 10 * DK, simdi, t), 'time.just_now');
});

test('YORUM DÖNEMİ eşikleri SUNUCUYLA aynı', () => {
  /*
   * Sunucudaki `periodLabel` 30 ve 90 gün eşiklerini kullanıyor. Uygulama
   * başka eşik kullansaydı aynı yorum iki ekranda iki farklı yaşta
   * görünürdü.
   */
  const sunucu = readFileSync(
    join(__dirname, '..', '..', 'api', 'src', 'catalog', 'catalog.service.ts'),
    'utf8',
  );
  const govde = sunucu.slice(sunucu.indexOf('function periodLabel'));
  assert.match(govde.slice(0, 300), /days <= 30/, 'sunucu eşiği değişmiş');
  assert.match(govde.slice(0, 300), /days <= 90/, 'sunucu eşiği değişmiş');

  const simdi = 1_700_000_000_000;
  assert.equal(yorumDonemiYazisi(simdi - 30 * GUN, simdi, t), 'review.period.recent');
  assert.equal(yorumDonemiYazisi(simdi - 31 * GUN, simdi, t), 'review.period.months');
  assert.equal(yorumDonemiYazisi(simdi - 91 * GUN, simdi, t), 'review.period.old');
});

test('EKRANLARDA Türkçe zaman yazısı KALMADI', () => {
  /*
   * Yazı artık SAKLANMIYOR, çizim anında kuruluyor: saklanan yazı dil
   * değiştiğinde eski dilde kalırdı, üstelik bildirim eskidikçe de
   * güncellenmezdi ("az önce" bir hafta sonra hâlâ "az önce").
   */
  const store = oku('src', 'store.ts');
  assert.doesNotMatch(store, /dateLabel: 'Az önce'/, 'store hâlâ Türkçe yazı saklıyor');
  assert.doesNotMatch(store, /period: 'Az önce'/, 'yorum hâlâ Türkçe yazı saklıyor');
  assert.doesNotMatch(oku('app', '_layout.tsx'), /dateLabel: 'Az önce'/, '_layout Türkçe yazıyor');

  /*
   * Bildirimin damga alanı `createdAt` (eskiden beri var), puan
   * hareketininki `createdAtMs` — ikisi de ham sayı, yazı ikisinden de
   * aynı fonksiyonla kuruluyor.
   */
  for (const [yol, ifade] of [
    [['app', 'notifications.tsx'], 'n.createdAt != null'],
    [['app', 'rewards.tsx'], 'e.createdAtMs != null'],
  ] as [string[], string][]) {
    const k = oku(...yol);
    assert.ok(k.includes(ifade), `${yol.join('/')}: damgadan hesaplamıyor`);
    assert.match(k, /gecenSureYazisi\(/, `${yol.join('/')}: ortak kural kullanılmıyor`);
  }
  const profil = oku('app', 'professional', '[id].tsx');
  assert.match(profil, /yorumDonemiYazisi\(r\.createdAtMs, Date\.now\(\), t\)/, 'yorum dönemi ham');
});
