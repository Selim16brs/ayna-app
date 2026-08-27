import assert from 'node:assert/strict';
import { test } from 'node:test';
import { aynaOnayli, guvenKatmanlari, uzmanKayitli, type TrustLayers } from './ayna-verified.js';

const bos: TrustLayers = {
  identity: false,
  business: false,
  bin: false,
  address: false,
  social: false,
  cert: false,
};
const k = (o: Partial<TrustLayers>): TrustLayers => ({ ...bos, ...o });

test('kimlik olmadan rozet YOK', () => {
  // Kim olduğu bilinmeyen birine güven rozeti verilmez — kaç sertifikası
  // olursa olsun. Bu, kuralın tek mutlak koşulu.
  assert.equal(aynaOnayli('expert', k({ cert: true, social: true })), false);
  assert.equal(aynaOnayli('salon', k({ business: true, bin: true })), false);
  assert.equal(aynaOnayli('expert', k({ cert: true }), true), false);
});

test('uzman: sertifika VEYA sosyal VEYA kayıt yeter', () => {
  assert.equal(aynaOnayli('expert', k({ identity: true, cert: true })), true);
  assert.equal(aynaOnayli('expert', k({ identity: true, social: true })), true);
  // Kayıtlı ИП — üç yerden ikisinin KAÇIRDIĞI durum. Katalog rozeti
  // gösteriyordu, uzmanın kendi ekranı "değilsin" diyordu.
  assert.equal(aynaOnayli('expert', k({ identity: true }), true), true);
  assert.equal(aynaOnayli('expert', k({ identity: true })), false);
});

test('salon: işletme VEYA BİN yeter, sertifika saymaz', () => {
  assert.equal(aynaOnayli('salon', k({ identity: true, business: true })), true);
  assert.equal(aynaOnayli('salon', k({ identity: true, bin: true })), true);
  // Salonun kanıtı tüzel kişilik; sertifika/sosyal onun yerine geçmez.
  assert.equal(aynaOnayli('salon', k({ identity: true, cert: true, social: true })), false);
  // Kayıt bayrağı salonda dikkate ALINMAZ — o uzmanın ИП kaydı.
  assert.equal(aynaOnayli('salon', k({ identity: true }), true), false);
});

test('kayıt: ИП + 12 haneli IIN', () => {
  assert.equal(uzmanKayitli('ip', '123456789012'), true);
  assert.equal(uzmanKayitli('ip', '12345678901'), false, '11 hane geçmemeli');
  assert.equal(uzmanKayitli('ip', '1234567890123'), false, '13 hane geçmemeli');
  assert.equal(uzmanKayitli('ip', 'abcdefghijkl'), false, 'harf geçmemeli');
  assert.equal(uzmanKayitli('freelance', '123456789012'), false, 'serbest çalışan kayıtlı değil');
  assert.equal(uzmanKayitli(null, null), false);
});

test('katman eşlemesi: salon bayrakları uzmanınkini ezer', () => {
  const k = guvenKatmanlari({
    kind: 'salon',
    kycOnayli: true,
    kayitli: true,
    salon: { identityVerified: false, businessVerified: true, socialVerified: false },
    uzman: { certVerified: true, socialVerified: true },
  });
  // Salon kendi bayrağını taşıyorsa hesap seviyesine DÜŞÜLMEZ.
  assert.equal(k.identity, false, 'salon kimliği kyc ile ezilmiş');
  assert.equal(k.social, false, 'salon sosyali uzmanınkiyle ezilmiş');
  assert.equal(k.cert, false, 'salonda sertifika katmanı olmamalı');
});

test('katman eşlemesi: salon bayrağı yoksa hesaba düşer', () => {
  const k = guvenKatmanlari({
    kind: 'expert',
    kycOnayli: true,
    kayitli: true,
    uzman: { certVerified: true },
  });
  assert.equal(k.identity, true);
  assert.equal(k.business, true, 'kayıtlı ИП işletme katmanını doldurmalı');
  assert.equal(k.cert, true);
});
