import assert from 'node:assert/strict';
import { test } from 'node:test';
import { EN_AZ_TALEP, HIZLI_CEVAP_DK, uzmanBasarisi, YAVAS_CEVAP_DK } from './uzman-basari.js';

/**
 * UZMAN BAŞARI YÜZDESİ — puan değil, başarı ölçüsü.
 *
 * Kurucu: "uzman ve salon puan toplayamaz. uzmanlar… başarı durumlarına
 * göre yüzde üzerinden değerlendirilir."
 */

test('VERİSİ OLMAYAN uzmana yüzde UYDURULMUYOR', () => {
  /*
   * "%0 başarı" yazmak, hiç çalışmamış bir uzmana kötü çalıştığını
   * söylemek olurdu.
   */
  const r = uzmanBasarisi({ tamamlanan: 0, gelenTalep: 0, puanOrt: null, cevapDk: null });
  assert.equal(r.yuzde, null);
  assert.deepEqual(r.bilesenler, []);
});

test('TEK TALEP bir ölçü değil — yeni uzman %0 damgası yemiyor', () => {
  /*
   * Canlıda görülen durum: yeni kayıt olan uzmana bir talep gelmiş, henüz
   * cevaplamamış. Oran 0/1 = %0 çıkıyor ve müşteri onu "başarısız" diye
   * görüyordu. Oysa daha ilk işi.
   *
   * `EN_AZ_TALEP` altında iş bileşeni ölçülemiyor sayılıyor; ölçülebilen
   * başka bir şey de yoksa yüzde yok, rozet hiç çizilmiyor.
   */
  const yeni = uzmanBasarisi({ tamamlanan: 0, gelenTalep: 1, puanOrt: null, cevapDk: null });
  assert.equal(yeni.yuzde, null, 'tek talepten yüzde üretiliyor');
  assert.deepEqual(yeni.bilesenler, []);

  // Eşiğe ULAŞINCA ölçülüyor — kural "hiç ölçme" değil, "azdan ölçme".
  const esik = uzmanBasarisi({
    tamamlanan: 0,
    gelenTalep: EN_AZ_TALEP,
    puanOrt: null,
    cevapDk: null,
  });
  assert.equal(esik.yuzde, 0, 'eşikte iş bileşeni hâlâ ölçülmüyor');

  /*
   * Eşiğin altındaki uzmanın ÖLÇÜLEBİLEN bileşeni varsa yüzde yine
   * çıkıyor: kural yalnız iş bileşenini susturuyor, uzmanı değil.
   */
  const cevaplayan = uzmanBasarisi({ tamamlanan: 0, gelenTalep: 1, puanOrt: null, cevapDk: 10 });
  assert.equal(cevaplayan.yuzde, 100);
  assert.deepEqual(
    cevaplayan.bilesenler.map((b) => b.ad),
    ['cevap'],
  );
});

test('MÜKEMMEL uzman %100', () => {
  const r = uzmanBasarisi({ tamamlanan: 20, gelenTalep: 20, puanOrt: 5, cevapDk: 5 });
  assert.equal(r.yuzde, 100);
});

test('EN DÜŞÜK değerlendirme SIFIR başarı değil… ama düşük', () => {
  // 5 üzerinden 1 almak en düşük not; ölçek 1–5 → 0–100.
  const r = uzmanBasarisi({ tamamlanan: 0, gelenTalep: 10, puanOrt: 1, cevapDk: YAVAS_CEVAP_DK });
  assert.equal(r.yuzde, 0);
});

test('EKSİK BİLEŞEN cezalandırmıyor — ağırlık paylaştırılıyor', () => {
  /*
   * Puanı olmayan bir uzman, eksik bileşen 0 sayılsaydı en fazla %65
   * alabilirdi: henüz değerlendirilmemiş olmak bir kusur değil.
   */
  const puansiz = uzmanBasarisi({ tamamlanan: 10, gelenTalep: 10, puanOrt: null, cevapDk: 10 });
  assert.equal(puansiz.yuzde, 100, 'puanı olmayan uzman tavana ulaşamıyor');
  assert.deepEqual(
    puansiz.bilesenler.map((b) => b.ad),
    ['is', 'cevap'],
  );
});

test('İŞ BAŞARISI ORAN — ham sayı değil', () => {
  /*
   * Ham "tamamlanan sayısı" kullansaydım büyük salon her zaman üstte
   * olurdu. Oran, gelen işi ne kadar sonuca ulaştırdığını söylüyor.
   */
  const kucuk = uzmanBasarisi({ tamamlanan: 5, gelenTalep: 5, puanOrt: null, cevapDk: null });
  const buyuk = uzmanBasarisi({ tamamlanan: 50, gelenTalep: 200, puanOrt: null, cevapDk: null });
  assert.ok(kucuk.yuzde! > buyuk.yuzde!, 'çok iş yapan az başarılı olanı geçiyor');
});

test('CEVAP SÜRESİ eşikleri', () => {
  const g = { tamamlanan: 0, gelenTalep: 0, puanOrt: null };
  assert.equal(
    uzmanBasarisi({ ...g, cevapDk: HIZLI_CEVAP_DK }).yuzde,
    100,
    'hızlı cevap tam değil',
  );
  assert.equal(uzmanBasarisi({ ...g, cevapDk: 1 }).yuzde, 100);
  assert.equal(
    uzmanBasarisi({ ...g, cevapDk: YAVAS_CEVAP_DK }).yuzde,
    0,
    'yavaş cevap sıfır değil',
  );
  assert.equal(uzmanBasarisi({ ...g, cevapDk: 500 }).yuzde, 0, 'çok yavaş negatife düşüyor');
  // Arası doğrusal: 105 dk tam ortası.
  assert.equal(uzmanBasarisi({ ...g, cevapDk: 105 }).yuzde, 50);
});

test('TAMAMLANAN talepten ÇOK olsa bile %100 aşılmıyor', () => {
  // Veri tutarsızlığı yüzde 120 üretmemeli.
  const r = uzmanBasarisi({ tamamlanan: 15, gelenTalep: 10, puanOrt: null, cevapDk: null });
  assert.equal(r.yuzde, 100);
});

test('BİLEŞENLER ekrana ayrı ayrı dönüyor', () => {
  // Uzman "neden %70" sorusunun cevabını görebilmeli.
  const r = uzmanBasarisi({ tamamlanan: 8, gelenTalep: 10, puanOrt: 4, cevapDk: 30 });
  assert.deepEqual(
    r.bilesenler.map((b) => b.ad),
    ['is', 'puan', 'cevap'],
  );
  assert.equal(r.bilesenler[0]!.yuzde, 80);
  assert.equal(r.bilesenler[1]!.yuzde, 75);
  assert.equal(r.bilesenler[2]!.yuzde, 100);
});
