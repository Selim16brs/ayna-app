import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

/**
 * AÇILAN EKRAN VERİYİ YENİDEN SORUYOR.
 *
 * Kurucu: "uzman teklifi onayladı ama müşteriye teklif düşmedi."
 *
 * Teklif sunucuya yazılmıştı; müşterinin listesi UYGULAMA AÇILIŞINDA bir kez
 * doldurulup bir daha hiç tazelenmiyordu. Sekmeye bakan müşteri eski hâli
 * görüyor ve "gelmedi" diyordu. Aynı sessizlik randevu durumları için de
 * geçerliydi: uzman onaylıyor, müşteri eski durumu görüyor.
 */

const oku = (...p: string[]) => readFileSync(join(__dirname, '..', ...p), 'utf8');

test('MÜŞTERİ sekmesi odaklandığında TAZELENİYOR', () => {
  const k = oku('app', '(tabs)', 'bookings.tsx');
  const i = k.indexOf('useFocusEffect(');
  assert.ok(i > 0, 'ekran odaklanınca hiçbir şey sormuyor');
  const govde = k.slice(i, i + 400);
  assert.match(govde, /hydrateBookings\(\)/, 'randevular tazelenmiyor');
  assert.match(govde, /hydrateDemands\(\)/, 'teklifler tazelenmiyor');
});

test('SALON TAKVİMİ de odaklandığında tazeleniyor', () => {
  const k = oku('app', 'salon', 'agenda.tsx');
  const i = k.indexOf('useFocusEffect(');
  assert.ok(i > 0, 'salon takvimi hiç tazelenmiyor');
  assert.match(k.slice(i, i + 300), /hydrateBookings\(\)/, 'randevular tazelenmiyor');
});

test('TEKLİF EKRANI zaten sürekli soruyordu — kural bozulmasın', () => {
  /*
   * Sorun bu ekranda değildi; asıl bakılan yer olan sekmede kimse
   * sormuyordu. Buradaki döngü kalksa aynı hata oradan geri gelir.
   */
  const k = oku('app', 'quote', 'results.tsx');
  assert.match(k, /setInterval\(\(\) => void hydrateDemands\(\), 15_000\)/, 'düzenli tazeleme yok');
  assert.match(k, /return \(\) => clearInterval\(timer\)/, 'sayaç temizlenmiyor');
});
