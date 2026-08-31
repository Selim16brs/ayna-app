import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DEFAULT_SPEND_RULES, paymentSplit } from '@ayna/domain';

/**
 * §5 — PUAN KULLANIMI GERÇEKTEN UYGULANIYOR MU?
 *
 * Gerçek hata: depozito ekranı "puanlarımı kullan" seçeneği sunuyordu ama
 * hiçbir yer puanı DÜŞMÜYOR ve sunucuya haber VERMİYORDU. Müşteri daha az
 * para gönderiyor, bakiyesi olduğu gibi kalıyor, admin de eksik ödenmiş
 * dekontu sahte sanıyordu.
 */

const svc = readFileSync(
  join(import.meta.dirname, '..', 'bookings', 'bookings.service.ts'),
  'utf8',
);

test('dekont alınırken puan DEFTERE yazılıyor', () => {
  const m = /private async puanDus\([\s\S]*?\n {2}\}/.exec(svc);
  assert.ok(m, 'puanDus yok — puan hiç düşülmüyor');
  assert.match(m[0], /kind: 'spend'/, 'harcama kaydı yazılmıyor');
  assert.match(m[0], /points: -split\.pointsUsed/, 'düşülen puan negatif yazılmıyor');
  // Bakiye ALAN güncellemesiyle değil, defterden türetiliyor (CLAUDE.md).
  assert.ok(!/points: \{ decrement/.test(m[0]), 'bakiye alandan düşülüyor — ledger kuralı ihlali');
});

test('kullanılacak puanı SUNUCU belirliyor — istemci yalnız üst sınır veriyor', () => {
  const m = /private async puanDus\([\s\S]*?\n {2}\}/.exec(svc)![0];
  // İstenen değer doğrudan yazılamaz: paymentSplit kilit/tavan/bakiyeyi uygular.
  assert.match(m, /paymentSplit\(/, 'sınırlar uygulanmıyor');
  assert.match(m, /loadLedgerState\(/, 'gerçek bakiye okunmuyor');
  assert.ok(!/points: -istenen/.test(m), 'istemcinin istediği kadar düşülüyor');
});

test('kullanılan puan randevuda saklanıyor — admin dekontu doğrulayabilsin', () => {
  assert.match(svc, /pointsUsed: kullanilan/, 'kullanılan puan randevuya yazılmıyor');
});

test("§5 sınırları: eşik 5.000, biriken puanın %25'i", () => {
  const ACIK = new Date(0);
  // 5.000 bakiye tam eşikte → kullanılabilir, tavan 1.250.
  assert.equal(paymentSplit(4_000, 4_000, 5_000, null, DEFAULT_SPEND_RULES).pointsUsed, 1_250);
  // 4.999 → eşiğin altında, hiç kullanılamaz.
  assert.equal(paymentSplit(4_000, 4_000, 4_999, null, DEFAULT_SPEND_RULES).pointsUsed, 0);
  // Tavan depozitoyu aşamaz.
  assert.equal(paymentSplit(500, 99_999, 80_000, ACIK, DEFAULT_SPEND_RULES).pointsUsed, 500);
});
