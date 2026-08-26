import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * HESAP SİLME POLİTİKASI KAYMASIN.
 *
 * Silme geri alınamaz ve yanlış yapılırsa iki yönde de zarar verir: eksik
 * silmek kişisel veriyi geride bırakır, fazla silmek mali mutabakatı bozar.
 * Bu test politikanın üç kovasını da kilitler.
 */

const src = readFileSync(join(import.meta.dirname, 'account-data.service.ts'), 'utf8');

const silme = /async deleteAccount[\s\S]*?\n {2}\}/.exec(src);
const disaAktarim = /async exportAll[\s\S]*?\n {2}\}/.exec(src);

test('silme ve dışa aktarım bulunuyor', () => {
  assert.ok(silme, 'deleteAccount bulunamadı');
  assert.ok(disaAktarim, 'exportAll bulunamadı');
});

// ── 1. kova: SERT SİLİNMESİ GEREKENLER ──────────────────────────────────────

test('SAĞLIK VERİSİ sert silinir — takma adlaştırma YETMEZ', () => {
  // Pasaport alerji ve hassasiyet taşır. Bunu "kimliksizleştirip" bırakmak,
  // sağlık verisini veritabanında tutmak demektir.
  assert.ok(
    /userPassport\s*\.\s*deleteMany/.test(silme![0]),
    'pasaport (alerji/sağlık verisi) silinmiyor',
  );
});

const SERT_SILINENLER = [
  'passportAccess',
  'trustedContact',
  'safetySession',
  'pushToken',
  'circleSave',
  'circleFollow',
  'circlePost',
];

for (const model of SERT_SILINENLER) {
  test(`${model} sert silinir`, () => {
    assert.ok(
      new RegExp(`${model}\\s*\\n?\\s*\\.\\s*deleteMany`).test(silme![0]),
      `${model} silinmiyor — kişiye ait kayıt geride kalır`,
    );
  });
}

// ── 2. kova: KİMLİKSİZLEŞTİRİLENLER ─────────────────────────────────────────

test('randevudaki müşteri adı ve telefonu kaldırılır', () => {
  // Randevu uzmanın da işlem kaydı; satır kalır ama kimlik kalmaz.
  const m = /booking\s*\n?\s*\.\s*updateMany[\s\S]{0,300}?\}\)/.exec(silme![0]);
  assert.ok(m, 'randevu güncellemesi yok');
  assert.ok(/customerName/.test(m[0]), 'müşteri adı kaldırılmıyor');
  assert.ok(/customerPhone:\s*null/.test(m[0]), 'müşteri telefonu kaldırılmıyor');
});

test('W2W yorumları silinmez, kimliksizleştirilir', () => {
  // Silinseydi, o cevabın altında olduğu SORUNUN fikir birliği bozulurdu —
  // yani başkasının verisi zarar görürdü.
  const m = /circleComment\s*\n?\s*\.\s*updateMany[\s\S]{0,300}?\}\)/.exec(silme![0]);
  assert.ok(m, 'yorum kimliksizleştirmesi yok');
  assert.ok(/userId:\s*null/.test(m[0]), 'yorumdaki kimlik bağı kopmuyor');
});

test('kimliğin kendisi silinir ve hesap kapatılır', () => {
  const m = /user\s*\n?\s*\.\s*update\([\s\S]{0,500}?\}\)/.exec(silme![0]);
  assert.ok(m, 'User güncellemesi yok');
  for (const alan of ['phoneHash', 'email', 'avatarUrl', 'cutoutUrl']) {
    assert.ok(new RegExp(`\\b${alan}\\b`).test(m[0]), `${alan} temizlenmiyor`);
  }
  assert.ok(/status:\s*'deleted'/.test(m[0]), 'hesap kapatılmıyor');
});

// ── 3. kova: KALMASI GEREKENLER ─────────────────────────────────────────────

test('MALİ KAYITLAR silinmez — ledger append-only', () => {
  // CLAUDE.md finansı append-only ledger olarak bağlıyor; satır silmek
  // mutabakatı bozar. Kimlik User satırından kalktığı için bu kayıtlar
  // anlamsız bir UUID'ye bağlı kalır (takma adlaştırma).
  for (const model of ['loyaltyEntry', 'payment', 'commissionInvoice', 'subscription']) {
    assert.ok(
      !new RegExp(`${model}\\s*\\n?\\s*\\.\\s*deleteMany`).test(silme![0]),
      `${model} siliniyor — mali mutabakat bozulur`,
    );
  }
});

test('silme denetim kaydı bırakır', () => {
  assert.ok(/action: 'account\.delete'/.test(silme![0]), 'silme kayda geçmiyor');
});

// ── Dışa aktarım ────────────────────────────────────────────────────────────

test('gizli müşteri sinyali dışa aktarıma GİRMEZ', () => {
  // §7.3 — kullanıcının kendisine "sorunlu" dendiğini görmesi ürünün temel
  // güven vaadini bozardı. Randevular dışa aktarılıyor; sinyal alanının
  // oradan sızmadığından emin ol.
  assert.ok(
    !/providerSignal/.test(disaAktarim![0]),
    'dışa aktarım gizli sinyali taşıyor — müşteri kendisi hakkındaki notu görür',
  );
});

test('dışa aktarım kullanıcının kendi verisini kapsıyor', () => {
  for (const alan of ['randevular', 'puanDefteri', 'pasaport', 'mesajlasmalar']) {
    assert.ok(new RegExp(`\\b${alan}\\b`).test(disaAktarim![0]), `${alan} dışa aktarılmıyor`);
  }
});
