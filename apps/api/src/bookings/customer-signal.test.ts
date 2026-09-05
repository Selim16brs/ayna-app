import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * §7.3 — UZMANIN MÜŞTERİ HAKKINDAKİ GİZLİ SİNYALİ MÜŞTERİYE SIZAMAZ.
 *
 * Sinyal ('up' | 'down') hizmet sonrası uzmanın kendi notudur. Müşterinin
 * kendisine "sorunlu" etiketi konduğunu görmesi, uygulamanın en temel güven
 * vaadini bozardı — üstelik veriyi ekranda ÇİZMEMEK yetmez: alan cihaza
 * indiği anda sızmıştır.
 *
 * Bu yüzden mapBooking sinyali KAPALI-VARSAYILAN tutar ve yalnız sağlayıcı
 * yolunda açar. Bu test o kapıyı kilitler.
 */

const src = readFileSync(join(import.meta.dirname, 'bookings.service.ts'), 'utf8');

test('mapBooking sinyali KAPALI-VARSAYILAN tutar', () => {
  // `opts?.` idi; rol artık ZORUNLU parametre olduğu için `opts.` — soru
  // işareti kalktı ama kural aynı: sinyal yalnız sağlayıcı yolunda açılıyor.
  const m = /providerSignal:\s*opts\.forProvider\s*\?[^,]*:\s*undefined/.exec(src);
  assert.ok(
    m,
    'mapBooking sinyali koşulsuz döndürüyor olabilir — müşteri yolunda undefined olmalı',
  );
});

test('müşteri listesi sinyali AÇMAZ', () => {
  // listForUser: kullanıcının MÜŞTERİ olarak randevuları.
  const m = /async listForUser[\s\S]*?\n {2}\}/.exec(src);
  assert.ok(m, 'listForUser bulunamadı');
  assert.ok(
    !/forProvider:\s*true/.test(m[0]),
    'listForUser sinyali açıyor — müşteri kendi hakkındaki gizli notu görürdü',
  );
});

test('sağlayıcı listesi sinyali açar — yoksa uzman kendi notunu göremez', () => {
  const m = /async listForProvider[\s\S]*?\n {2}\}\n\n/.exec(src);
  assert.ok(m, 'listForProvider bulunamadı');
  assert.ok(/forProvider:\s*true/.test(m[0]), 'listForProvider sinyali açmıyor');
});

test('map geri çağrısı ÇIPLAK mapBooking ile kullanılmaz', () => {
  // `rows.map(mapBooking)` ikinci argüman olarak İNDEKSİ geçirir; indeks
  // `{forProvider}` yerine geçtiği anda sinyal kazara açılabilirdi.
  assert.ok(
    !/\.map\(mapBooking\)/.test(src),
    'rows.map(mapBooking) indeksi opts olarak geçirir — açıkça (b) => mapBooking(b, …) yazılmalı',
  );
});

test('sinyal yalnız SAĞLAYICI tarafından yazılabilir', () => {
  const m = /async setCustomerSignal[\s\S]*?\n {2}\}/.exec(src);
  assert.ok(m, 'setCustomerSignal bulunamadı');
  assert.ok(
    /assertParty\([^)]*'provider'\)/.test(m[0]),
    'sinyal yazımı sağlayıcı kontrolü yapmıyor',
  );
});

test('sinyal hizmet saatinden ÖNCE verilemez', () => {
  // Yaşanmamış bir deneyimin damgası olmamalı.
  const m = /async setCustomerSignal[\s\S]*?\n {2}\}/.exec(src);
  assert.ok(/SIGNAL_TOO_EARLY/.test(m![0]), 'zaman kontrolü yok');
});

test('denetim kaydına yalnız DEĞER girer — PII yok', () => {
  const m = /action: 'booking\.customer_signal'[\s\S]{0,300}?safeDiff:\s*\{([^}]*)\}/.exec(src);
  assert.ok(m, 'sinyal denetim kaydı bulunamadı');
  const sd = m[1] ?? '';
  for (const yasak of ['userId', 'customerName', 'name', 'phone', 'email']) {
    assert.ok(
      !new RegExp(`\\b${yasak}\\b`).test(sd),
      `safeDiff içinde '${yasak}' var → kimin kim hakkında ne düşündüğü log'a girer`,
    );
  }
  assert.ok(/signal/.test(sd), 'kayıt boş — denetim izi işe yaramaz');
});
