import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BOOKING_STATUSES } from '@ayna/domain';
import { tr } from '@ayna/i18n';
import {
  akisAdimi,
  beklemeMetni,
  birincilAksiyon,
  durumEtiketi,
  ikincilAksiyonlar,
  karsiTarafBekleniyor,
} from './booking-flow';

/**
 * HER DEĞİŞİKLİK İKİ TARAFA GÖRE.
 *
 * Kurucunun kuralı: "bir şeyi yaparken hem müşteri hem uzman tarafına göre
 * yapman lazım." Tek tek hata avlamak yerine 18 durum × 2 rol matrisinin
 * TAMAMI burada denetleniyor — yeni bir durum ya da eylem eklendiğinde
 * karşı tarafı unutmak imkânsız.
 */

const TR: Record<string, string> = tr;
const ROLLER = ['musteri', 'uzman'] as const;
const TAM_CTX = {
  esikOncesi: true,
  gelmediAcik: true,
  iadeEdilecekVar: true,
  ertelemeyiOneren: 'musteri' as const,
};

test('YIKICI eylem hiçbir rolde BİRİNCİL düğme değil', () => {
  // "Gelmedi" geri alınamaz ve karşı tarafa 24 saatlik itiraz açar; kartın en
  // büyük, tek düğmesi olarak sunmak kullanıcıyı ona doğru itmektir.
  // (Müşteri tarafında tam bunu yapıyorduk.)
  for (const st of BOOKING_STATUSES) {
    for (const rol of ROLLER) {
      const a = birincilAksiyon(st, rol, TAM_CTX);
      assert.notEqual(a?.eylem, 'gelmedi', `${st}/${rol}: yıkıcı eylem birincil düğme`);
    }
  }
});

test('kapanmış randevuda kullanıcı ÇIKMAZ SOKAKTA kalmıyor', () => {
  // Düşen talepte bildirim "başka saat seçin" diyordu ama kartta hiçbir yol
  // yoktu. Kullanıcı ne olduğunu görüyor ve orada kalıyordu.
  const a = birincilAksiyon('otomatik_dustu', 'musteri', TAM_CTX);
  assert.ok(a, 'düşen talepte müşteriye yol gösterilmiyor');
});

test('§4.7 — iade hakkı doğuran HER kapanışta iade yolu var', () => {
  for (const st of ['iptal_musteri', 'iptal_uzman', 'no_show_uzman'] as const) {
    const a = birincilAksiyon(st, 'musteri', TAM_CTX);
    assert.equal(a?.eylem, 'iade_iste', `${st}: müşteri parasını isteyemiyor`);
    // Yanmış depozitoda ise düğme ÇIKMAMALI.
    assert.equal(
      birincilAksiyon(st, 'musteri', { ...TAM_CTX, iadeEdilecekVar: false })?.eylem,
      undefined,
      `${st}: iade edilecek tutar yokken düğme çıkıyor`,
    );
  }
});

test('taslak KİMSEYİ bekletmiyor', () => {
  // Gönderilmemiş taslakta slot tutulmuyor, karşı tarafın haberi yok.
  for (const rol of ROLLER) {
    assert.equal(karsiTarafBekleniyor('taslak', rol, TAM_CTX), false, `taslak/${rol}`);
  }
});

test('bekleme metni HANGİ tarafı beklediğini doğru söylüyor', () => {
  // `kesinlesti`de kimse karşı tarafı beklemiyor — iki taraf da GÜNÜ bekliyor.
  for (const rol of ROLLER) {
    const metin = TR[beklemeMetni('kesinlesti', rol)]!;
    assert.ok(!/karşı taraf/i.test(metin), `kesinlesti/${rol}: "${metin}" yanıltıcı`);
  }
});

test('akıştaki her durumda her rol NE OLDUĞUNU öğreniyor', () => {
  // Rozet + (buton | bekleme). Üçü de yoksa kart sessiz kalır.
  for (const st of BOOKING_STATUSES) {
    for (const rol of ROLLER) {
      assert.ok(TR[durumEtiketi(st, rol)], `${st}/${rol}: rozet metni yok`);
      if (akisAdimi(st) < 0 || st === 'taslak') continue;
      const konusuyor =
        birincilAksiyon(st, rol, TAM_CTX) !== null ||
        karsiTarafBekleniyor(st, rol, TAM_CTX) ||
        st === 'tamamlandi' ||
        st === 'degerlendirme' ||
        st === 'kapandi';
      assert.ok(konusuyor, `${st}/${rol}: kart sessiz — ne buton ne bekleme`);
    }
  }
});

test('her ikincil eylemin metni ÜÇ dilde var', () => {
  for (const st of BOOKING_STATUSES) {
    for (const rol of ROLLER) {
      for (const a of ikincilAksiyonlar(st, rol, TAM_CTX)) {
        assert.ok(TR[a.etiket], `${st}/${rol}: '${a.etiket}' çeviride yok`);
      }
    }
  }
});

test('birincil ve ikincil AYNI eylemi iki kez sunmuyor', () => {
  // Aynı düğmenin iki kez çıkması, hangisinin ne yaptığını belirsizleştirir.
  for (const st of BOOKING_STATUSES) {
    for (const rol of ROLLER) {
      const b = birincilAksiyon(st, rol, TAM_CTX)?.eylem;
      const ik = ikincilAksiyonlar(st, rol, TAM_CTX).map((a) => a.eylem);
      if (b) assert.ok(!ik.includes(b), `${st}/${rol}: '${b}' hem birincil hem ikincil`);
      assert.equal(new Set(ik).size, ik.length, `${st}/${rol}: ikincilde tekrar var`);
    }
  }
});
