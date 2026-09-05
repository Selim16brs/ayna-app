import assert from 'node:assert/strict';
import { test } from 'node:test';
import { tr } from '@ayna/i18n';
import {
  birincilAksiyon,
  durumEtiketi,
  ikincilAksiyonlar,
  karsiTarafBekleniyor,
  beklemeMetni,
} from './booking-flow';
import type { BookingStatus } from './data';

/**
 * UÇTAN UCA — EKRAN TARAFI, İKİ ROL SIRAYLA.
 *
 * Sunucu tarafındaki akış testi (apps/api) durumları doğruluyor; bu test her
 * durumda İKİ TARAFIN EKRANINDA ne yazdığını doğruluyor. Kurucunun istediği
 * "müşteri yapar → uzmana geç → uzman yapar → müşteriye dön" sırası burada
 * adım adım yürüyor.
 */

const TR: Record<string, string> = tr;

type Adim = {
  durum: BookingStatus;
  ctx?: Record<string, unknown>;
  /** Bu adımda TOP kimde? */
  sira: 'musteri' | 'uzman';
  /** Sıradaki tarafın basacağı düğme. */
  dugme: string;
  /**
   * KARŞI TARAFIN da düğmesi varsa etiketi.
   *
   * Akışın tek adımında iki tarafın da yapacağı bir şey var: hizmet günü.
   * Müşteri ödemeyi bildirir, uzman işlemi bitirir — ikisi de aynı randevuyu
   * ileri taşır ve hangisi önce basarsa akış oradan devam eder. Boşsa kural
   * eskisi gibi: karşı tarafta düğme OLMAMALI.
   */
  karsiDugme?: string;
};

/** §4 mutlu yol — her satır bir el değiştirme. */
const MUTLU_YOL: Adim[] = [
  { durum: 'onay_bekliyor', sira: 'uzman', dugme: 'flow.act.onayla' },
  { durum: 'depozito_bekliyor', sira: 'musteri', dugme: 'flow.act.depozito_ode' },
  { durum: 'kesinlesti', sira: 'musteri', dugme: '' }, // iki taraf da günü bekler
  /*
   * HİZMET GÜNÜ — kurucu (05.09.2026): "müşteri salona gittiğinde hizmet
   * saati başladığında otomatik olarak müşteri ekranında ilgili randevuda
   * Ödeme Yap butonu aktif olmalı."
   *
   * Burada müşterinin hiçbir düğmesi yoktu: ödeme ancak uzman "işlemi
   * bitirdim" dedikten SONRA açılıyordu ve uzman basmazsa randevu sonsuza
   * kadar açık kalıyordu.
   */
  {
    durum: 'hizmet_gunu',
    sira: 'musteri',
    dugme: 'flow.act.odeme_yaptim',
    // Uzmanın düğmesi "İşlemi bitirdim" değil "Ödemeyi aldım" (kurucu,
    // 05.09.2026): el sıkışma iki taraflı ve sıra önemsiz.
    karsiDugme: 'flow.act.odeme_aldim',
  },
  // Ödeme adımında da iki taraf birden: müşteri beyan eder, uzman teyit eder.
  {
    durum: 'odeme_bekliyor',
    sira: 'musteri',
    dugme: 'flow.act.odeme_yaptim',
    karsiDugme: 'flow.act.odeme_aldim',
  },
  {
    durum: 'odeme_bekliyor',
    ctx: { odemeBildirildi: true },
    sira: 'uzman',
    dugme: 'flow.act.odeme_aldim',
  },
  { durum: 'tamamlandi', sira: 'musteri', dugme: 'flow.act.degerlendir' },
];

test('mutlu yolda TOP her adımda doğru tarafta', () => {
  for (const adim of MUTLU_YOL) {
    const ctx = { esikOncesi: true, ...adim.ctx };
    const karsi = adim.sira === 'musteri' ? 'uzman' : 'musteri';
    if (!adim.dugme) continue; // kesinleşti: iki taraf da bekler
    const a = birincilAksiyon(adim.durum, adim.sira, ctx);
    assert.ok(a, `${adim.durum}: sıradaki taraf (${adim.sira}) için düğme yok`);
    assert.equal(a.etiket, adim.dugme, `${adim.durum}/${adim.sira}: yanlış düğme`);
    const karsiAksiyon = birincilAksiyon(adim.durum, karsi as 'musteri' | 'uzman', ctx);
    if (adim.karsiDugme) {
      // Hizmet günü: iki tarafın da kendi düğmesi var, ama AYNI düğme değil.
      assert.ok(karsiAksiyon, `${adim.durum}/${karsi}: beklenen düğme yok`);
      assert.equal(karsiAksiyon.etiket, adim.karsiDugme, `${adim.durum}/${karsi}: yanlış düğme`);
    } else {
      // KARŞI TARAFTA düğme OLMAMALI — iki taraf aynı anda ilerletemez.
      assert.equal(karsiAksiyon, null, `${adim.durum}: karşı taraf (${karsi}) da ilerletebiliyor`);
    }
  }
});

test('sırası olmayan taraf NE BEKLEDİĞİNİ görüyor', () => {
  for (const adim of MUTLU_YOL) {
    if (!adim.dugme) continue;
    // `tamamlandi` akışın SONU: kimse karşı tarafı beklemiyor. Uzmanın kartı
    // orada durum rozetini, tamamlanmış çizelgeyi ve parayı gösteriyor —
    // bekleme nabzı çizmek "hâlâ bir şey olacak" demek olurdu.
    if (adim.durum === 'tamamlandi') continue;
    // İki tarafın da düğmesi olan adımda kimse beklemiyor.
    if (adim.karsiDugme) continue;
    const ctx = { esikOncesi: true, ...adim.ctx };
    const karsi = (adim.sira === 'musteri' ? 'uzman' : 'musteri') as 'musteri' | 'uzman';
    assert.ok(
      karsiTarafBekleniyor(adim.durum, karsi, ctx),
      `${adim.durum}/${karsi}: ne düğme ne bekleme — ekran sessiz`,
    );
    const metin = TR[beklemeMetni(adim.durum, karsi)]!;
    assert.ok(metin && metin.length > 3, `${adim.durum}/${karsi}: bekleme metni yok`);
  }
});

test('her adımda İKİ TARAF da durumu kendi diliyle okuyor', () => {
  for (const adim of MUTLU_YOL) {
    for (const rol of ['musteri', 'uzman'] as const) {
      const etiket = TR[durumEtiketi(adim.durum, rol)];
      assert.ok(etiket, `${adim.durum}/${rol}: rozet metni yok`);
    }
  }
});

test('değişiklik yolu — uzman önerir, karar müşteriye geçer, tek tur', () => {
  // Uzman öneriyor: kararı müşteri verir.
  assert.equal(
    birincilAksiyon('degisiklik_onerildi', 'uzman', {}),
    null,
    'uzman kendi önerisini onaylıyor',
  );
  assert.ok(birincilAksiyon('degisiklik_onerildi', 'musteri', {}), 'müşteride karar yok');
  assert.ok(
    ikincilAksiyonlar('degisiklik_onerildi', 'musteri').some((a) => a.eylem === 'karsi_oner'),
    'müşteri karşı öneri yapamıyor',
  );
  // Karşı öneriden sonra uzman YALNIZ Kabul/Red — ping-pong yok.
  assert.equal(birincilAksiyon('karsi_oneri', 'musteri', {}), null);
  assert.equal(
    ikincilAksiyonlar('karsi_oneri', 'uzman').filter((a) => a.eylem === 'degistir').length,
    0,
    'uzman karşı öneriye tekrar öneriyle karşılık verebiliyor',
  );
});

test('iptal ve iade yolu — parası olan parasını isteyebiliyor', () => {
  for (const st of ['iptal_musteri', 'iptal_uzman', 'no_show_uzman'] as const) {
    assert.equal(
      birincilAksiyon(st, 'musteri', { iadeEdilecekVar: true })?.eylem,
      'iade_iste',
      `${st}: müşteri iade isteyemiyor`,
    );
  }
});
