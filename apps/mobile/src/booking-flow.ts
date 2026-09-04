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
    | 'iade_iste'
    | 'yeni_saat';
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

/**
 * Durum rozetinin ROLE GÖRE metni.
 *
 * `DURUM_ETIKETI` müşterinin gözünden yazılmış. Uzman aynı kartı açtığında
 * kendisi hakkında "Uzman onayı bekleniyor" okuyordu — kendi yanıtını
 * bekleyen bir cümle. Kurucu haklı olarak "saçma" dedi.
 *
 * Yalnız TARAF BELİRTEN durumlar değişiyor; geri kalanı iki tarafta da aynı
 * şeyi anlatıyor (Kesinleşti, Tamamlandı, İptal edildi...).
 */
export function durumEtiketi(status: BookingStatus, rol: Rol): MessageKey {
  if (rol === 'musteri') return DURUM_ETIKETI[status];
  switch (status) {
    case 'onay_bekliyor':
      return 'bs.pro.onay_bekliyor'; // "Yanıtın bekleniyor"
    case 'degisiklik_onerildi':
      return 'bs.pro.degisiklik_onerildi'; // "Müşterinin kararı bekleniyor"
    case 'karsi_oneri':
      return 'bs.pro.karsi_oneri'; // "Müşteri farklı saat önerdi"
    case 'depozito_bekliyor':
      return 'bs.pro.depozito_bekliyor'; // "Müşterinin depozitosu bekleniyor"
    case 'odeme_bekliyor':
      return 'bs.pro.odeme_bekliyor'; // "Müşterinin ödemesi bekleniyor"
    case 'no_show_musteri':
      return 'bs.pro.no_show_musteri'; // "Müşteri gelmedi"
    case 'no_show_uzman':
      return 'bs.pro.no_show_uzman'; // "Gelmedin"
    default:
      return DURUM_ETIKETI[status];
  }
}

/**
 * §4.3 — İKİNCİL aksiyonlar. Birincil buton tektir (§7) ama bazı adımlarda
 * kullanıcının GERÇEK seçeneği birden fazla: uzman onaylayabilir, farklı saat
 * önerebilir ya da reddedebilir. Yalnız "Onayla" göstermek, MD'nin verdiği
 * hakkı ekrandan silmek olurdu.
 */
export function ikincilAksiyonlar(status: BookingStatus, rol: Rol, ctx?: AkisBaglam): Aksiyon[] {
  const uzman = rol === 'uzman';
  switch (status) {
    // §4.6 — öneriyi yanıtlayan taraf REDDEDEBİLMELİ: yalnız "Kabul et"
    // göstermek, kabul etmekten başka yol bırakmamak demekti.
    case 'erteleme_onerildi':
      return ctx?.ertelemeyiOneren === rol
        ? []
        : [{ etiket: 'flow.act.reddet', eylem: 'erteleme_red', tehlike: true }];
    // §4.6 — erteleme artık İKİNCİL: iki taraf da önerebilir ama kesinleşmiş
    // randevunun ana çağrısı "ertele" değil.
    case 'kesinlesti':
      return ctx?.esikOncesi === false ? [] : [{ etiket: 'flow.act.ertele', eylem: 'ertele' }];
    // §4.3 — "Uzman: Onayla → 4.4 · Değiştir (tarih/saat/hizmet)"
    case 'onay_bekliyor':
      return uzman
        ? [
            { etiket: 'flow.act.degistir', eylem: 'degistir' },
            { etiket: 'flow.act.reddet', eylem: 'reddet', tehlike: true },
          ]
        : [];
    // §4.3 — müşteri: Kabul / Red / Karşı öner
    case 'degisiklik_onerildi':
      return uzman
        ? []
        : [
            { etiket: 'flow.act.karsi_oner', eylem: 'karsi_oner' },
            { etiket: 'flow.act.reddet', eylem: 'reddet', tehlike: true },
          ];
    // §4.3 — uzman karşı öneriye YALNIZ Kabul/Red verir (tek tur).
    case 'karsi_oneri':
      return uzman ? [{ etiket: 'flow.act.reddet', eylem: 'reddet', tehlike: true }] : [];
    default:
      return [];
  }
}

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
   * §4.10 — iade edilecek bir depozito VAR mı?
   *
   * Yoksa "Depozito iade et" düğmesi gösterilmemeli: kullanıcı hesap bilgisini
   * giriyor, sunucu "iade edilecek depozito yok" diyor ve o hatayı girdiği
   * bilgiye bağlıyordu.
   */
  iadeEdilecekVar?: boolean;
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
    /**
     * §4.5 — bekleme dönemi. BİRİNCİL EYLEM YOK: randevu kesinleşti, iki
     * tarafın da yapması gereken bir şey yok, gün bekleniyor.
     *
     * Burada birincil düğme "Ertele" idi: kesinleşmiş bir randevuda kartın
     * ana çağrısı "bunu ertele" oluyordu — yanlış vurgu, üstelik ekranda
     * bekleme hâli hiç görünmüyordu. Erteleme ikincil aksiyona indi (§4.6
     * hakkı duruyor, sadece ana eylem değil).
     */
    case 'kesinlesti':
      return null;
    /**
     * §4.6 — öneriyi KARŞI TARAF yanıtlar; öneren yalnız bekler.
     *
     * Öneren BİLİNMİYORSA düğme iki tarafta da gösteriliyor. Eskiden
     * `ctx.ertelemeyiOneren &&` koşulu vardı: alan gelmediğinde HİÇBİR TARAFTA
     * düğme çıkmıyor, randevu "Erteleme önerildi" durumunda KİLİTLENİYORDU —
     * kurucu tam bunu bildirdi (müşteri öneriyi görüyor ama kabul/red yok).
     *
     * Bilinmezlikte açmak güvenli: sunucu önerenin kendi önerisini
     * yanıtlamasını `OWN_PROPOSAL` ile zaten reddediyor. Kilitli bir randevu,
     * sunucunun eleyeceği fazladan bir düğmeden çok daha kötü.
     */
    case 'erteleme_onerildi':
      return ctx.ertelemeyiOneren === rol
        ? null
        : { etiket: 'flow.act.kabul', eylem: 'erteleme_kabul' };
    /**
     * §4.8/§4.9 — hizmet günü.
     *
     * Uzmanın birincil eylemi işi bitirmek.
     *
     * MÜŞTERİDE DE ÖDEME DÜĞMESİ VAR — kurucu (05.09.2026): "müşteri salona
     * gittiğinde hizmet saati başladığında otomatik olarak müşteri ekranında
     * ilgili randevuda Ödeme Yap butonu aktif olmalı. şu anda yok ve randevu
     * açık kalıyor ve tamamlanmıyor."
     *
     * Burada müşterinin HİÇBİR eylemi yoktu: ödeme ancak uzman "işlemi
     * bitirdim" dedikten sonra açılıyordu. Uzman düğmeye basmazsa randevu
     * sonsuza kadar açık kalıyor, müşteri parayı ödemiş olmasına rağmen
     * kapatamıyor ve puanını da alamıyordu. Artık hizmet saati başladığı anda
     * müşteri kendi başına kapatabiliyor.
     *
     * "Gelmedi" birincil düğme DEĞİL: yıkıcı ve geri alınamaz bir beyanı
     * kartın en büyük düğmesi yapmak kullanıcıyı ona doğru iter. İkincil ve
     * sessiz kalıyor (kartta ayrıca çiziliyor), tıpkı uzman tarafındaki gibi.
     */
    case 'hizmet_gunu':
      if (musteri)
        return ctx.odemeBildirildi
          ? null
          : { etiket: 'flow.act.odeme_yaptim', eylem: 'odeme_yaptim' };
      return { etiket: 'flow.act.islemi_bitirdim', eylem: 'islemi_bitirdim' };
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
    /**
     * §4.7/§4.10 — iade hakkı doğduğunda VE iade edilecek tutar varken.
     *
     * `iptal_musteri` EKLENDİ: MD §4.7 "Müşteri, 3 saatten fazla varken →
     * depozito iade". Kartta iade yolu yoktu; kullanıcı kendi iptal ettiği
     * randevuyu açıp parasını isteyemiyordu. İade edilip edilmeyeceğini
     * `iadeEdilecekVar` söylüyor (geç iptalde depozito yanar).
     */
    case 'iptal_musteri':
    case 'iptal_uzman':
    case 'no_show_uzman':
      return musteri && ctx.iadeEdilecekVar !== false
        ? { etiket: 'flow.act.iade_iste', eylem: 'iade_iste' }
        : null;
    /**
     * §4.2 — "Uzman yanıt vermedi, lütfen başka saat/uzman seçin."
     *
     * Bildirimde böyle yazıyor ama KARTTA hiçbir yol yoktu: kullanıcı düşen
     * talebini açıyor, ne olduğunu görüyor ve orada kalıyordu. Çıkmaz sokak.
     */
    case 'otomatik_dustu':
      return musteri ? { etiket: 'flow.act.yeni_saat', eylem: 'yeni_saat' } : null;
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
  // TASLAK gönderilmedi: slot tutulmuyor, karşı tarafın haberi bile yok.
  // "Karşı taraf bekleniyor" demek, olmayan bir süreci varmış gibi göstermekti.
  if (status === 'taslak') return false;
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
    // Yalnız ÖNEREN bekler; karşı taraf zaten karar veriyor. "Önerin
    // yanıtlanıyor" cümlesi öneriyi ALAN tarafta da çıkıyordu.
    case 'erteleme_onerildi':
      return 'wait.reschedule';
    case 'odeme_bekliyor':
      return musteri ? 'wait.expert_payment_confirm' : 'wait.customer_payment';
    // §4.5 — kesinleşmiş randevuda KİMSE karşı tarafı beklemiyor; iki taraf da
    // GÜNÜ bekliyor. "Karşı taraf bekleniyor" demek, birinin bir şey yapması
    // gerektiğini ima ediyordu.
    case 'kesinlesti':
      return musteri ? 'wait.day_customer' : 'wait.day_pro';
    // Hizmet sürüyor: müşterinin yapacağı bir şey yok, uzman bitirecek.
    case 'hizmet_gunu':
      return musteri ? 'wait.service_running' : 'wait.customer_arrival';
    default:
      return 'wait.generic';
  }
}
