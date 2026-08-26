import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * CLAUDE.md bağlayıcı kuralı: _"Kritik eylemler audit log."_
 *
 * Ödeme yolu HİÇ denetim kaydı yazmıyordu: gerçek para el değiştiriyor, puan
 * yakılıyor, randevu kesinleşiyordu — ama kimin ne zaman ne ödediğinin kaydı
 * yoktu. Puan KAZANIMI da yazmıyordu; 1 puan = 1 ₸ olduğu için kazanım yazmak
 * para basmaktır (PR #19'daki açık tam da buydu).
 *
 * Bu test, para yollarının denetim kaydını sessizce kaybetmesini engeller.
 */

const kok = join(import.meta.dirname, '..');
const oku = (yol: string) => readFileSync(join(kok, yol), 'utf8');

// Her para yolu → yazması gereken eylem adları
const PARA_YOLLARI: { dosya: string; eylemler: string[] }[] = [
  {
    dosya: 'payment/payment.service.ts',
    eylemler: ['payment.intent', 'payment.paid', 'payment.failed'],
  },
  { dosya: 'loyalty/loyalty.grant.ts', eylemler: ['loyalty.earn'] },
  { dosya: 'loyalty/loyalty.service.ts', eylemler: ['loyalty.redeem', 'loyalty.unlock'] },
  { dosya: 'commissions/commissions.service.ts', eylemler: ['overdue.run', 'invoice.collect'] },
  { dosya: 'bookings/bookings.service.ts', eylemler: ['booking.'] },
];

for (const { dosya, eylemler } of PARA_YOLLARI) {
  test(`${dosya} denetim kaydı yazıyor`, () => {
    const src = oku(dosya);
    assert.ok(
      /auditLog\s*\.?\s*\n?\s*\.create|audit\.record/.test(src),
      `${dosya} hiç denetim kaydı yazmıyor`,
    );
    for (const e of eylemler) {
      assert.ok(src.includes(`'${e}`), `${dosya}: '${e}' eylemi kayda geçmiyor`);
    }
  });
}

test('denetim kaydına PII yazılmıyor — safeDiff yalnız sayı/anahtar taşır', () => {
  // `detail` alanı referans kazanımında karşı tarafın ADINI taşıyor; audit'e
  // girerse gizlilik ihlali olur (docs/security/03: PII asla log'a).
  for (const { dosya } of PARA_YOLLARI) {
    const src = oku(dosya);
    const safeDiffler = [...src.matchAll(/safeDiff:\s*\{([^}]*)\}/g)].map((m) => m[1] ?? '');
    for (const sd of safeDiffler) {
      for (const yasak of ['detail', 'name', 'Name', 'phone', 'email', 'address']) {
        assert.ok(
          !new RegExp(`\\b${yasak}\\b`).test(sd),
          `${dosya}: safeDiff içinde '${yasak}' var → PII sızıntısı riski\n  ${sd.trim()}`,
        );
      }
    }
  }
});

test('kazanım denetim kaydı sebep ve tutarı taşıyor', () => {
  // Kayıt varsa ama içi boşsa denetim izi işe yaramaz.
  const src = oku('loyalty/loyalty.grant.ts');
  const m = /action: 'loyalty\.earn'[\s\S]{0,220}?safeDiff:\s*\{([^}]*)\}/.exec(src);
  assert.ok(m, 'loyalty.earn kaydında safeDiff bulunamadı');
  assert.ok(/reason/.test(m[1] ?? ''), 'sebep yazılmıyor');
  assert.ok(/points/.test(m[1] ?? ''), 'tutar yazılmıyor');
});
