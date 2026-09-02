import assert from 'node:assert/strict';
import { test } from 'node:test';
import { kk } from './messages/kk';
import { ru } from './messages/ru';
import { tr } from './messages/tr';

/**
 * SELAMLAMA metinleri.
 *
 * Kurucu: "uzman profılıne kullanıcı adı yazmıyor Gunaydın yazan ksımda."
 *
 * Sebep: 'Günaydın', 'İyi günler'… metinleri isim için YER TUTUCU
 * taşımıyordu. Ekran doldurma çağırıyordu ama doldurulacak bir şey yoktu;
 * `fillParams` bilinmeyeni olduğu gibi bırakır, yani hata ne çöker ne
 * uyarır — sadece isim hiç görünmez.
 *
 * Bu dosya `packages/i18n` içinde, çünkü metinlerin KAYNAĞINI okumalı:
 * mobil taraftan `@ayna/i18n` derlenmiş `dist`e çözülüyor ve kaynaktan
 * silinen bir yer tutucuyu göremiyor. İlk hâlini oraya yazmıştım ve
 * mutasyon testi tam bu yüzden sessiz kaldı.
 */

const DILLER = [
  ['tr', tr],
  ['kk', kk],
  ['ru', ru],
] as const;

test('isimli selamlama üç dilde var', () => {
  for (const [dil, m] of DILLER) {
    const s = (m as Record<string, string>)['benim.hello.named'];
    assert.ok(s, `${dil}: 'benim.hello.named' yok`);
  }
});

test('isimli selamlama İKİ yer tutucuyu da taşıyor', () => {
  // '{selam}' saate göre gelen karşılama, '{ad}' kullanıcının adı.
  // Biri eksikse o dilde ya karşılama ya isim kaybolur.
  for (const [dil, m] of DILLER) {
    const s = (m as Record<string, string>)['benim.hello.named']!;
    assert.match(s, /\{selam\}/, `${dil}: '{selam}' yok — karşılama kaybolur`);
    assert.match(s, /\{ad\}/, `${dil}: '{ad}' yok — İSİM KAYBOLUR (asıl hata buydu)`);
  }
});

test('çıplak selamlamalar üç dilde de yer tutucusuz KALIYOR', () => {
  // Bunlar tek başına da kullanılıyor (bakım ekranı, salon ana ekranı).
  // İsim eklenirse oralarda yarım cümle çıkar.
  for (const [dil, m] of DILLER) {
    for (const k of [
      'benim.hello.morning',
      'benim.hello.day',
      'benim.hello.evening',
      'benim.hello.night',
    ]) {
      const s = (m as Record<string, string>)[k]!;
      assert.ok(s, `${dil}: '${k}' yok`);
      assert.doesNotMatch(s, /\{\w+\}/, `${dil}: '${k}' yer tutucu taşıyor`);
    }
  }
});
