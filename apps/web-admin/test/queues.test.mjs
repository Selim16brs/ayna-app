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
  ['Komisyon faturası dekontu', 'collectInvoice'],
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
      new RegExp(`badge:\\s*q\\?\\.${a}\\b`).test(ui),
      `'${a}' sayacı hiçbir sekmeye rozet olarak bağlanmamış`,
    );
  }
});

test('dekont yüklenmiş komisyon faturaları sayaçta', () => {
  // Bu sayaç YOKTU: uzman dekontu yüklüyor, fatura durumu değişmiyor ve
  // panelde yalnız listenin içinde küçük bir işaret çıkıyordu. Kısıtlı uzman
  // ödemesini yapmış hâlde beklemeye devam ediyordu.
  assert.ok(/invoiceReceipts/.test(ui), 'komisyon dekontu sayacı panelde yok');
});

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
