import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BOOKING_STATUSES } from '@ayna/domain';
import { tr } from '@ayna/i18n';
import { beklemeMetni } from './booking-flow';

/**
 * ÜSLUP — sistem günlüğü değil, karşıdakine konuşan metin.
 *
 * Kurucu: "sanki resmî bir açıklama gibi, diyalog dışında mesajlar var...
 * çok fazla gereksiz açıklama var. daha profesyonelce ve muhatabına yazar
 * tarzda olmalı."
 *
 * Metin yazmak makineye bırakılamaz ama iki şey ölçülebilir: uzunluk ve
 * bürokratik kalıplar. Bu testler onları tutuyor.
 */

const TR: Record<string, string> = tr;

test('bekleme satırı KISA — nabzın yanında tek nefeste okunuyor', () => {
  for (const st of BOOKING_STATUSES) {
    for (const rol of ['musteri', 'uzman'] as const) {
      const metin = TR[beklemeMetni(st, rol)]!;
      assert.ok(
        metin.length <= 34,
        `${st}/${rol}: ${metin.length} karakter — "${metin}" nabzın yanına sığmaz`,
      );
      // Nokta = cümle = açıklama. Bekleme satırı etikettir, cümle değil.
      assert.ok(!metin.includes('.'), `${st}/${rol}: "${metin}" cümleye dönüşmüş`);
    }
  }
});

test('randevu metinlerinde bürokratik kalıp yok', () => {
  // "Karşı taraf", "işlem gerçekleştirilmiştir" gibi resmî yazışma dili
  // kullanıcıya değil, dosyaya yazılmış gibi okunuyor.
  const yasak = [
    'karşı taraf',
    'gerçekleştiril',
    'tarafınıza',
    'tarafından',
    'işlem yapılmıştır',
    'söz konusu',
  ];
  const onek = ['wait.', 'flow.', 'booking.balance.', 'booking.money.', 'deposit.', 'refund.'];
  for (const [k, v] of Object.entries(TR)) {
    if (!onek.some((o) => k.startsWith(o))) continue;
    for (const kalip of yasak) {
      assert.ok(!v.toLowerCase().includes(kalip), `${k}: "${v}" — bürokratik kalıp "${kalip}"`);
    }
  }
});

test('para kartında parantez içi açıklama yok', () => {
  // "Kalan (hizmet sonrası yerinde ödenir)" gibi satırlar etiketi açıklamaya
  // çalışıyordu; etiket kendi başına anlaşılmalı.
  for (const k of [
    'booking.balance.remaining',
    'booking.money.onsite',
    'booking.deposit.remaining',
  ]) {
    const v = TR[k]!;
    assert.ok(!v.includes('('), `${k}: "${v}" parantezle açıklıyor`);
    assert.ok(v.length <= 30, `${k}: "${v}" etiket için uzun`);
  }
});

test('silinmiş komisyon akışından kalan metin yok', () => {
  // "45 dakikalık süren başlar" — MD §4.4 ikinci tahsilatı kaldırdı; metin
  // kalmıştı ve uzmana olmayan bir süreyi vaat ediyordu.
  for (const [k, v] of Object.entries(TR)) {
    if (!k.startsWith('booking.') && !k.startsWith('flow.')) continue;
    assert.ok(!/komisyon/i.test(v), `${k}: "${v}" — komisyon akışı kaldırıldı`);
    assert.ok(!/45 dakika/i.test(v), `${k}: "${v}" — kaldırılan süre kuralı`);
  }
});
