import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * §4.6 — ERTELEME BİR ÖNERİDİR, TEK TARAFLI DEĞİŞİKLİK DEĞİL.
 *
 * Gerçek hata: `reschedule()` randevunun saatini DOĞRUDAN değiştiriyordu.
 * Karşı tarafa hiç sorulmuyor, `erteleme_onerildi` durumu hiç yazılmıyordu —
 * yani müşteri, uzmanın takvimini tek başına kaydırabiliyordu (ve tersi).
 */

const svc = readFileSync(join(import.meta.dirname, 'bookings.service.ts'), 'utf8');
const gövde = (ad: string) => {
  const m = new RegExp(`async ${ad}\\([\\s\\S]*?\\n {2}\\}`).exec(svc);
  assert.ok(m, `${ad} yok`);
  return m[0];
};

test('erteleme ÖNERİ durumuna geçiyor, saati doğrudan değiştirmiyor', () => {
  const m = gövde('reschedule');
  assert.match(m, /status: 'erteleme_onerildi'/, 'öneri durumu yazılmıyor');
  assert.match(m, /proposedStartAt: new Date\(newStartMs\)/, 'önerilen saat saklanmıyor');
  assert.ok(
    !/\n\s+startAt: new Date\(newStartMs\)/.test(m),
    'saat karşı tarafa sorulmadan DEĞİŞTİRİLİYOR',
  );
});

test('öneriyi yapan taraf saklanıyor ve kendi önerisini yanıtlayamıyor', () => {
  assert.match(gövde('reschedule'), /proposedBy: rol/, 'öneren taraf saklanmıyor');
  for (const ad of ['ertelemeKabul', 'ertelemeRed']) {
    assert.match(
      gövde(ad),
      /if \(b\.proposedBy === rol\)/,
      `${ad}: öneren kendi önerisini yanıtlayabiliyor — tek taraflı saat değiştirmenin uzun yolu`,
    );
  }
});

test('KABUL: depozito taşınıyor, yeni ödeme istenmiyor', () => {
  const m = gövde('ertelemeKabul');
  assert.match(m, /status: 'kesinlesti'/);
  assert.match(m, /rescheduleCount: \{ increment: 1 \}/, 'erteleme hakkı düşülmüyor');
  // Depozito alanlarına DOKUNULMAMALI: yeni tutar hesaplanır ya da sıfırlanırsa
  // müşteriden ikinci kez para istenmiş olurdu.
  assert.ok(!/depositAmount/.test(m), 'depozito yeniden hesaplanıyor — §4.6 taşınmasını istiyor');
  assert.ok(!/depositDeadline/.test(m), 'yeni depozito penceresi açılıyor');
});

test('RED: eski randevu geçerli kalıyor', () => {
  const m = gövde('ertelemeRed');
  assert.match(m, /status: 'kesinlesti'/);
  assert.match(m, /proposedStartAt: null/);
  // Saat DEĞİŞMEMELİ — red, önerinin geri alınmasıdır.
  assert.ok(!/startAt:/.test(m), 'red randevunun saatini değiştiriyor');
});

test('slot çakışması hem ÖNERİDE hem KABULDE kontrol ediliyor', () => {
  // Öneri ile kabul arasında slot kapanmış olabilir; yalnız öneride bakmak
  // çift rezervasyona açık bırakırdı.
  assert.match(gövde('reschedule'), /await this\.slotBosMu\(/);
  assert.match(gövde('ertelemeKabul'), /await this\.slotBosMu\(/);
});
