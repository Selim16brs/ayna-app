import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

// GİZLİLİK BEKÇİSİ — "yeni üye önceki üyenin HİÇBİR verisini göremez" kuralının
// kaynak-düzeyi garantisi. store.ts RN'e bağımlı olduğundan saf import edilemez;
// bu test kaynak metni üzerinde üç sözleşmeyi doğrular:
//  1) logout TAM sıfırlama (userScopedReset) uygular,
//  2) setAuth farklı kullanıcıda TAM sıfırlama uygular,
//  3) persist edilen HER kullanıcı-alanı sıfırlama setinde yer alır.
const src = readFileSync(join(__dirname, 'store.ts'), 'utf8');

function block(startMarker: string, endMarker: string): string {
  const i = src.indexOf(startMarker);
  assert.ok(i >= 0, `${startMarker} bulunamadı`);
  const j = src.indexOf(endMarker, i);
  assert.ok(j > i, `${endMarker} bulunamadı`);
  return src.slice(i, j);
}

test('logout tam kullanıcı sıfırlaması uygular', () => {
  const logout = block('logout: () => {', '},');
  assert.match(logout, /userScopedReset\(\)/);
  assert.match(logout, /token: null/);
  assert.match(logout, /currentUser: null/);
});

test('setAuth farklı kullanıcıda tam sıfırlama uygular', () => {
  const setAuth = block('setAuth: (session) => {', 'hydrateBookings');
  assert.match(setAuth, /userScopedReset\(\)/);
});

// partialize'daki oturum-dışı her kullanıcı alanı reset'te OLMAK ZORUNDA
// (token/currentUser oturumun kendisidir; onları setAuth/logout ayrıca yönetir).
const PERSISTED_USER_KEYS = [
  'sellerTrialStart',
  'sellerServices',
  'sellerSocial',
  'sellerHours',
  'sellerCerts',
  'salonProfile',
  'demandNotif',
  'offersSeen',
  'premium',
  'platinum',
  'autoReengageEnabled',
];

test('persist edilen tüm kullanıcı alanları sıfırlama setinde', () => {
  const reset = block('export const userScopedReset', '});');
  const seeded = block('const SEEDED_PERSONAL_RESET', '};');
  for (const key of PERSISTED_USER_KEYS) {
    assert.ok(
      new RegExp(`\\b${key}:`).test(reset) || new RegExp(`\\b${key}:`).test(seeded),
      `SIZINTI RİSKİ: '${key}' userScopedReset/SEEDED_PERSONAL_RESET içinde yok`,
    );
  }
});

// partialize'a yeni alan eklenirse bu listeyi de güncellemeye zorla (çifte bekçi)
test('partialize ile bekçi listesi senkron', () => {
  const partialize = block('partialize: (s) => ({', '}),');
  const keys = [...partialize.matchAll(/^\s{8}(\w+):/gm)].map((m) => m[1]!);
  for (const k of keys) {
    if (k === 'token' || k === 'currentUser') continue;
    assert.ok(
      PERSISTED_USER_KEYS.includes(k),
      `partialize'a yeni alan eklendi ('${k}') — PERSISTED_USER_KEYS + userScopedReset güncellenmeli`,
    );
  }
});
