import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ACILIS_MESAJLARI, PUAN_ESIGI } from './mesajlar.js';
import { BOS_DURUM, acilisMesajiSec, pencereIcinde, type SplashBaglami } from './secim.js';

/**
 * AÇILIŞ MESAJLARI — `AYNA_ACILIS_MESAJLARI_BRIEF.md` v2.0.
 *
 * §3 öncelik sırası, tekrarsız rotasyon ve §4 cinsiyet kuralı.
 */

/** Sıradan bir salı öğleden sonrası — hiçbir özel pencereye denk gelmiyor. */
const NORMAL = new Date(2026, 9, 13, 14, 0, 0); // 13 Ekim 2026, Salı 14:00

const baglam = (over: Partial<SplashBaglami> = {}): SplashBaglami => ({
  simdi: NORMAL,
  dil: 'tr',
  cinsiyet: 'female',
  durum: { ...BOS_DURUM, sonGosterimZamani: {} },
  ...over,
});

const ilk = () => 0; // rastgele yerine: listenin ilkini seç

test('KATALOG brief ile birebir — 54 mesaj, 8 female', () => {
  /*
   * Brief §2 sonu: "Toplam: 54 mesaj (8 female / 46 neutral)."
   * Bir mesaj sessizce düşerse ya da etiketi değişirse burada patlıyor.
   */
  assert.equal(ACILIS_MESAJLARI.length, 54);
  assert.equal(ACILIS_MESAJLARI.filter((m) => m.etiket === 'female').length, 8);
  assert.equal(new Set(ACILIS_MESAJLARI.map((m) => m.id)).size, 54, 'kimlikler tekil değil');
  for (const m of ACILIS_MESAJLARI) {
    for (const d of ['tr', 'ru', 'kk'] as const) {
      assert.ok(m.metin[d]?.trim(), `${m.id} · ${d} çevirisi boş`);
    }
  }
});

test('bh_01 HER ŞEYDEN ÖNCE — ama ömürde bir kez', () => {
  const b = baglam({ ilkAcilis: true });
  const r = acilisMesajiSec(b, ilk);
  assert.equal(r.id, 'bh_01');
  // İkinci açılışta bir daha gelmiyor.
  const r2 = acilisMesajiSec({ ...b, durum: r.durum }, ilk);
  assert.notEqual(r2.id, 'bh_01');
});

test('DOĞUM GÜNÜ özel günü YENİYOR', () => {
  /*
   * Brief §3: "Doğum günü bir özel güne denk gelirse doğum günü kazanır."
   * 8 Mart hem sp_03 penceresi hem doğum günü olsun.
   */
  const sekizMart = new Date(2026, 2, 8, 10, 0, 0);
  const r = acilisMesajiSec(
    baglam({ simdi: sekizMart, dogumGunu: { ay: 3, gun: 8 }, ad: 'Aida' }),
    ilk,
  );
  assert.equal(r.id, 'pn_02');
  assert.ok(r.metin.includes('Aida'), 'ad yerleştirilmemiş');
});

test('AD YOKSA doğum günü mesajı KISALTILMIŞ hâliyle geliyor', () => {
  // Brief §2.6 — mesaj havuzdan DÜŞMÜYOR, adsız varyantı var.
  const r = acilisMesajiSec(baglam({ dogumGunu: { ay: 10, gun: 13 }, ad: null }), ilk);
  assert.equal(r.id, 'pn_02');
  assert.equal(r.metin, 'İyi ki doğdun! Bugün ışılda!');
  assert.ok(!r.metin.includes('{name}'), 'yer tutucu ekranda kalmış');
});

test('ÖZEL GÜN penceresinde İLK açılışta kesin, sonrakinde havuz', () => {
  const nauryz = new Date(2026, 2, 21, 12, 0, 0);
  const b = baglam({ simdi: nauryz });
  const r = acilisMesajiSec(b, ilk);
  assert.equal(r.id, 'sp_04');
  const r2 = acilisMesajiSec({ ...b, durum: r.durum }, ilk);
  assert.notEqual(r2.id, 'sp_04', 'aynı gün ikinci açılışta yine özel gün geldi');
});

test('YIL SINIRINI AŞAN pencere (31 Ara – 7 Oca) çalışıyor', () => {
  /*
   * Naif bir karşılaştırma (bas <= bugün <= son) bu pencerede HİÇ
   * eşleşmez: 1231 > 0107. Yılbaşı mesajı hiç görünmezdi.
   */
  const p = { bas: [12, 31] as [number, number], son: [1, 7] as [number, number] };
  assert.ok(pencereIcinde(p, new Date(2026, 11, 31)), '31 Aralık dışarıda');
  assert.ok(pencereIcinde(p, new Date(2027, 0, 3)), '3 Ocak dışarıda');
  assert.ok(!pencereIcinde(p, new Date(2027, 0, 8)), '8 Ocak içeride sanıldı');
  assert.ok(!pencereIcinde(p, new Date(2026, 5, 1)), 'haziran içeride sanıldı');
});

test('DAVRANIŞ ÖNCELİĞİ: bh_04 > bh_03 > bh_05 > bh_06 > bh_02', () => {
  // Brief §3.4 sırası. Hepsi aynı anda uygunken bugünkü randevu kazanmalı.
  const hepsi = {
    bugunRandevuId: 'r1',
    yarinRandevuId: 'r2',
    tamamlananRandevuId: 'r3',
    puan: PUAN_ESIGI,
    yoklukGunu: 40,
  };
  assert.equal(acilisMesajiSec(baglam(hepsi), ilk).id, 'bh_04');
  // Öncelik sırasını tek tek üsttekini düşürerek sınıyoruz.
  const bugunsuz = { ...hepsi, bugunRandevuId: undefined };
  assert.equal(acilisMesajiSec(baglam(bugunsuz), ilk).id, 'bh_03');
  const yarinsiz = { ...bugunsuz, yarinRandevuId: undefined };
  assert.equal(acilisMesajiSec(baglam(yarinsiz), ilk).id, 'bh_05');
  const tamamsiz = { ...yarinsiz, tamamlananRandevuId: undefined };
  assert.equal(acilisMesajiSec(baglam(tamamsiz), ilk).id, 'bh_06');
  assert.equal(acilisMesajiSec(baglam({ yoklukGunu: 40 }), ilk).id, 'bh_02');
});

test('RANDEVU BAZLI limit: aynı randevuda bir kez, YENİSİNDE yeniden', () => {
  /*
   * "Randevu başına 1" limiti kimliğe değil RANDEVUYA bağlı. Kimliğe
   * bağlasaydık ikinci randevusunda müşteri hiç hatırlatma almazdı.
   */
  const b = baglam({ bugunRandevuId: 'r1' });
  const r = acilisMesajiSec(b, ilk);
  assert.equal(r.id, 'bh_04');
  assert.notEqual(acilisMesajiSec({ ...b, durum: r.durum }, ilk).id, 'bh_04');
  const yeni = acilisMesajiSec({ ...b, bugunRandevuId: 'r2', durum: r.durum }, ilk);
  assert.equal(yeni.id, 'bh_04', 'yeni randevuda hatırlatma gelmiyor');
});

test('bh_06 puan EŞİĞİNİN ALTINDA gelmiyor', () => {
  assert.notEqual(acilisMesajiSec(baglam({ puan: PUAN_ESIGI - 1 }), ilk).id, 'bh_06');
  assert.equal(acilisMesajiSec(baglam({ puan: PUAN_ESIGI }), ilk).id, 'bh_06');
});

test('CİNSİYET kadın değilse `female` mesaj GELMİYOR', () => {
  // Brief §4. Havuzun tamamı taranıyor: tek bir tur yeterli değil.
  let durum = BOS_DURUM;
  const gorulen = new Set<string>();
  for (let i = 0; i < 200; i++) {
    const r = acilisMesajiSec(baglam({ cinsiyet: 'male', durum }), () => (i % 7) / 7);
    gorulen.add(r.id);
    durum = r.durum;
  }
  const kadinsi = ACILIS_MESAJLARI.filter((m) => m.etiket === 'female').map((m) => m.id);
  for (const id of kadinsi) assert.ok(!gorulen.has(id), `erkek kullanıcıya ${id} gösterildi`);
});

test('ÜST ÜSTE aynı mesaj YOK — hiçbir koşulda', () => {
  let durum = BOS_DURUM;
  let onceki: string | null = null;
  for (let i = 0; i < 300; i++) {
    const r = acilisMesajiSec(baglam({ durum }), () => (i * 0.37) % 1);
    assert.notEqual(r.id, onceki, `${i}. açılışta tekrar: ${r.id}`);
    onceki = r.id;
    durum = r.durum;
  }
});

test('TEKRARSIZ DÖNGÜ — havuz bitmeden aynı mesaj gelmiyor', () => {
  /*
   * Brief §3: "havuzdaki uygun mesajların tamamı gösterilmeden aynı mesaj
   * tekrar gelmez."
   */
  /*
   * HAVUZ BOYUNU ELLE HESAPLAMIYORUM.
   *
   * İlk denememde katalogdan süzerek saydım ama saat/gün/pencere
   * koşullarını uygulamayı unuttum: beklenen sayı gerçek havuzdan
   * büyüktü ve test, motor DOĞRU çalışırken düştü.
   *
   * Havuz artık motorun kendisinden ölçülüyor: çok sayıda çekilişte
   * kaç FARKLI mesaj üretebiliyorsa havuz odur. Sonra ilk tekrarın
   * tam olarak o sayıdan SONRA geldiği doğrulanıyor.
   */
  const cek = (n: number): string[] => {
    let d = BOS_DURUM;
    const out: string[] = [];
    for (let i = 0; i < n; i++) {
      const r = acilisMesajiSec(baglam({ durum: d }), () => (i * 0.41) % 1);
      out.push(r.id);
      d = r.durum;
    }
    return out;
  };
  const uzun = cek(400);
  const havuzBoyu = new Set(uzun).size;
  assert.ok(havuzBoyu > 25, `havuz beklenenden küçük: ${havuzBoyu}`);

  const ilkTur = uzun.slice(0, havuzBoyu);
  assert.equal(new Set(ilkTur).size, havuzBoyu, `tur bitmeden tekrar var: ${ilkTur.join(',')}`);
});

test('SAAT ARALIĞI dışındaki mesaj havuza girmiyor', () => {
  // Gece 03:00 — Grup C hiç havuzda değil (brief §2.3).
  let durum = BOS_DURUM;
  const gece = new Date(2026, 9, 13, 3, 0, 0);
  const gorulen = new Set<string>();
  for (let i = 0; i < 120; i++) {
    const r = acilisMesajiSec(baglam({ simdi: gece, durum }), () => (i * 0.29) % 1);
    gorulen.add(r.id);
    durum = r.durum;
  }
  for (const id of ['tod_01', 'tod_02', 'tod_03', 'tod_04', 'tod_05']) {
    assert.ok(!gorulen.has(id), `gece 03:00'te ${id} gösterildi`);
  }
});

test('SABAH mesajı sabah GELİYOR', () => {
  let durum = BOS_DURUM;
  const sabah = new Date(2026, 9, 13, 8, 0, 0);
  const gorulen = new Set<string>();
  for (let i = 0; i < 120; i++) {
    const r = acilisMesajiSec(baglam({ simdi: sabah, durum }), () => (i * 0.29) % 1);
    gorulen.add(r.id);
    durum = r.durum;
  }
  assert.ok(gorulen.has('tod_01') || gorulen.has('tod_02'), 'sabah mesajı hiç gelmedi');
});

test('HAFTANIN GÜNÜ — pazartesi mesajı salı gelmiyor', () => {
  let durum = BOS_DURUM;
  const gorulen = new Set<string>();
  for (let i = 0; i < 120; i++) {
    const r = acilisMesajiSec(baglam({ durum }), () => (i * 0.29) % 1); // NORMAL = salı
    gorulen.add(r.id);
    durum = r.durum;
  }
  assert.ok(!gorulen.has('dow_01'), 'salı günü pazartesi mesajı geldi');
  assert.ok(!gorulen.has('dow_02'), 'salı günü cuma mesajı geldi');
});

test('AD YOKSA pn_01 havuza GİRMİYOR', () => {
  // Brief §2: "ad yoksa o mesaj havuza girmez."
  let durum = BOS_DURUM;
  const gorulen = new Set<string>();
  for (let i = 0; i < 120; i++) {
    const r = acilisMesajiSec(baglam({ ad: null, durum }), () => (i * 0.29) % 1);
    gorulen.add(r.id);
    durum = r.durum;
  }
  assert.ok(!gorulen.has('pn_01'), 'adsız kullanıcıya {name} mesajı gösterildi');
});

test('DİL — mesaj seçili dilde geliyor, bilinmeyende TÜRKÇEYE düşüyor', () => {
  const b = baglam({ dogumGunu: { ay: 10, gun: 13 }, ad: 'Aida' });
  assert.ok(acilisMesajiSec({ ...b, dil: 'ru' }, ilk).metin.includes('рождения'));
  assert.ok(acilisMesajiSec({ ...b, dil: 'kk' }, ilk).metin.includes('Туған'));
  assert.ok(acilisMesajiSec({ ...b, dil: 'xx' }, ilk).metin.includes('İyi ki doğdun'));
});

test('HİÇBİR metinde çözülmemiş yer tutucu kalmıyor', () => {
  let durum = BOS_DURUM;
  for (let i = 0; i < 200; i++) {
    const r = acilisMesajiSec(baglam({ ad: 'Aida', durum }), () => (i * 0.13) % 1);
    assert.ok(!r.metin.includes('{'), `${r.id} yer tutucu taşıyor: ${r.metin}`);
    durum = r.durum;
  }
});

test('DOĞUM GÜNÜ günde BİR kez — ikinci açılışta havuz', () => {
  /*
   * Brief §3: doğum günü mesajı "o günkü İLK açılış". Limitsiz kalsaydı
   * kullanıcı doğum gününde uygulamayı her açtığında aynı mesajı
   * görürdü.
   */
  const b = baglam({ dogumGunu: { ay: 10, gun: 13 }, ad: 'Aida' });
  const r = acilisMesajiSec(b, ilk);
  assert.equal(r.id, 'pn_02');
  const r2 = acilisMesajiSec({ ...b, durum: r.durum }, ilk);
  assert.notEqual(r2.id, 'pn_02', 'doğum gününde ikinci açılışta yine aynı mesaj');
});

test('TUR SINIRINDA da tekrar yok — sıfırlama son gösterileni dışlıyor', () => {
  /*
   * Kritik an tur bitişi: havuz tükendiğinde yeni tur karılıyor ve
   * "yeni turun ilki bir önceki gösterimle aynı olamaz" (brief §3).
   *
   * Bu testi ayrı yazdım çünkü genel döngü testi sınırı rastgele
   * yakalıyordu; burada sınır ZORLANIYOR: her seferinde listenin SON
   * elemanı seçiliyor, böylece tur sonu deterministik geliyor.
   */
  /*
   * SINIR ZORLANIYOR, RASTGELEYE BIRAKILMIYOR.
   *
   * İlk denememde 200 açılış çekip tekrar aramıştım; sıfırlama
   * korumasını kaldıran mutasyon YAKALANMADI çünkü seçici o anda zaten
   * başka bir mesaja denk geliyordu.
   *
   * Burada durum ELLE kuruluyor: havuz tükenmiş (`gorulenler` dolu) ve
   * son gösterilen, havuzun İLK mesajı. Seçici de ilk elemanı seçiyor.
   * Koruma yoksa aynı mesaj arka arkaya gelir.
   */
  const tukenmis = {
    gorulenler: ACILIS_MESAJLARI.map((m) => m.id),
    sonGosterilen: 'msg_01',
    sonGosterimZamani: {},
  };
  const r = acilisMesajiSec(baglam({ durum: tukenmis }), ilk);
  assert.notEqual(r.id, 'msg_01', 'tur sıfırlanırken son mesaj yeniden seçildi');
  // Sıfırlama sonrası tur yeniden başlamış olmalı: yalnız yeni mesaj işaretli.
  assert.deepEqual(r.durum.gorulenler, [r.id], 'tur sıfırlanmadı');
});

test('ÇAKIŞAN PENCERELER: öncelik sırası TEK belirleyici — brief §7.5', () => {
  /*
   * Brief §7.5'in kendi örneği: 21 Mart'ta Nauryz (sp_04, öncelikli) ile
   * düğün sezonu (sp_07, 1 Mayıs–30 Eylül) yakın; ayrıca kış bakımı
   * (sp_05, 1 Aralık–29 Şubat) da tarih sınırında. Aynı anda birden çok
   * pencere açıksa karar RASTGELE ya da "listede önce gelen" DEĞİL;
   * §3'teki öncelik sırası belirliyor.
   */
  const nevruz = new Date(2026, 2, 21, 14, 0, 0);
  const t = (d: SplashDurumu, simdi = nevruz) => acilisMesajiSec({ dil: 'tr', simdi, durum: d });

  // Öncelikli özel gün, genel havuzdaki sezon mesajlarını YENİYOR.
  const ilk = t(BOS_DURUM);
  assert.equal(ilk.id, 'sp_04', 'Nauryz penceresinde öncelikli mesaj kazanmadı');

  // Doğum günü öncelikli özel günü DE yeniyor (§3 sırası).
  const dogumGunlu = acilisMesajiSec({
    dil: 'tr',
    simdi: nevruz,
    dogumGunu: { ay: 3, gun: 21 },
    durum: BOS_DURUM,
  });
  assert.equal(dogumGunlu.id, 'pn_02', 'doğum günü öncelikli özel güne yenildi');

  // Aynı gün ikinci açılışta öncelikli mesaj tekrarlanmıyor; sıra havuza
  // geçiyor ve o gün geçerli olan sezon mesajı da havuzda.
  const ikinci = t(ilk.durum);
  assert.notEqual(ikinci.id, 'sp_04', 'öncelikli özel gün aynı gün tekrar çıktı');
});
