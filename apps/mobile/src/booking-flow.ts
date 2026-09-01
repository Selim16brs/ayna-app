import { SLOT_HOLDING_STATES } from '@ayna/domain';
import type { MessageKey } from '@ayna/i18n';
import type { BookingStatus } from './data';

/**
 * RANDEVU AKIŞININ TEK KAYNAĞI (ekran tarafı).
 *
 * Brief §7:
 *   · "Tek birincil buton ilkesi: Randevu kartında her an yalnızca BİR ana
 *      aksiyon butonu vardır ve duruma göre değişir."
 *   · "Faz B = kargo takibi tarzı dikey durum zaman çizelgesi."
 *   · "Uzman aynı kartın aynasını görür; yalnızca butonları farklıdır."
 *
 * Eskiden her ekran kendi `status === '...'` zincirini kuruyordu: aynı durum
 * iki ekranda farklı buton gösterebiliyor, yeni bir durum eklendiğinde bazı
 * ekranlar sessizce boş kalıyordu. Burası o zinciri tek yere topluyor —
 * ekranlar artık "ne göstereyim" diye SORUYOR, kendileri karar vermiyor.
 */

export type Rol = 'musteri' | 'uzman';

/** Kartta gösterilecek TEK birincil aksiyon. */
export type Aksiyon = {
  /** Buton metni. */
  etiket: MessageKey;
  /** Ekranın çağıracağı işlem — API adı değil, akış adı. */
  eylem:
    | 'onayla'
    | 'degistir'
    | 'kabul'
    | 'reddet'
    | 'karsi_oner'
    | 'depozito_ode'
    | 'ertele'
    | 'erteleme_kabul'
    | 'erteleme_red'
    | 'iptal'
    | 'islemi_bitirdim'
    | 'odeme_yaptim'
    | 'odeme_aldim'
    | 'gelmedi'
    | 'degerlendir'
    | 'iade_iste';
  /** Yıkıcı/uyarı tonu (iptal, gelmedi). */
  tehlike?: boolean;
};

/** Zaman çizelgesindeki adımlar — brief §3'ün ana hattı. */
export const AKIS_ADIMLARI = [
  { anahtar: 'talep', etiket: 'flow.step.talep' },
  { anahtar: 'onay', etiket: 'flow.step.onay' },
  { anahtar: 'depozito', etiket: 'flow.step.depozito' },
  { anahtar: 'kesinlesti', etiket: 'flow.step.kesinlesti' },
  { anahtar: 'hizmet', etiket: 'flow.step.hizmet' },
  { anahtar: 'odeme', etiket: 'flow.step.odeme' },
  { anahtar: 'tamamlandi', etiket: 'flow.step.tamamlandi' },
] as const satisfies readonly { anahtar: string; etiket: MessageKey }[];

export type AdimAnahtari = (typeof AKIS_ADIMLARI)[number]['anahtar'];

/**
 * Durum → zaman çizelgesinde KAÇINCI adımdayız.
 *
 * Kapanan durumlar (-1) çizelgeyi hiç göstermez: iptal olmuş bir randevuda
 * "3/7 adım" göstermek, kullanıcıya süreç devam ediyormuş izlenimi verirdi.
 */
export function akisAdimi(status: BookingStatus): number {
  switch (status) {
    case 'taslak':
      return 0;
    case 'onay_bekliyor':
    case 'degisiklik_onerildi':
    case 'karsi_oneri':
      return 1;
    case 'depozito_bekliyor':
      return 2;
    case 'kesinlesti':
    case 'erteleme_onerildi':
      return 3;
    case 'hizmet_gunu':
      return 4;
    case 'odeme_bekliyor':
      return 5;
    case 'tamamlandi':
    case 'degerlendirme':
    case 'kapandi':
      return 6;
    default:
      return -1; // iptal/düşme/no-show/uyuşmazlık
  }
}

/**
 * Randevu HÂLÂ YAŞANACAK mı? — "Yaklaşan / Geçmiş" ayrımı buradan çıkar.
 *
 * `akisAdimi`den türetiliyor: kapanmış (iptal/no-show/düşmüş) bir randevu
 * saati gelecekte olsa bile yaklaşan değildir, tamamlanmış bir randevu da
 * geçmiştir. Bu ayrım eskiden ekranda elle yazılmış bir durum listesiyle
 * yapılıyordu; adlar değişince liste hiçbir şeyi eleyemez oldu ve İPTAL EDİLMİŞ
 * randevular "Yaklaşan" sekmesinde görünmeye başladı.
 */
export function yaklasanMi(status: BookingStatus): boolean {
  const adim = akisAdimi(status);
  return adim >= 0 && adim < 6;
}

export type Aralik = { startMs: number; endMs: number };

/**
 * Uzmanın DOLU aralıkları = SUNUCUDAN gelenler + BU CİHAZDAKİ bekleyen randevular.
 *
 * Sunucu listesi tek başına yetmiyordu. Randevu gönderildikten sonra kayıt
 * sunucuya ulaşana kadar (ağ yavaşsa saniyeler, ağ yoksa hiç) aynı saat boş
 * görünüyor; kullanıcı ekrandan çıkıp geri gelince AYNI SAATİ ikinci kez
 * seçebiliyordu. Kurucu tam bunu bildirdi: "aynı saatten randevu
 * gönderebiliyor, ekran açılıp kapanınca seçim olabiliyor."
 *
 * MD §4.2 slotu TALEP GÖNDERİLDİĞİ AN kilitliyor — kilit sunucunun cevabına
 * değil, kullanıcının kararına bağlı. Bu yüzden yerel bekleyen randevular da
 * dolu sayılıyor: ağ ne yaparsa yapsın kullanıcı kendi aldığı saati bir daha
 * seçemez.
 *
 * Sunucu yine SON SÖZ: başka bir müşteri o saati almışsa uzaktan listede
 * görünür ve çakışma sunucuda ayrıca reddedilir.
 */
export function doluAraliklar(
  proId: string,
  uzaktan: readonly Aralik[],
  yerelRandevular: readonly {
    proId?: string;
    startMs: number;
    durationMin?: number;
    status: BookingStatus;
  }[],
): Aralik[] {
  const yerel = yerelRandevular
    .filter((b) => b.proId === proId && slotTutuyor(b.status))
    .map((b) => ({
      startMs: b.startMs,
      endMs: b.startMs + (b.durationMin ?? 60) * 60_000,
    }));
  return [...uzaktan, ...yerel];
}

/** Bu durum uzmanın takvimini işgal ediyor mu? (brief §4.2) */
export function slotTutuyor(status: BookingStatus): boolean {
  return (SLOT_HOLDING_STATES as readonly string[]).includes(status);
}

/** İki aralık çakışıyor mu? Bitiş anı çakışma DEĞİL (14:00 biten iş, 14:00 başlayanı engellemez). */
export function cakisiyor(a: Aralik, b: Aralik): boolean {
  return a.startMs < b.endMs && a.endMs > b.startMs;
}

/** Durum rozetinin metni. Tek yerde; her ekran aynı kelimeyi gösterir. */
export const DURUM_ETIKETI: Record<BookingStatus, MessageKey> = {
  taslak: 'bs.taslak',
  onay_bekliyor: 'bs.onay_bekliyor',
  degisiklik_onerildi: 'bs.degisiklik_onerildi',
  karsi_oneri: 'bs.karsi_oneri',
  depozito_bekliyor: 'bs.depozito_bekliyor',
  kesinlesti: 'bs.kesinlesti',
  erteleme_onerildi: 'bs.erteleme_onerildi',
  hizmet_gunu: 'bs.hizmet_gunu',
  odeme_bekliyor: 'bs.odeme_bekliyor',
  tamamlandi: 'bs.tamamlandi',
  degerlendirme: 'bs.degerlendirme',
  kapandi: 'bs.kapandi',
  iptal_musteri: 'bs.iptal_musteri',
  iptal_uzman: 'bs.iptal_uzman',
  otomatik_dustu: 'bs.otomatik_dustu',
  no_show_musteri: 'bs.no_show_musteri',
  no_show_uzman: 'bs.no_show_uzman',
  uyusmazlik: 'bs.uyusmazlik',
  sync_conflict: 'bs.sync_conflict',
};

/** Rozet tonu — hangi renk ailesinden çizileceği. */
export type Ton = 'bekleme' | 'olumlu' | 'tehlike' | 'notr';

export const DURUM_TONU: Record<BookingStatus, Ton> = {
  taslak: 'notr',
  onay_bekliyor: 'bekleme',
  degisiklik_onerildi: 'bekleme',
  karsi_oneri: 'bekleme',
  depozito_bekliyor: 'bekleme',
  kesinlesti: 'olumlu',
  erteleme_onerildi: 'bekleme',
  hizmet_gunu: 'olumlu',
  odeme_bekliyor: 'bekleme',
  tamamlandi: 'olumlu',
  degerlendirme: 'olumlu',
  kapandi: 'notr',
  iptal_musteri: 'notr',
  iptal_uzman: 'notr',
  otomatik_dustu: 'notr',
  no_show_musteri: 'tehlike',
  no_show_uzman: 'tehlike',
  uyusmazlik: 'tehlike',
  sync_conflict: 'tehlike',
};

/** `birincilAksiyon` için ekranın sağladığı bağlam. */
export type AkisBaglam = {
  /** Müşteri "ödemeyi yaptım" dedi mi? (§4.9 iki aşamalı el sıkışma) */
  odemeBildirildi?: boolean;
  /** Randevu saatinden 15 dk geçti mi? (§4.8 "gelmedi" butonu) */
  gelmediAcik?: boolean;
  /** 3 saat eşiği geçmedi mi? (§4.6 erteleme, §4.7 ücretsiz iptal) */
  esikOncesi?: boolean;
  /**
   * §4.6 — bekleyen erteleme önerisini KİM yaptı?
   *
   * Kabul/Red karşı tarafındır: öneren kendi önerisini onaylayamaz, yoksa
   * "öner ve kabul et" tek taraflı saat değiştirmenin uzun yolu olurdu.
   */
  ertelemeyiOneren?: Rol;
};

/**
 * O an gösterilecek TEK birincil aksiyon — yoksa null.
 *
 * İkincil aksiyonlar (iptal, ertele) ayrı; bu fonksiyon "kullanıcı şimdi ne
 * yapmalı" sorusunun tek cevabını verir.
 */
export function birincilAksiyon(
  status: BookingStatus,
  rol: Rol,
  ctx: AkisBaglam = {},
): Aksiyon | null {
  const musteri = rol === 'musteri';
  switch (status) {
    // §4.3 — top uzmanda.
    case 'onay_bekliyor':
      return musteri ? null : { etiket: 'flow.act.onayla', eylem: 'onayla' };
    // §4.3 — uzman değişiklik önerdi; karar müşteride.
    case 'degisiklik_onerildi':
      return musteri ? { etiket: 'flow.act.incele', eylem: 'kabul' } : null;
    // §4.3 — müşteri karşı öneri yaptı; uzman yalnız Kabul/Red.
    case 'karsi_oneri':
      return musteri ? null : { etiket: 'flow.act.kabul', eylem: 'kabul' };
    // §4.4 — 10 dakikalık pencere müşteride.
    case 'depozito_bekliyor':
      return musteri ? { etiket: 'flow.act.depozito_ode', eylem: 'depozito_ode' } : null;
    // §4.6 — bekleme dönemi. Erteleme YALNIZ 3 saat eşiğinden önce.
    case 'kesinlesti':
      return ctx.esikOncesi ? { etiket: 'flow.act.ertele', eylem: 'ertele' } : null;
    // §4.6 — öneriyi karşı taraf yanıtlar; öneren yalnız bekler.
    case 'erteleme_onerildi':
      return ctx.ertelemeyiOneren && ctx.ertelemeyiOneren !== rol
        ? { etiket: 'flow.act.kabul', eylem: 'erteleme_kabul' }
        : null;
    // §4.8/§4.9 — hizmet günü: uzman bitirir; 15 dk sonra "gelmedi" açılır.
    case 'hizmet_gunu':
      if (!musteri) return { etiket: 'flow.act.islemi_bitirdim', eylem: 'islemi_bitirdim' };
      return ctx.gelmediAcik
        ? { etiket: 'flow.act.gelmedi', eylem: 'gelmedi', tehlike: true }
        : null;
    // §4.9 — iki aşamalı el sıkışma. Müşteri bildirmeden uzmanda buton çıkmaz.
    case 'odeme_bekliyor':
      if (musteri)
        return ctx.odemeBildirildi
          ? null
          : { etiket: 'flow.act.odeme_yaptim', eylem: 'odeme_yaptim' };
      return ctx.odemeBildirildi ? { etiket: 'flow.act.odeme_aldim', eylem: 'odeme_aldim' } : null;
    // §4.11 — değerlendirme yalnız müşteride.
    case 'tamamlandi':
    case 'degerlendirme':
      return musteri ? { etiket: 'flow.act.degerlendir', eylem: 'degerlendir' } : null;
    // §4.10 — iade hakkı doğduğunda müşteri kartında iade butonu.
    case 'iptal_uzman':
    case 'no_show_uzman':
      return musteri ? { etiket: 'flow.act.iade_iste', eylem: 'iade_iste' } : null;
    default:
      return null;
  }
}

/** Bu durumda iptal edilebilir mi? Kapanmış randevu iptal edilemez. */
export function iptalEdilebilir(status: BookingStatus): boolean {
  return (
    status === 'onay_bekliyor' ||
    status === 'degisiklik_onerildi' ||
    status === 'karsi_oneri' ||
    status === 'depozito_bekliyor' ||
    status === 'kesinlesti' ||
    status === 'erteleme_onerildi'
  );
}

/**
 * KARŞI TARAF BEKLENİYOR MU? — bekleme animasyonu bu cevaba göre çiziliyor.
 *
 * "Top kimde" sorusunun cevabı `birincilAksiyon`da zaten var: bu roldeki
 * kullanıcının yapacağı bir şey YOKSA ama randevu hâlâ akış içindeyse, top
 * karşı taraftadır. Ayrı bir liste tutmak, iki listenin ayrışmasına açık
 * olurdu — buton çıkmayan bir durumda animasyon da çıkmaz, tersi de.
 *
 * İstisna `odeme_bekliyor`: müşteri ödediğini bildirdikten SONRA onun yapacağı
 * bir şey kalmıyor ama uzmanın teyidi bekleniyor — tam da animasyonun anlamlı
 * olduğu an.
 */
export function karsiTarafBekleniyor(
  status: BookingStatus,
  rol: Rol,
  ctx: AkisBaglam = {},
): boolean {
  // Kapanmış randevuda beklenecek bir şey yok.
  if (akisAdimi(status) < 0) return false;
  if (status === 'tamamlandi' || status === 'degerlendirme' || status === 'kapandi') return false;
  // Bu rolün yapacağı bir şey varsa top ONDA; animasyon yanıltıcı olurdu.
  return birincilAksiyon(status, rol, ctx) === null;
}

/** Beklenen tarafı anlatan metin — kart bunu animasyonun yanında gösterir. */
export function beklemeMetni(status: BookingStatus, rol: Rol): MessageKey {
  const musteri = rol === 'musteri';
  switch (status) {
    case 'onay_bekliyor':
      return 'wait.expert_approval';
    case 'degisiklik_onerildi':
      return 'wait.customer_decision';
    case 'karsi_oneri':
      return 'wait.expert_decision';
    case 'depozito_bekliyor':
      return 'wait.customer_deposit';
    case 'erteleme_onerildi':
      return 'wait.reschedule';
    case 'odeme_bekliyor':
      return musteri ? 'wait.expert_payment_confirm' : 'wait.customer_payment';
    case 'hizmet_gunu':
      return musteri ? 'wait.service_day' : 'wait.customer_arrival';
    default:
      return 'wait.generic';
  }
}
