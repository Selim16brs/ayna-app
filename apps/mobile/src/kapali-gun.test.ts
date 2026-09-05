import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { gunKapali, varsayilanCalismaSaatleri as defaultHours } from '@ayna/domain';

/**
 * UZMANIN TAKVİMİ İLE MÜŞTERİNİN GÖRDÜĞÜ AYNI OLMALI.
 *
 * Kurucu (06.09.2026): "uzman izinli olarak işaretlemediği halde kullanıcıya
 * o gün çalışmıyor gibi görünüyor."
 *
 * İki ayrı hata bir aradaydı:
 *   1. Çalışma saatleri ekranı PAZAR gününü uzman adına kapalı işaretliyordu.
 *   2. Uzmanın takvimi yalnız tek tek işaretlenmiş izin günlerini biliyordu;
 *      haftalık saatlerden gelen kapalılığı hiç göstermiyordu.
 *
 * Sonuç: uzman kendini açık sanıyor, müşteri o gün hiç slot görmüyordu.
 */

function yorumsuz(yol: string): string {
  return readFileSync(yol, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/^\s*\/\/.*$/gm, '');
}

test('VARSAYILAN saatlerde hiçbir gün kapalı DEĞİL', () => {
  const s = defaultHours();
  assert.equal(s.length, 7);
  const kapali = s.filter((d) => !d.open).map((d) => d.wd);
  assert.deepEqual(kapali, [], `sistem uzman adına gün kapatıyor: ${kapali.join(',')}`);
});

test('varsayılan pencere SUNUCUYLA aynı', () => {
  // Sunucu saat girilmemiş uzmana 10:00–20:00 uyguluyor. Ekran başka bir
  // aralık gösterseydi uzman gördüğünden farklı saatlerde randevu alırdı.
  for (const d of defaultHours()) {
    assert.equal(d.from, '10:00');
    assert.equal(d.to, '20:00');
  }
});

test('TAKVİM haftalık kapalılığı da gösteriyor', () => {
  const ekran = yorumsuz('app/seller/agenda.tsx');
  // Kilit artık yalnız `closedDays` listesine bakmıyor.
  assert.doesNotMatch(
    ekran,
    /const closed = closedDays\.includes\(dayMs\)/,
    'takvim yalnız izin günlerine bakıyor — haftalık kapalılık görünmüyor',
  );
  assert.match(ekran, /gunKapali\(/, 'ortak kural kullanılmıyor');
  assert.match(ekran, /hours: sellerHours/, 'haftalık saatler hesaba katılmıyor');
});

test('HAFTALIK kapalı günde ÇALIŞMAYAN düğme gösterilmiyor', () => {
  /*
   * "Kapalı işaretle" yalnız tarih bazlı izin gününü açıp kapatıyor.
   * Haftalık kapalı günde o düğme hiçbir şey değiştirmiyordu; uzman gün
   * açılmadığı için tekrar tekrar basardı.
   */
  const ekran = yorumsuz('app/seller/agenda.tsx');
  assert.match(ekran, /kapaliNeden === 'haftalik'/, 'sebep ayırt edilmiyor');
  assert.match(ekran, /router\.push\('\/seller\/hours'\)/, 'doğru ekrana yönlendirilmiyor');
});

test('kural gerçekten çalışıyor — iki sebep de kapalı üretiyor', () => {
  const gun = 1_757_000_000_000;
  const saatler = defaultHours().map((d) => (d.wd === 0 ? { ...d, open: false } : d));
  assert.equal(gunKapali({ dayMs: gun, weekday: 0, hours: saatler }), true);
  assert.equal(gunKapali({ dayMs: gun, weekday: 0, closedDays: [gun] }), true);
  assert.equal(gunKapali({ dayMs: gun, weekday: 1, hours: saatler, closedDays: [] }), false);
});
