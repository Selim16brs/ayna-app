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

/**
 * B6 — küçük terim kalıntıları. Baskın terim parantezde.
 *
 * DIŞARIDA BIRAKILANLAR (kasıtlı — eşanlamlı değiller):
 *   · "profesyonel" → SIFAT ("En profesyonel uzmanlar"), rolün adı değil.
 *   · "isteğe bağlı" → *optional*; "talep" ile hiçbir ilgisi yok (10 metin).
 *   · Always "istek"leri → ayrı bir kavram; "talep"e çevirmek pazaryeri
 *     talebiyle çakışırdı.
 *   · "teklif isteği" → kendi içinde 3/3 TUTARLI ve CTA'sı "Teklif iste"
 *     fiili. Değiştirmek tutarlılık değil, değişiklik için değişiklik olurdu.
 *
 * "randevu isteğin" ise gerçekten aykırıydı: kardeş bildirim `notif.rejected`
 * aynı nesneye "randevu talebin" diyordu — tek ailede iki ad.
 */

/** Bir dilde yasak olan eşanlamlılar; hepsi küçük harfe indirilip aranır. */
const YASAK: Record<string, { sozluk: Record<string, string>; kelimeler: string[] }> = {
  tr: {
    sozluk: tr,
    // depozito(19) · randevu(148) · puan(54) · talep(39)
    kelimeler: ['kapora', 'rezervasyon', 'bonus', 'randevu isteğ'],
  },
  kk: {
    sozluk: kk,
    // депозит · жазылу(135) · ұпай(50)
    kelimeler: ['кепілпұл', 'кепілақ', 'алдын ала төлем', 'брондау', 'бонус'],
  },
  // ru'da "Календарь записей" zaten doğruydu; yalnız бонус aykırıydı.
  ru: { sozluk: ru, kelimeler: ['предоплат', 'залог', 'бонус'] },
};

for (const [dil, { sozluk, kelimeler }] of Object.entries(YASAK)) {
  test(`${dil}: her kavram için tek kelime kullanılıyor`, () => {
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
