import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { almatiHaftaGunu, gunKapali, haftaGunuKapali, kapaliSebebi } from './gun-kapali.js';
import { VARSAYILAN_CALISMA_SAATI, varsayilanCalismaSaatleri } from './varsayilan-saat.js';

/**
 * Kurucu (06.09.2026): "uzman izinli olarak işaretlemediği halde kullanıcıya
 * o gün çalışmıyor gibi görünüyor."
 *
 * Bir günün kapalı olmasının iki sebebi var (tek tek işaretlenmiş izin günü,
 * haftalık saatlerde kapalı gün). Sunucunun slot motoru ikisine de bakıyordu,
 * uzmanın takvimi yalnız birincisine: uzman kendini açık sanıyor, müşteri o
 * gün hiç slot görmüyordu.
 */

const SAATLER = (kapaliGunler: number[]) =>
  [0, 1, 2, 3, 4, 5, 6].map((wd) => ({
    wd,
    open: !kapaliGunler.includes(wd),
    from: '10:00',
    to: '20:00',
  }));

test('SAAT GİRİLMEMİŞSE gün kapalı DEĞİL', () => {
  /*
   * "Girmedi" ile "kapattı" aynı şey değil: sunucu o durumda varsayılan
   * pencereyi uyguluyor ve müşteri slot görüyor.
   *
   * BOŞ DİZİ de "girilmemiş" demek. `hours.length === 0` denetimi düşerse
   * `find` undefined döner ve kod kapalı SAYMAZ — yani bu satır davranışla
   * fark edilmez. Ama denetim, listenin boş olduğunu okuyan her ileri
   * değişiklik için kuralın kendisi: boş liste bir karar değil.
   */
  assert.equal(haftaGunuKapali([], 0), false, 'boş liste kapalı sayılıyor');
  assert.equal(haftaGunuKapali(null, 0), false);
  assert.equal(haftaGunuKapali(undefined, 3), false);
  // Kural KAYNAKTA da duruyor: boş liste açıkça eleniyor.
  const kaynak = readFileSync(new URL('./gun-kapali.ts', import.meta.url), 'utf8');
  assert.match(kaynak, /hours\.length === 0/, 'boş liste açıkça elenmiyor');
});

test('HAFTALIK saatlerde kapalı gün kapalı sayılıyor', () => {
  assert.equal(haftaGunuKapali(SAATLER([0]), 0), true);
  assert.equal(haftaGunuKapali(SAATLER([0]), 1), false);
});

test('LİSTEDE OLMAYAN gün kapalı sayılmıyor', () => {
  // Eksik satır bir karar değil; kapatmak uzmanın söylemediği bir şeyi
  // söylemek olurdu.
  const eksik = [{ wd: 1, open: true, from: '10:00', to: '20:00' }];
  assert.equal(haftaGunuKapali(eksik, 0), false);
});

test('İZİN GÜNÜ tek tek işaretlenmişse kapalı', () => {
  const gun = 1_757_000_000_000;
  assert.equal(gunKapali({ dayMs: gun, weekday: 3, closedDays: [gun] }), true);
  assert.equal(gunKapali({ dayMs: gun, weekday: 3, closedDays: [] }), false);
});

test('İKİ SEBEP de aynı cevabı üretiyor', () => {
  const gun = 1_757_000_000_000;
  assert.equal(gunKapali({ dayMs: gun, weekday: 0, hours: SAATLER([0]) }), true);
  assert.equal(gunKapali({ dayMs: gun, weekday: 0, closedDays: [gun] }), true);
  assert.equal(gunKapali({ dayMs: gun, weekday: 2, hours: SAATLER([0]) }), false);
});

test('SEBEP ayırt ediliyor — ekran doğru cümleyi yazsın', () => {
  /*
   * Uzman tek tek işaretlediği izin gününü ekrandan açabilir; haftalık
   * saatlerinden gelen kapalılığı ancak çalışma saatleri ekranından açabilir.
   * Sebebi söylemeyen bir kilit, uzmanı çalışmayan bir düğmeye bastırır.
   */
  const gun = 1_757_000_000_000;
  assert.equal(kapaliSebebi({ dayMs: gun, weekday: 0, closedDays: [gun] }), 'izin');
  assert.equal(kapaliSebebi({ dayMs: gun, weekday: 0, hours: SAATLER([0]) }), 'haftalik');
  assert.equal(kapaliSebebi({ dayMs: gun, weekday: 1, hours: SAATLER([0]) }), null);
  // İkisi birden varsa İZİN önce: uzmanın kendi işaretlediği gün, ekrandan
  // tek dokunuşla geri açılabilen olan.
  assert.equal(
    kapaliSebebi({ dayMs: gun, weekday: 0, hours: SAATLER([0]), closedDays: [gun] }),
    'izin',
  );
});

test('HAFTA GÜNÜ Almatı saatine göre', () => {
  // 6 Eylül 2026, Almatı'da Pazar.
  const pazar = Date.UTC(2026, 8, 6, 6, 0, 0);
  assert.equal(almatiHaftaGunu(pazar), 0);
  assert.equal(almatiHaftaGunu(pazar + 86_400_000), 1);
});

test('VARSAYILAN saatlerde hiçbir gün uzman adına kapatılmıyor', () => {
  /*
   * Ekran `open: wd !== 0` diyordu: PAZAR uzman adına kapalı işaretleniyordu.
   * Uzman ekranı hiç açmasa bile kaydediliyor ve müşteri o gün slot
   * göremiyordu — uzmanın takviminde ise kilit yoktu.
   */
  const s = varsayilanCalismaSaatleri();
  assert.equal(s.length, 7);
  assert.deepEqual(
    s.filter((d) => !d.open).map((d) => d.wd),
    [],
  );
});

test('varsayılan pencere SUNUCUNUNKİYLE aynı kaynaktan', () => {
  for (const d of varsayilanCalismaSaatleri()) {
    assert.equal(d.from, VARSAYILAN_CALISMA_SAATI.from);
    assert.equal(d.to, VARSAYILAN_CALISMA_SAATI.to);
  }
});

test('VARSAYILAN saatler hiçbir günü kapalı göstermiyor', () => {
  const gun = 1_757_000_000_000;
  for (let wd = 0; wd < 7; wd++) {
    assert.equal(gunKapali({ dayMs: gun, weekday: wd, hours: varsayilanCalismaSaatleri() }), false);
  }
});
