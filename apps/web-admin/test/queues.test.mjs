import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * HER ONAY KUYRUĞUNUN PANELDE KARŞILIĞI OLMALI.
 *
 * Kurucunun şikâyeti: _"uzman dekont gönderiyor ama admin tarafında onu
 * onaylayacak bir alan yok... karşılığı olmayan bir şey olmamalı."_
 *
 * Uygulamada kullanıcı/uzman/salon bir şey gönderir (dekont, başvuru, itiraz,
 * profil değişikliği) ve karşı tarafta yöneticinin bunu görüp karara bağlaması
 * gerekir. Zincirin herhangi bir halkası eksikse gönderen sonsuza kadar bekler
 * ve bunu KİMSE fark etmez — hata sessizdir.
 *
 * Bu test zincirin üç halkasını da denetler:
 *   sunucu ucu  →  istemci fonksiyonu  →  paneldeki ekran
 */

const kok = join(import.meta.dirname, '..');
const api = readFileSync(join(kok, 'app/lib/api.ts'), 'utf8');
const ui = readFileSync(join(kok, 'app/page.tsx'), 'utf8');

/**
 * Kuyruk → panelde kararı veren istemci fonksiyonu.
 *
 * Fonksiyon ADI yazılır, uç yolu değil: yol değişse de iş aynı kalır, ama
 * fonksiyon hiç çağrılmıyorsa ekran yok demektir.
 */
const KUYRUKLAR = [
  ['Salon başvurusu', 'approveBusiness'],
  ['Uzman doğrulama', 'verifySpecialist'],
  ['Kimlik (KYC)', 'approveKyc'],
  ['Profil değişikliği', 'approveProfileChange'],
  ['Abonelik dekontu', 'approveSubscription'],
  ['Depozito/iade itirazı', 'resolveDispute'],
  ['Yorum itirazı', 'hideReview'],
  ['W2W moderasyon', 'moderateCircle'],
  // Brief §8 — randevu akışı kuyrukları. Komisyon faturası kuyruğu KALDIRILDI:
  // §4.4/§10 ikinci tahsilatı sildi, kesilecek fatura kalmadı.
  ['Dekont doğrulama', 'dekontOnayla'],
  ['İadeler', 'iadeOdendi'],
  ['Uzlaşma', 'uzlasmaCoz'],
];

for (const [ad, fn] of KUYRUKLAR) {
  test(`${ad}: istemci fonksiyonu tanımlı`, () => {
    assert.ok(
      new RegExp(`^\\s{2}${fn}\\s*:`, 'm').test(api),
      `api.ts içinde ${fn} yok — panel bu kuyruğa karar veremez`,
    );
  });

  test(`${ad}: panelde ÇAĞRILIYOR`, () => {
    // Tanımlı olması yetmez: hiçbir ekran çağırmıyorsa ölü koddur ve gönderen
    // taraf sonsuza kadar bekler.
    assert.ok(
      ui.includes(`api.${fn}(`),
      `${fn} hiçbir ekranda çağrılmıyor — kuyruk panelde görünmüyor demektir`,
    );
  });
}

test('bekleyen iş sayaçlarının hepsi bir sekmeye bağlı', () => {
  // Sayaç varsa ona götüren bir yer de olmalı; yoksa admin sayıyı görür ama
  // nereye bakacağını bilemez.
  const m = /type PendingCounts = \{([\s\S]*?)\n\}/.exec(ui);
  assert.ok(m, 'PendingCounts tipi bulunamadı');
  const alanlar = [...m[1].matchAll(/^\s*(\w+)\s*:/gm)].map((x) => x[1]);
  assert.ok(alanlar.length >= 7, `beklenenden az sayaç: ${alanlar.join(', ')}`);
  for (const a of alanlar) {
    assert.ok(
      // Sayacın rozette GEÇMESİ yeterli, tek başına olması değil: dekont,
      // iade ve uzlaşma kuyruklarının üçü de AYNI sekmede ve tek rozet
      // toplamlarını gösteriyor. Eski kalıp tam eşleşme istiyordu.
      new RegExp(`badge:[\\s\\S]{0,220}?q\\?\\.${a}\\b`).test(ui),
      `'${a}' sayacı hiçbir sekmenin rozetinde geçmiyor`,
    );
  }
});

/*
 * "dekont yüklenmiş komisyon faturaları sayaçta" testi BURADAYDI ve
 * `invoiceReceipts` sayacını şart koşuyordu. O sayaç kaldırılan komisyon
 * FATURASI modelinden kalmaydı: spec §4.4 ikinci tahsilatı sildi, depozito
 * zaten AYNA'nın komisyonu. Sunucu o alanı hiç göndermiyordu, yani rozet
 * hiçbir zaman dolmuyordu. Test de onunla birlikte kalktı.
 */
test('her onay sekmesi gerçekten çiziliyor', () => {
  // Nav'da görünen ama render edilmeyen sekme, tıklanınca boş ekran verir.
  // YALNIZ gerçek nav öğeleri: hepsinde `icon` var. Duyuru segmentleri
  // ({id,label}) aynı biçimde ama sekme değiller — ilk sürümüm onları da
  // sekme sanıp yanlış alarm verdi.
  const navIds = [...ui.matchAll(/\{\s*id:\s*'(\w+)',\s*\n?\s*label:[^}]*?icon:/g)].map(
    (m) => m[1],
  );
  const render = new Set([...ui.matchAll(/tab === '(\w+)'/g)].map((m) => m[1]));
  const eksik = navIds.filter((id) => !render.has(id));
  assert.deepEqual(eksik, [], `Nav'da olup çizilmeyen sekme(ler): ${eksik.join(', ')}`);
});

/**
 * ULAŞILABİLİRLİK — bu testin kaçırdığı halka.
 *
 * Yukarıdaki testler "ekran var mı, fonksiyon çağrılıyor mu" diye bakıyordu ve
 * hepsi GEÇİYORDU. Oysa `tab === 'bookings'` görünümü menüde HİÇ YOKTU:
 * dekont doğrulama, iadeler, uzlaşma ve reklam ödemeleri kuyruklarının
 * tamamı yazılmış, çağrılmış ama panelde AÇILAMIYORDU. Kod var, kapı yok.
 * Kurucunun "depozito talebi admin paneline ulaşmıyor" şikâyetinin ikinci
 * yarısı buydu.
 */
test('render edilen HER sekmenin menüde girişi var', () => {
  const render = [...ui.matchAll(/\{tab === '(\w+)' &&/g)].map((m) => m[1]);
  // Menü girdileri tek satırda da, çok satırlı da yazılabiliyor; desen
  // BİÇİME değil `id:` + `label:` ikilisine bakmalı.
  const menu = new Set([...ui.matchAll(/id: '(\w+)',\s*\n?\s*label: '/g)].map((m) => m[1]));
  const ulasilmaz = render.filter((t) => !menu.has(t));
  assert.deepEqual(
    ulasilmaz,
    [],
    `Menüde girişi olmayan sekme(ler): ${ulasilmaz.join(', ')} — ekran var ama açılamıyor`,
  );
});

test('reklam ödeme kuyruğu: uç, istemci, ekran ve panoda sayaç', () => {
  // Reklam AYNA'nın kazanç kalemi; zincirin her halkası duracak.
  assert.match(api, /^\s{2}reklamSiparisleri\s*:/m, 'kuyruk istemcide yok');
  assert.match(api, /^\s{2}reklamOnayla\s*:/m, 'onay istemcide yok');
  assert.ok(ui.includes('api.reklamOnayla('), 'onay hiçbir ekranda çağrılmıyor');
  // Onay, reklamı yönettiğin sekmede olmalı — kimse randevu kuyruklarında
  // reklam onayı aramaz.
  const ads = ui.slice(ui.indexOf('function AdsView()'));
  assert.ok(
    ads.slice(0, ads.indexOf('\nfunction ')).includes('api.reklamOnayla('),
    'reklam onayı Reklamlar sekmesinde değil',
  );
  assert.match(ui, /key: 'adOrders'/, 'panoda bekleyen reklam ödemesi sayacı yok');
});

test('sunucunun saydığı her kuyruk panelde ROZETLİ', () => {
  /*
   * Sunucu 11 kuyruk sayıyordu, panel 8'ini kullanıyordu ve biri
   * (`invoiceReceipts`) sunucuda HİÇ yoktu.
   *
   * Görünmeyen dördü para kuyruklarıydı: dekont doğrulama, iade, uzlaşma ve
   * REKLAM ÖDEMESİ. Yani uzman parayı yatırıp dekontu yüklüyor, admin menüde
   * hiçbir işaret görmüyordu. Kuyruğun kendisi çalışıyor ama kimse bakmıyor.
   */
  const sunucu = readFileSync(join(kok, '..', 'api', 'src', 'admin', 'admin.service.ts'), 'utf8');
  const blok = /pending: \{([\s\S]*?)\},/.exec(sunucu);
  assert.ok(blok, 'sunucudaki pending bloğu bulunamadı');
  const alanlar = [...blok[1].matchAll(/^\s+(\w+)[,:]/gm)].map((m) => m[1]);

  const panel = readFileSync(join(kok, 'app', 'page.tsx'), 'utf8');
  const rozetler = new Set([...panel.matchAll(/q\?\.(\w+)/g)].map((m) => m[1]));

  const gorunmeyen = alanlar.filter((a) => !rozetler.has(a));
  assert.deepEqual(
    gorunmeyen,
    [],
    `sunucu sayıyor ama panelde rozeti yok: ${gorunmeyen.join(', ')}`,
  );
});

test('panel OLMAYAN bir sayaca bakmıyor', () => {
  // Ters yön: panel sunucunun göndermediği bir alana bakarsa rozet hiç
  // dolmaz — sessizce boş kalır, bekleyen iş yokmuş gibi görünür.
  const sunucu = readFileSync(join(kok, '..', 'api', 'src', 'admin', 'admin.service.ts'), 'utf8');
  const blok = /pending: \{([\s\S]*?)\},/.exec(sunucu);
  const alanlar = new Set([...blok[1].matchAll(/^\s+(\w+)[,:]/gm)].map((m) => m[1]));
  const panel = readFileSync(join(kok, 'app', 'page.tsx'), 'utf8');
  const hayali = [...new Set([...panel.matchAll(/q\?\.(\w+)/g)].map((m) => m[1]))].filter(
    (a) => !alanlar.has(a),
  );
  assert.deepEqual(hayali, [], `panel olmayan sayaca bakıyor: ${hayali.join(', ')}`);
});
