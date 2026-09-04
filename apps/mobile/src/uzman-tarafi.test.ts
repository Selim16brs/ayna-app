import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tr } from '@ayna/i18n';
import { durumEtiketi, ikincilAksiyonlar, birincilAksiyon } from './booking-flow';

/**
 * UZMAN KARTI KENDİ GÖZÜNDEN OKUNMALI.
 *
 * Kurucu bildirdi: uzman kendi randevusunu açtığında "Uzman onayı bekleniyor"
 * yazıyor ve başlıkta KENDİ adı duruyordu — kendi yanıtını bekleyen bir cümle,
 * kendi adına bakan bir kart. §7 "uzman aynı kartın aynasını görür; YALNIZCA
 * BUTONLARI farklıdır" diyor; ayna demek aynı metin demek değil.
 */

const TR: Record<string, string> = tr;
const oku = (...p: string[]) => readFileSync(join(import.meta.dirname, ...p), 'utf8');

test('uzman kendi hakkında "uzman onayı bekleniyor" okumuyor', () => {
  const musteri = TR[durumEtiketi('onay_bekliyor', 'musteri')]!;
  const uzman = TR[durumEtiketi('onay_bekliyor', 'uzman')]!;
  assert.notEqual(uzman, musteri, 'iki rol aynı metni görüyor');
  assert.ok(!/uzman onayı/i.test(uzman), `uzman kendini bekliyor: "${uzman}"`);
});

test('taraf belirten TÜM durumlar iki rolde farklı okunuyor', () => {
  for (const st of [
    'onay_bekliyor',
    'degisiklik_onerildi',
    'karsi_oneri',
    'depozito_bekliyor',
    'odeme_bekliyor',
  ] as const) {
    assert.notEqual(
      durumEtiketi(st, 'uzman'),
      durumEtiketi(st, 'musteri'),
      `${st}: uzman müşterinin cümlesini okuyor`,
    );
    assert.ok(TR[durumEtiketi(st, 'uzman')], `${st}: uzman metni çeviride yok`);
  }
});

test('taraf belirtmeyen durumlar AYNI kalıyor — gereksiz ikilik yok', () => {
  for (const st of ['kesinlesti', 'tamamlandi', 'kapandi'] as const) {
    assert.equal(durumEtiketi(st, 'uzman'), durumEtiketi(st, 'musteri'));
  }
});

test('§4.3 — uzman onay aşamasında FARKLI SAAT ÖNEREBİLİYOR', () => {
  // MD: "Uzman: Onayla → 4.4'e geçilir · Değiştir (tarih/saat/hizmet)".
  // Ekranda yalnız "Onayla" vardı; MD'nin verdiği hak ekrandan silinmişti.
  const ikincil = ikincilAksiyonlar('onay_bekliyor', 'uzman').map((a) => a.eylem);
  assert.ok(ikincil.includes('degistir'), 'uzman farklı saat öneremiyor');
  assert.ok(ikincil.includes('reddet'), 'uzman reddedemiyor');
  // Birincil hâlâ TEK (§7).
  assert.equal(birincilAksiyon('onay_bekliyor', 'uzman', {})?.eylem, 'onayla');
});

test('§4.3 — müşteri değişiklik önerisine KARŞI ÖNERİ yapabiliyor', () => {
  const ikincil = ikincilAksiyonlar('degisiklik_onerildi', 'musteri').map((a) => a.eylem);
  assert.ok(ikincil.includes('karsi_oner'), 'karşı öneri hakkı ekranda yok');
});

test('§4.3 — uzman karşı öneriye YALNIZ Kabul/Red veriyor (tek tur)', () => {
  const ikincil = ikincilAksiyonlar('karsi_oneri', 'uzman').map((a) => a.eylem);
  assert.deepEqual(ikincil, ['reddet'], 'uzman ping-pongu sürdürebiliyor');
});

test('kart başlığında KARŞI TARAF yazıyor', () => {
  const src = oku('..', 'app', 'booking', '[id].tsx');
  assert.match(src, /rol === 'uzman' \? \(booking\.customerName/, 'uzman kendi adını görüyor');
});

test('§4.2 — bekleyen talepler uzmanın ANA EKRANINDA', () => {
  // Yalnız Ajanda'daki bir şeritteydi: uzman ana sayfayı açıp "yeni bir şey
  // yok" sanıyor, 3 saatlik yanıt süresi işlerken talebi hiç görmüyordu.
  const src = oku('..', 'app', 'seller', 'reports.tsx');
  assert.match(src, /bekleyenTalepler/, 'ana ekranda bekleyen talep yok');
  assert.match(src, /status === 'onay_bekliyor'/);
  assert.match(src, /router\.push\(`\/booking\/\$\{b\.id\}`/, 'talep karta götürmüyor');
});

test('§4.10 — iade edilecek tutar yoksa düğme çıkmıyor', () => {
  // Kullanıcı hesap bilgisini giriyor, sunucu "iade edilecek depozito yok"
  // diyor, ekran bunu "hata oluştu" diye gösteriyordu: kullanıcı hatayı
  // girdiği telefon numarasına bağlıyordu.
  assert.equal(birincilAksiyon('iptal_uzman', 'musteri', { iadeEdilecekVar: false }), null);
  assert.ok(birincilAksiyon('iptal_uzman', 'musteri', { iadeEdilecekVar: true }));
  const src = oku('..', 'app', 'booking', 'refund.tsx');
  /*
   * Sebep artık KULLANICININ DİLİNDE gösteriliyor: sunucunun mesajı
   * Türkçe, `sunucuHatasi` hata KODUNU kendi sözlüğümüzden çeviriyor ve
   * bilinmeyen kodda sunucunun cümlesini yedek tutuyor (kk/ru turu).
   */
  assert.match(src, /sunucuHatasi\(err, t\)/, 'sunucunun sebebi gösterilmiyor');
});
