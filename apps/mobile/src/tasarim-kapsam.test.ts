import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BOOKING_STATUSES } from '@ayna/domain';
import {
  akisAdimi,
  beklemeMetni,
  birincilAksiyon,
  DURUM_ETIKETI,
  DURUM_TONU,
  karsiTarafBekleniyor,
} from './booking-flow';
import { tr } from '@ayna/i18n';

/**
 * TASARIM KAPSAMI — hiçbir durum ekranda boş kalmıyor.
 *
 * §7: "Tek randevu kartı, iki faz ... Uzman aynı kartın aynasını görür;
 * yalnızca butonları farklıdır."
 *
 * Yeni bir durum eklendiğinde kartın sessizce boş kalması, bu akışta en kolay
 * yapılan hata: durum makinesi derlenir, ekran hiçbir şey çizmez.
 */

const TR: Record<string, string> = tr;

test('her durumun etiketi ve tonu var, etiket ÜÇ DİLDE karşılığı olan bir anahtar', () => {
  for (const d of BOOKING_STATUSES) {
    const anahtar = DURUM_ETIKETI[d];
    assert.ok(anahtar, `${d}: etiket yok`);
    assert.ok(TR[anahtar], `${d}: '${anahtar}' anahtarının Türkçe karşılığı yok`);
    assert.ok(DURUM_TONU[d], `${d}: ton yok`);
  }
});

test('her durumda ya BİR aksiyon ya bekleme var — kart asla sessiz kalmıyor', () => {
  for (const d of BOOKING_STATUSES) {
    for (const rol of ['musteri', 'uzman'] as const) {
      const aksiyon = birincilAksiyon(d, rol, { esikOncesi: true, gelmediAcik: true });
      const bekliyor = karsiTarafBekleniyor(d, rol, { esikOncesi: true, gelmediAcik: true });
      const kapali = akisAdimi(d) < 0;
      const bitis = d === 'tamamlandi' || d === 'degerlendirme' || d === 'kapandi';
      // TASLAK henüz gönderilmedi: slot tutulmuyor, karşı tarafın haberi yok.
      // Bir süre burada "Karşı taraf bekleniyor" yazıyordu — olmayan bir
      // süreci varmış gibi göstermek.
      if (kapali || bitis || d === 'taslak') continue;
      assert.ok(
        aksiyon || bekliyor,
        `${d}/${rol}: ne buton ne bekleme — kullanıcı ne olduğunu anlayamaz`,
      );
    }
  }
});

test('aksiyon ve bekleme AYNI ANDA çıkmıyor — ikisi çelişemez', () => {
  for (const d of BOOKING_STATUSES) {
    for (const rol of ['musteri', 'uzman'] as const) {
      const ctx = { esikOncesi: true, gelmediAcik: true, odemeBildirildi: false };
      const aksiyon = birincilAksiyon(d, rol, ctx);
      assert.ok(
        !(aksiyon && karsiTarafBekleniyor(d, rol, ctx)),
        `${d}/${rol}: hem "sıra sende" butonu hem "karşı taraf bekleniyor" nabzı`,
      );
    }
  }
});

test('bekleme metinleri üç dilde var', () => {
  for (const d of BOOKING_STATUSES) {
    for (const rol of ['musteri', 'uzman'] as const) {
      const anahtar = beklemeMetni(d, rol);
      assert.ok(TR[anahtar], `${d}/${rol}: '${anahtar}' Türkçe karşılığı yok`);
    }
  }
});

test('aksiyon etiketleri üç dilde var', () => {
  const ctxler = [
    {},
    { esikOncesi: true },
    { gelmediAcik: true },
    { odemeBildirildi: true },
    { ertelemeyiOneren: 'uzman' as const },
    { ertelemeyiOneren: 'musteri' as const },
  ];
  for (const d of BOOKING_STATUSES) {
    for (const rol of ['musteri', 'uzman'] as const) {
      for (const ctx of ctxler) {
        const a = birincilAksiyon(d, rol, ctx);
        if (a) assert.ok(TR[a.etiket], `${d}/${rol}: '${a.etiket}' Türkçe karşılığı yok`);
      }
    }
  }
});
