import type { MessageKey } from '@ayna/i18n';
import type { BookingStatus } from './data';

/**
 * ŞABLON MESAJLAR — brief §9.
 *
 *   "Serbest sohbet yok. DURUMA BAĞLI hazır şablonlar."
 *
 * Neden serbest metin kaldırıldı: uygulama dışına çıkarma (telefon/Instagram
 * paylaşımı), pazarlık ve taciz için açık kapıydı. Şablon listesi bunların
 * hiçbirini ifade edemiyor — moderasyon ihtiyacı kökünden kalkıyor.
 *
 * ŞABLONLAR DURUMA GÖRE DEĞİŞİR. Randevu saatinde "yoldayım" anlamlı, onay
 * beklerken değil; ödeme aşamasında "ödemeyi yaptım" gerekli, hizmet gününde
 * erken. Tek bir düz liste, her adımda alakasız seçenekler göstererek
 * kullanıcıyı doğru olanı aramaya zorlardı.
 */

export type SablonRol = 'musteri' | 'uzman';

export type Sablon = {
  anahtar: MessageKey;
  /**
   * Gecikme bildiren şablonlar (§9): karşı tarafa push gider ve 15+ dakikalık
   * gecikmede uzmanın "müşteri gelmedi" butonu açılır (§4.8).
   */
  gecikmeDk?: number;
};

/** Boş liste = o durumda konuşacak bir şey yok; şerit hiç çizilmez. */
type Harita = Partial<Record<BookingStatus, Sablon[]>>;

/**
 * MÜŞTERİ şablonları.
 *
 * `onay_bekliyor` ve `karsi_oneri` BİLİNÇLİ olarak boş: top uzmanda, müşterinin
 * söyleyeceği bir şey yok. "Onaylar mısın?" gibi bir şablon, uzmanı sıkıştırma
 * aracına dönüşürdü.
 */
const MUSTERI: Harita = {
  depozito_bekliyor: [{ anahtar: 'tpl.c.paying' }, { anahtar: 'tpl.c.payment_issue' }],
  kesinlesti: [
    { anahtar: 'tpl.c.confirm_address' },
    { anahtar: 'tpl.c.what_to_bring' },
    { anahtar: 'tpl.c.reschedule_ask' },
  ],
  erteleme_onerildi: [{ anahtar: 'tpl.c.thanks' }],
  hizmet_gunu: [
    { anahtar: 'tpl.c.onway' },
    { anahtar: 'tpl.c.late10', gecikmeDk: 10 },
    { anahtar: 'tpl.c.late20', gecikmeDk: 20 },
    { anahtar: 'tpl.c.lost' },
    { anahtar: 'tpl.c.arrived' },
  ],
  odeme_bekliyor: [{ anahtar: 'tpl.c.paid_info' }, { anahtar: 'tpl.c.payment_issue' }],
  tamamlandi: [{ anahtar: 'tpl.c.thanks' }],
  degerlendirme: [{ anahtar: 'tpl.c.thanks' }],
};

/**
 * UZMAN şablonları.
 *
 * `depozito_bekliyor`da uzmanın elinde YALNIZ hatırlatma var: para müşteride,
 * 10 dakikalık sayaç zaten işliyor. Baskı kurabileceği bir şablon konmadı.
 */
const UZMAN: Harita = {
  onay_bekliyor: [{ anahtar: 'tpl.p.checking' }],
  depozito_bekliyor: [{ anahtar: 'tpl.p.awaiting_deposit' }],
  kesinlesti: [
    { anahtar: 'tpl.p.see_you' },
    { anahtar: 'tpl.p.directions' },
    { anahtar: 'tpl.p.prep_note' },
  ],
  erteleme_onerildi: [{ anahtar: 'tpl.p.reschedule_ok' }],
  hizmet_gunu: [
    { anahtar: 'tpl.p.ready' },
    { anahtar: 'tpl.p.waiting' },
    { anahtar: 'tpl.p.running_late', gecikmeDk: 10 },
    { anahtar: 'tpl.p.must_reschedule' },
  ],
  odeme_bekliyor: [{ anahtar: 'tpl.p.awaiting_payment' }, { anahtar: 'tpl.p.payment_received' }],
  tamamlandi: [{ anahtar: 'tpl.p.thanks' }],
  degerlendirme: [{ anahtar: 'tpl.p.thanks' }],
};

/**
 * O anki duruma ve role uygun şablonlar.
 *
 * Durum bilinmiyorsa (eski konuşma, kapanmış randevu) boş döner — kapanmış bir
 * randevuda mesajlaşmak akışa ait değil.
 */
export function sablonlar(rol: SablonRol, status?: BookingStatus): Sablon[] {
  if (!status) return [];
  return (rol === 'musteri' ? MUSTERI : UZMAN)[status] ?? [];
}
