import assert from 'node:assert/strict';
import { test } from 'node:test';
import { tr } from './messages/tr';
import { kk } from './messages/kk';
import { ru } from './messages/ru';

/**
 * TEK KAVRAM = TEK KELİME.
 *
 * Randevuyu kesinleştiren para üç dilde de birden çok isimle anılıyordu:
 *   tr — "kapora" (9) ve "depozito" (19)
 *   kk — "кепілпұл", "кепілақы", "алдын ала төлем", "депозит" (dört ayrı kelime)
 *   ru — "предоплата", "залог", "депозит" (üç ayrı kelime)
 *
 * Hatta aynı bildirimin BAŞLIĞI "kapora", GÖVDESİ "depozito" diyordu. Para
 * söz konusuyken terim belirsizliği kullanıcıya iki ayrı ücret varmış gibi
 * geliyor; bu doğrudan güven sorunu.
 *
 * Kurucu kararı: **depozito / депозит**. Bu test o kararı kilitler — yeni bir
 * metin eski eşanlamlılardan birini geri getirirse burada düşer.
 *
 * NOT: `booking.deposit.note` içindeki "кепіл" (kk) ve "задаток" (ru) KAPSAM
 * DIŞI. Onlar depozitonun ADI değil, ne olduğunu anlatan hukuki karşılık —
 * cümle zaten "Депозит ..." diye başlıyor.
 */

/** Bir dilde yasak olan eşanlamlılar; hepsi küçük harfe indirilip aranır. */
const YASAK: Record<string, { sozluk: Record<string, string>; kelimeler: string[] }> = {
  tr: { sozluk: tr, kelimeler: ['kapora'] },
  kk: { sozluk: kk, kelimeler: ['кепілпұл', 'кепілақ', 'алдын ала төлем'] },
  ru: { sozluk: ru, kelimeler: ['предоплат', 'залог'] },
};

for (const [dil, { sozluk, kelimeler }] of Object.entries(YASAK)) {
  test(`${dil}: depozito için tek terim kullanılıyor`, () => {
    const ihlal: string[] = [];
    for (const [anahtar, metin] of Object.entries(sozluk)) {
      const kucuk = metin.toLowerCase();
      for (const k of kelimeler) {
        if (kucuk.includes(k)) ihlal.push(`${anahtar}: "${k}" → "depozito/депозит" kullan`);
      }
    }
    assert.deepEqual(ihlal, [], `${dil} içinde rakip terim var:\n  ${ihlal.join('\n  ')}`);
  });
}

test('depozito terimi üç dilde de gerçekten var', () => {
  // Yukarıdaki testler yalnız YASAĞI denetliyor. Birisi kavramı tamamen
  // silerse o testler de geçerdi; bu, kavramın yerinde durduğunu doğrular.
  const bekle: Record<string, [Record<string, string>, string]> = {
    tr: [tr, 'depozito'],
    kk: [kk, 'депозит'],
    ru: [ru, 'депозит'],
  };
  for (const [dil, [sozluk, kelime]] of Object.entries(bekle)) {
    const sayi = Object.values(sozluk).filter((m) => m.toLowerCase().includes(kelime)).length;
    assert.ok(sayi > 0, `${dil} içinde "${kelime}" hiç geçmiyor — kavram kaybolmuş`);
  }
});
