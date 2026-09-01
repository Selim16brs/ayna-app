import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * BRIEF UYUMU — ekran tarafı.
 *
 * Bu testler "MD'de yazan yapıldı mı"yı bekçiliyor. Hepsi gerçek bir hatadan
 * doğdu: her biri bir kez sessizce kırılmış, hiçbir test kırılmamıştı.
 */

const oku = (...p: string[]) => readFileSync(join(import.meta.dirname, ...p), 'utf8');

test('§4.1.1 — talep ekranı ÇOKLU hizmet seçebiliyor ve toplamı sunucuya bildiriyor', () => {
  const src = oku('..', 'app', 'booking', 'schedule.tsx');
  assert.match(src, /const \[secili, setSecili\] = useState<string\[\]>/, 'çoklu seçim yok');
  assert.match(src, /toplamSure = seciliHizmetler\.reduce/, 'toplam süre hesaplanmıyor');
  assert.match(src, /toplamTutar = seciliHizmetler\.reduce/, 'toplam tutar hesaplanmıyor');
  assert.match(src, /serviceNames: seciliHizmetler\.map/, 'seçilen hizmetler sunucuya gitmiyor');
});

test('§4.1.3 — özet, göndermeden ÖNCE hizmetleri/süreyi/tutarı gösteriyor', () => {
  const src = oku('..', 'app', 'booking', 'schedule.tsx');
  for (const k of [
    'booking.schedule.summary',
    'booking.schedule.total_time',
    'booking.schedule.total',
  ]) {
    assert.ok(src.includes(k), `özet kartında ${k} yok`);
  }
  // Depozito ve iptal kuralı da aynı ekranda; RulesCard TOPLAM tutarla çağrılmalı
  // (tek hizmetin fiyatıyla çağrılırsa depozito olduğundan düşük görünürdü).
  assert.match(src, /<RulesCard price=\{offer \? offer\.finalPrice : toplamTutar\}/);
});

test('eski randevu sisteminden kalan uç ÇAĞRISI yok', () => {
  const api = oku('api.ts');
  for (const olu of [
    'confirm-completion',
    'confirm-receipt',
    'free-cancel',
    'refund-receipt',
    'confirm-refund',
    'reassign',
  ]) {
    assert.ok(!api.includes(olu), `api.ts hâlâ silinmiş '${olu}' ucunu çağırıyor`);
  }
});

test('sekme rozeti ve Yaklaşan/Geçmiş ayrımı ELLE YAZILMIŞ durum listesine bakmıyor', () => {
  // İkisi de bir kez ölü listeye baktı: nokta hiç yanmadı, iptal edilmiş
  // randevular "Yaklaşan"da göründü. Kaynak tek: booking-flow.
  const tab = oku('ui', 'AppTabBar.tsx');
  assert.match(tab, /birincilAksiyon\(status, 'musteri'\)/);
  const liste = oku('..', 'app', '(tabs)', 'bookings.tsx');
  assert.match(liste, /yaklasanMi\(a\.status\)/);
});
