import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  DEFAULT_EXPIRY_DAYS,
  DEFAULT_LOYALTY_RULES,
  expiryFrom,
  loadLoyaltyRules,
} from './loyalty.rules';
import { EXPIRY_WARN_DAYS } from './loyalty.expiry';

// loadLoyaltyRules yalnız prisma.setting.findMany kullanır — sahte istemci yeter.
const sahtePrisma = (rows: Array<{ key: string; intValue: number | null }>) =>
  ({ setting: { findMany: async () => rows } }) as never;

test('K4 varsayılanları: %25 tavan, 5.000 eşik, 90 gün ömür', () => {
  assert.deepEqual(DEFAULT_LOYALTY_RULES, { capPct: 25, unlockAt: 5_000, expiryDays: 90 });
  assert.equal(DEFAULT_EXPIRY_DAYS, 90);
});

test('boş ayar tablosunda varsayılanlar geçerli', async () => {
  assert.deepEqual(await loadLoyaltyRules(sahtePrisma([])), DEFAULT_LOYALTY_RULES);
});

test('admin değerleri varsayılanın yerine geçer', async () => {
  const r = await loadLoyaltyRules(
    sahtePrisma([
      { key: 'rate.points_cap_pct', intValue: 10 },
      { key: 'rate.points_unlock_kzt', intValue: 20_000 },
      { key: 'rate.points_expiry_days', intValue: 180 },
    ]),
  );
  assert.deepEqual(r, { capPct: 10, unlockAt: 20_000, expiryDays: 180 });
});

test('eşik 0 kabul edilir — kilidi kaldırmanın yolu', async () => {
  const r = await loadLoyaltyRules(sahtePrisma([{ key: 'rate.points_unlock_kzt', intValue: 0 }]));
  assert.equal(r.unlockAt, 0);
});

test('ömür 0 varsayılana düşer — puanlar anında yanmaz', async () => {
  const r = await loadLoyaltyRules(sahtePrisma([{ key: 'rate.points_expiry_days', intValue: 0 }]));
  assert.equal(r.expiryDays, DEFAULT_EXPIRY_DAYS);
});

test('negatif/null değer varsayılana düşer', async () => {
  const r = await loadLoyaltyRules(
    sahtePrisma([
      { key: 'rate.points_cap_pct', intValue: -5 },
      { key: 'rate.points_unlock_kzt', intValue: null },
    ]),
  );
  assert.equal(r.capPct, DEFAULT_LOYALTY_RULES.capPct);
  assert.equal(r.unlockAt, DEFAULT_LOYALTY_RULES.unlockAt);
});

test('expiryFrom kazanım anına gün ekler', () => {
  const t = new Date('2026-01-01T10:00:00.000Z');
  assert.equal(
    expiryFrom(t, DEFAULT_LOYALTY_RULES).toISOString(),
    new Date('2026-04-01T10:00:00.000Z').toISOString(),
  );
  assert.equal(
    expiryFrom(t, { ...DEFAULT_LOYALTY_RULES, expiryDays: 1 }).toISOString(),
    new Date('2026-01-02T10:00:00.000Z').toISOString(),
  );
});

test('uyarı penceresi ömürden kısa olmalı — aksi hâlde her puan hep uyarıda', () => {
  assert.ok(
    EXPIRY_WARN_DAYS < DEFAULT_EXPIRY_DAYS,
    `uyarı ${EXPIRY_WARN_DAYS} gün, ömür ${DEFAULT_EXPIRY_DAYS} gün`,
  );
});
