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
   * Eşiğin altındaki uzman HIZLI CEVAP VERSE DE yüzde çıkmıyor.
   *
   * Canlıda (05.09.2026) görülen: tamamlanmış tek işi, tek değerlendirmesi
   * olmayan uzmanın kartında yeşil "↗ %100 başarı". Tek ölçülebilen bileşen
   * cevap süresiydi ve ağırlık paylaştırması onu %25'ten %100'e çıkarıyordu.
   * Müşteri o rozeti "aldığı işlerin %100'ü iyi gitmiş" diye okuyor.
   */
  const cevaplayan = uzmanBasarisi({ tamamlanan: 0, gelenTalep: 1, puanOrt: null, cevapDk: 10 });
  assert.equal(cevaplayan.yuzde, null, 'hızlı cevap tek başına başarı yüzdesi üretiyor');
  assert.deepEqual(cevaplayan.bilesenler, []);
});

test('CEVAP SÜRESİ TEK BAŞINA yüzde üretmiyor — iş kanıtı şart', () => {
  // Hiç işi yok, hiç değerlendirmesi yok: ne kadar hızlı dönerse dönsün rozet yok.
  for (const dk of [1, 10, 30]) {
    const r = uzmanBasarisi({ tamamlanan: 0, gelenTalep: 0, puanOrt: null, cevapDk: dk });
    assert.equal(r.yuzde, null, `${dk} dk cevaptan yüzde doğuyor`);
  }
  // İŞ KANITI gelince ölçülüyor: bir değerlendirme yeter…
  const puanli = uzmanBasarisi({ tamamlanan: 0, gelenTalep: 0, puanOrt: 5, cevapDk: 10 });
  assert.equal(puanli.yuzde, 100);
  // …ya da eşiği geçen talep sayısı.
  const isli = uzmanBasarisi({
    tamamlanan: EN_AZ_TALEP,
    gelenTalep: EN_AZ_TALEP,
    puanOrt: null,
    cevapDk: 10,
  });
  assert.equal(isli.yuzde, 100);
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
  /*
   * Eşikler BİLEŞENİN KENDİ yüzdesinden okunuyor. Eskiden toplam yüzdeden
   * okunuyordu ve bu ancak cevap süresi TEK bileşenken çalışıyordu — yani
   * testin kendisi, kartta "%100 başarı" yalanını üreten duruma dayanıyordu.
   * İş kanıtı veriliyor; ölçülen yine yalnız cevap bileşeni.
   */
  const g = { tamamlanan: 0, gelenTalep: 0, puanOrt: 3 };
  const cevap = (dk: number) =>
    uzmanBasarisi({ ...g, cevapDk: dk }).bilesenler.find((b) => b.ad === 'cevap')?.yuzde;
  assert.equal(cevap(HIZLI_CEVAP_DK), 100, 'hızlı cevap tam değil');
  assert.equal(cevap(1), 100);
  assert.equal(cevap(YAVAS_CEVAP_DK), 0, 'yavaş cevap sıfır değil');
  assert.equal(cevap(500), 0, 'çok yavaş negatife düşüyor');
  // Arası doğrusal: 105 dk tam ortası.
  assert.equal(cevap(105), 50);
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
