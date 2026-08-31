import { DEFAULT_DEPOSIT_RULES, DEFAULT_EARN_PCT, depositFor } from '@ayna/domain';
import type { PointsSpendRules } from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadMediaCache, medyaAnahtari, saveMediaCache } from './media-cache';
import { setApiToken } from './api';
import { formatTrDate } from './date-label';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { MessageKey } from '@ayna/i18n';
import {
  api,
  ApiError,
  type AppConfig,
  type AuthSession,
  type AuthUser,
  type LoyaltyTier,
} from './api';
import { formatSlotTr } from './datetime';
import { getCurrentLocale } from './locale';
import {
  type AppNotification,
  type Appointment,
  type BookingSource,
  type DemandMode,
  type DemandRequest,
  type Promotion,
  POINTS_SPEND_CAP_PCT,
  POINTS_UNLOCK_KZT,
  POINTS_EXPIRY_DAYS,
  PREMIUM_PRICE_KZT,
  DEPOSIT_RECEIPT_WINDOW_MS,
  DEPOSIT_RECEIPT_SHORT_MS,
  DEPOSIT_SHORT_THRESHOLD_MS,
  FREE_CANCEL_WINDOW_MS,
  REMIND_24H_MS,
  REMIND_2H_MS,
  RESPONSE_WINDOW_MS,
  buildUpcomingEvents,
  type CareRoutine,
  type CirclePost,
  type CirclePostType,
  type LedgerEntry,
  type LifeArticle,
  type Moment,
  type PersonalLog,
  type PersonalTone,
  type QuickAddKind,
  type Review,
  type Reward,
  RAFFLE_COST,
  NOTIFICATION_TTL_MS,
  type AlwaysBond,
  COMMISSION_PCT_STANDARD,
  SEED_APPOINTMENTS,
  type UpcomingEvent,
  type UserAddress,
} from './data';
import { findServiceWithCategory, servicesOf } from './taxonomy';
import { defaultHours, type DayHours } from './ui/WorkingHours';
import { emptySocial, type SocialValue } from './ui/SocialLinks';

let seq = 5000;
const nextId = (prefix: string) => `${prefix}${++seq}`;

// §6.1 — uzman/salon hizmet kataloğu satırı: taksonomi hizmet id'sine bağlı fiyat/süre (₸ / dk, string form).
export type SellerServiceRow = { price: string; dur: string };

// Uzmanın MÜŞTERİLERİNE SUNDUĞU hazır hizmet menüsü (Hizmetler ekranından yönetilir).
// Demo hesabı bir saç uzmanı → başlangıçta kendi uzmanlığındaki hizmetlerle gelir (generic
// çok-kategorili katalog DEĞİL). Gerçek uygulamada bu liste uzmanın kaydından türer.
const seedSellerServices = (): Record<string, SellerServiceRow> => {
  const init: Record<string, SellerServiceRow> = {};
  for (const s of servicesOf('hair')) {
    init[s.id] = { price: String(s.price), dur: String(s.durationMin) };
  }
  return init;
};

// §4.3 — dekont son yükleme anı: randevuya 6 saatten az varsa 1 saat, değilse 3 saat.
const depositDeadlineFor = (startMs: number, now: number): number =>
  now +
  (startMs - now < DEPOSIT_SHORT_THRESHOLD_MS
    ? DEPOSIT_RECEIPT_SHORT_MS
    : DEPOSIT_RECEIPT_WINDOW_MS);

const TONE_ICON: Record<PersonalTone, string> = {
  rose: 'medkit-outline',
  sage: 'barbell-outline',
  lavender: 'calendar-outline',
  blue: 'notifications-outline',
};

export interface AddBookingInput {
  source: BookingSource;
  service: string;
  proId: string;
  proName: string;
  proImage: string;
  uzmanName?: string;
  startMs: number;
  durationMin: number;
  price: number;
  offerId?: string; // §keşif Modül 2 — kampanya bağlantısı
  status?: Appointment['status'];
}

export interface AddPersonalLogInput {
  title: string;
  dateLabel: string;
  tone: PersonalTone;
  icon?: string;
  note?: string;
  kind?: QuickAddKind;
  dateMs?: number;
}

export interface AddMomentInput {
  title: string;
  dateLabel: string;
  daysLeft: number;
  icon?: string;
}

export interface AddRoutineInput {
  name: string;
  dueDays: number;
  icon?: string;
  categoryCode?: string; // "Teklif Al" ön-seçimi için
}

export interface AddPostInput {
  type: CirclePostType;
  category: string;
  text: string;
  anonymous: boolean;
}

interface State {
  bookings: Appointment[];
  /**
   * Randevular HENÜZ oturmadı mı? (persist geri yüklemesi + sunucudan tazeleme)
   *
   * Bu bayrak olmadan Randevular sekmesi `bookings.length === 0` görüp BOŞ
   * DURUMU çiziyordu — yani randevusu olan kullanıcıya "hiç randevun yok"
   * diyordu. İki ayrı pencerede oluyordu: (a) soğuk açılışta AsyncStorage
   * geri yüklemesi ASENKRON olduğu için store `bookings: []` ile başlıyor,
   * (b) girişten sonra sunucudan ilk çekim sürerken.
   *
   * Bu yüzden başlangıç değeri `true`: "daha bilmiyoruz". `hydrateBookings`
   * her yoldan (token yok / başarı / hata) `false`'a çeker.
   */
  bookingsLoading: boolean;
  /**
   * Talepler HENÜZ oturmadı mı? Bookings'ten DAHA kritik: `demands` persist
   * listesinde YOK, yani her soğuk açılışta boş başlıyor ve yalnız sunucudan
   * geliyor. Bayraksız hâlde Talepler sekmesi her açılışta, çekim boyunca
   * "talebin yok" diyordu.
   */
  demandsLoading: boolean;
  // §5.2 — açılan teklif/talep istekleri (reverse marketplace)
  demands: DemandRequest[];
  // §10.1/§5.1.6 — salon/uzman promosyonları (Fırsatlar vitrini içeriği)
  promotions: Promotion[];
  createPromotion: (input: {
    title: string;
    desc: string;
    discountPct?: number;
    startLabel: string;
    endLabel: string;
    imageUri?: string;
  }) => void;
  // §5.1.2 — son aramalar (boş arama kutusunda gösterilir)
  recentSearches: string[];
  // §5.4 — bildirim grupları aç/kapa (bakım / özel gün / kişisel kayıt / randevu)
  notifPrefs: { care: boolean; moment: boolean; personal: boolean; booking: boolean };
  // §9.3 — uzman talep bildirim tercihleri: kategori (boş = tümü) + saat aralığı (Almatı saati)
  demandNotif: { cats: string[]; from: number; to: number };
  setDemandNotif: (p: Partial<{ cats: string[]; from: number; to: number }>) => void;
  // §4.6 — uzmanın kapalı (izin/tatil) günleri: Almatı gün başlangıcı UTC ms.
  // Kullanıcı tarafında bu günler slot göstermez. (Mock: tek sağlayıcı; backend providerId'yle anahtarlar.)
  closedDays: number[];
  circlePosts: CirclePost[];
  // §12.6 — AYNA Blog (admin yayınlar → app gösterir; fetch başarısızsa seed)
  articles: LifeArticle[];
  weeklyTheme: { id: string; title: string; prompt: string } | null;
  // §12.9 — admin'in belirlediği parametrik oranlar/şehirler (fetch başarısızsa sabit varsayılan)
  config: AppConfig;
  loadContent: () => Promise<void>;
  careRoutines: CareRoutine[];
  personalLogs: PersonalLog[];
  moments: Moment[];
  favorites: string[];
  // W2W — takip edilen kişiler (yazar adı) + beni takip eden kişiler (mock liste)
  following: string[];
  followingIds: string[]; // §5.5 — takip KİMLİK seti (görünen ad değişse de doğru eşleşir)
  followerNames: string[];
  // §5.6 — kullanıcı adresleri (ev/iş)
  addresses: UserAddress[];
  // §5.6.2 — premium üyelik durumu (satın alma app-dışı; burada mock bayrak)
  premium: boolean;
  setPremium: (v: boolean) => void;
  // §11 — uzman kaydından itibaren 3 gün ÜCRETSİZ deneme: bu sürede tüm talepleri görüp
  // teklif verebilir. Süre bitince premium/platinum değilse detay+teklif kilitlenir.
  sellerTrialStart: number | null;
  points: number;
  raffleEntries: number;
  // K4 — puan harcama kuralları (sunucu doğruluk kaynağı). null = henüz okunmadı.
  pointsSpend: PointsSpendRules | null;
  // §8.1 — puan kazanım limitleri: ilk randevu 300 (tek seferlik) + W2W beğeni 1/ay maks 100
  firstBookingBonusGiven: boolean;
  w2wLikeMonth: string;
  w2wLikePoints: number;
  tier: LoyaltyTier | null;
  ledger: LedgerEntry[];
  userReviews: Record<string, Review[]>;
  notifications: AppNotification[];
  /**
   * Okunmamış MESAJ sayısı — ana ekrandaki mesaj ikonunun rozeti.
   *
   * Bildirim sayacından (`selectUnreadCount`) ayrı tutuluyor: mesaj gelince
   * hiçbir bildirim üretilmiyor, yani zil sessiz kalıyordu ve kullanıcı ancak
   * Mesajlar'ı açınca yeni mesajı görüyordu. Sunucudan geliyor; yerel
   * hesaplanamaz çünkü konuşmalar mağazada tutulmuyor.
   */
  unreadMessages: number;
  token: string | null;
  currentUser: AuthUser | null;
  // Profil fotoğrafı (galeri/kamera; kaldırılabilir). Kalıcı saklanır.
  avatarUri: string | null;
  setAvatar: (uri: string | null) => void;
  // §5.1.1 — remove.bg cut-out (arka planı temizlenmiş şeffaf PNG). Keşfet/uzman ana sayfa hero'sunda.
  cutoutUri: string | null;
  /** Portrenin türetildiği fotoğrafın anahtarı; eşleşmezse portre BAYATTIR. */
  cutoutFor: string | null;
  setCutout: (uri: string | null, forKey?: string | null) => void;
  // Yerel foto base64 → cut-out uygula. Sonuç: 'ok' | 'not_premium' | 'unavailable' | 'error'.
  applyProfileCutout: (base64: string) => Promise<'ok' | 'not_premium' | 'unavailable' | 'error'>;
  // §6.1 — uzman/salon hizmet kataloğu (taksonomi id → fiyat/süre). Profil "Hizmetler" ekranından
  // yönetilir; offline randevu akışında hazır (accordion) seçim olarak kullanılır. Kalıcı saklanır.
  sellerServices: Record<string, SellerServiceRow>;
  setSellerServices: (map: Record<string, SellerServiceRow>) => void;
  // §9.5 — uzman/salon profil verileri (kayıt sonrası düzenlenebilir). Kalıcı saklanır.
  sellerSocial: SocialValue;
  sellerHours: DayHours[];
  /** Çalışma saatleri — kendi ekranından doğrudan kaydedilir (admin onayı yok). */
  setSellerHours: (hours: DayHours[]) => void;
  sellerCerts: string[];
  setSellerProfile: (p: { social?: SocialValue; hours?: DayHours[]; certs?: string[] }) => void;
  // §10.1/§6.2 — salon-seviyesi profil (uzman profilinden AYRI). Kalıcı saklanır.
  salonProfile: {
    photos: string[];
    about: string;
    address: string;
    contact: string;
    areas: string[];
  };
  setSalonProfile: (p: Partial<State['salonProfile']>) => void;

  // auth
  setAuth: (session: AuthSession) => void;
  markPhoneVerified: () => void;
  logout: () => void;

  // bookings
  addBooking: (input: AddBookingInput) => string;
  // §4.6/§10.2 — salon offline randevu ekler → uzman onayına gider
  salonAddOffline: (input: {
    salonName: string;
    uzmanName: string;
    customerName: string;
    customerPhone: string;
    service: string;
    startMs: number;
    durationMin: number;
    price: number;
  }) => string;
  // §10/§4/§11 — GERİ ÇAĞIRMA: hizmet periyodu dolan memnun müşteriye sıcak bildirim.
  // PREMIUM özellik; sistem OTOMATİK gönderir; premium uzman aç/kapat edebilir.
  reengagedIds: string[];
  autoReengageEnabled: boolean; // premium uzman toggle'ı (varsayılan açık)
  setAutoReengage: (v: boolean) => void;
  runAutoReengage: (locale: string) => void; // sistem tetiklemesi (app açılış/periyodik)
  sendReengage: (input: {
    clientId: string;
    stage: 'pre' | 'due'; // 'pre' = periyot bitişine 1 gün kala, 'due' = bitiş günü
    serviceId: string; // hizmete özel mesaj için
    customerName: string;
    serviceLabel: string;
    expertName: string;
  }) => void;
  // §11 — PLATINUM paket + ALWAYS (karşılıklı sadık-müşteri bağı) + toplu bildirim
  platinum: boolean;
  setPlatinum: (v: boolean) => void;
  alwaysBonds: AlwaysBond[];
  /**
   * Always bağı iste.
   *
   * Eski imza İSİM alıyordu (providerName/customerName) — cihazlar arası bir
   * bağ isimle kurulamaz ve istemcinin gönderdiği kimliğe güvenmek başkası
   * adına bağ kurdurmak olurdu. Artık yalnız `proId` gidiyor; karşı tarafın
   * kullanıcı kimliğini SUNUCU buluyor.
   */
  requestAlways: (input: { proId: string; lastServiceId?: string }) => void;
  acceptAlways: (id: string) => void;
  declineAlways: (id: string) => void;
  removeAlways: (id: string) => void;
  // Platinum toplu bildirim — Always listesindeki müşterilere; kaç alıcıya gittiğini döndürür
  sendAlwaysBroadcast: (input: { title: string; body: string }) => Promise<number>;
  cancelBooking: (id: string, reason?: string) => void;
  acceptAlternative: (id: string) => void;
  // §4.1/§4.3 — uzman yanıtı + depozito/dekont akışı
  approveBooking: (id: string) => void; // uzman kabul → depozito adımı açılır
  rejectBooking: (id: string) => void; // uzman reddet → iptal
  proposeAlternative: (id: string, startMs: number) => void; // uzman alternatif saat önerir
  rescheduleBooking: (id: string, startMs: number) => void; // §4.4 — KULLANICI yeni saat önerir (iptal yerine)
  submitReceipt: (id: string, receiptUri: string) => void; // kullanıcı dekont yükler
  confirmReceipt: (id: string) => void; // uzman "Aldım, onaylıyorum" → randevu KESİN
  markNoShow: (id: string) => void; // §4.4 — uzman müşteriyi "gelmedi" işaretler (kapora yanar)
  completeBooking: (id: string) => void; // §4.1.7 — uzman hizmeti tamamladı → değerlendirme daveti
  reportProviderNoShow: (id: string) => void; // §4.4-b — uzman gelmedi → müşteriye 1000 puan telafi
  giveCustomerSignal: (id: string, signal: 'up' | 'down') => void; // §7.3 — gizli operasyonel sinyal
  // §4.4 — iade + itiraz
  uploadRefundReceipt: (id: string, receiptUri: string) => void; // uzman iade dekontu yükler
  confirmRefund: (id: string) => void; // kullanıcı "iadeyi aldım" → kayıt kapanır
  disputeBooking: (id: string) => void; // taraflar itiraz açar (destek/admin kuyruğu)
  checkReminders: () => void; // §4.1 adım 6 — 24s/2s hatırlatmaları üretir (idempotent)
  expireDeposits: () => void; // §4.3 — dekont süresi dolan deposit_pending randevuları düşürür
  expireResponses: () => void; // §4.1.3 — uzman yanıt süresi dolan talepleri düşürür
  toggleClosedDay: (dayStartMs: number) => void; // §4.6 — günü kapalı/açık işaretle
  // §5.2 Faz A — teklif/talep akışı BULUTTAN (iki cihaz arasında gerçek çalışır)
  createDemand: (input: {
    mode: DemandMode;
    category: string;
    note?: string;
    photoDataUrl?: string;
    budget?: number;
    collectMin: number;
    serviceId?: string;
    addressId?: string;
    preferredSlots?: number[];
  }) => Promise<string | null>; // → talep id (backend) | null = hata
  hydrateDemands: () => Promise<void>; // taleplerim + gelen teklifleri buluttan çek
  /** Talebi kaldır. Ölü talepler listede asılı kalıyordu; kaldırma yolu yoktu. */
  removeDemand: (id: string) => Promise<boolean>;
  selectOffer: (demandId: string, offerId: string, slotMs: number) => Promise<string | null>; // → booking id
  expireDemands: () => void; // süresi dolan talepleri işaretle
  addRecentSearch: (q: string) => void; // §5.1.2 — son aramaya ekle (dedup, en fazla 8)
  toggleNotifPref: (key: 'care' | 'moment' | 'personal' | 'booking') => void; // §5.4
  // §5.2 Faz A — uzman tarafı: açık talebe teklif BULUTA gider (true=başarılı)
  submitOffer: (
    demandId: string,
    offer: {
      price: number;
      discountPercent?: number;
      discountReason?: string;
      etaMin: number;
      note?: string;
      slots: number[];
    },
  ) => Promise<boolean>;
  // §4.5 — uzman ayrılığında randevu devri (sessiz silme YASAK)
  reassignStaffBookings: (oldUzman: string, newUzman: string) => number; // devredilen randevu sayısı
  acceptReassignment: (id: string) => void; // kullanıcı yeni uzmanı onaylar
  rejectReassignment: (id: string) => void; // kullanıcı reddeder → iptal
  // §7.1 — çift puanlama (uzman + ops. salon) + alt kırılım etiketleri
  reviewBooking: (
    id: string,
    input: {
      rating: number;
      text: string;
      tags: string[];
      photos?: string[]; // EK Z.10 — öncesi/sonrası galeri
      salon?: { rating: number; text: string; tags: string[] };
    },
  ) => void;
  // §7.2 — uzman/salon: yoruma tek yanıt + itiraz
  replyToReview: (proId: string, reviewId: string, reply: string) => void;
  disputeReview: (proId: string, reviewId: string) => void;
  hydrateBookings: () => Promise<void>;
  // VERİ KAYBI YASAĞI — sunucuya yazılamayan randevular kuyrukta bekler, bağlantı gelince eşitlenir
  pendingBookingSync: string[];
  syncBooking: (booking: Appointment) => void;
  flushBookingSync: () => Promise<void>;
  queueOfflineBooking: (booking: Appointment) => void;
  dropLocalBooking: (id: string) => void; // Faz 3 — sync_conflict kaydını yerelden kaldır

  // gizlilik: değerlendirmede kimliği gizle (salon/uzman yorum sahibini göremez)
  reviewAnonymous: boolean;
  surveyAskedIds: string[]; // §7 — anket daveti gönderilen randevular (tek sefer)
  // Açılış pop-up'ı: talep başına GÖRÜLEN teklif sayısı (persist) → açılışta farkla 'yeni tekliflerin var'
  offersSeen: Record<string, number>;
  takeNewOffers: () => { count: number; demandId: string | null }; // farkı hesapla + görüldü işaretle
  setReviewAnonymous: (v: boolean) => void;

  // favorites
  toggleFavorite: (proId: string) => void;
  toggleFollow: (author: string, targetUserId?: string | null) => void;
  removeFollower: (name: string) => void;
  // §5.6 — adres yönetimi
  addAddress: (label: UserAddress['label'], detail: string) => void;
  removeAddress: (id: string) => void;

  // personal
  addPersonalLog: (input: AddPersonalLogInput) => void;
  updatePersonalLog: (id: string, patch: AddPersonalLogInput) => void;
  deletePersonalLog: (id: string) => void;
  addMoment: (input: AddMomentInput) => void;
  addRoutine: (input: AddRoutineInput) => void;
  completeRoutine: (id: string) => void;

  // circle
  addPost: (input: AddPostInput) => string;
  toggleHelpful: (postId: string) => void;
  /** §14 — gönderiyi kaydet/kaldır (sunucuya yazılır; yalnız sana ait). */
  toggleSaved: (postId: string) => void;
  addComment: (postId: string, text: string, anonymous: boolean, proId?: string) => void;
  // §5.5 — moderasyon katman 2: şikâyet et (eşik aşınca gizlenir + admin kuyruğu)
  reportedPosts: string[];
  reportPost: (postId: string) => void;

  // loyalty
  earn: (points: number, labelKey: MessageKey, detail: string) => void;
  redeem: (reward: Reward) => Promise<boolean>;
  enterRaffle: () => boolean; // §8.2 — 500 puan = 1 çekiliş bileti
  hydrateLoyalty: () => Promise<void>;
  /** §bakım — rutin/an/günlüğü sunucudan çek. Yazma tarafı olup okuma olmazsa veri geri gelmez. */
  hydrateCare: () => Promise<void>;
  /** §11 — Always bağlarını sunucudan çek. Okuma olmazsa karşı tarafın isteği hiç görünmez. */
  hydrateAlways: () => Promise<void>;
  /** §tercihler — sunucudaki tercihleri yükle. Okuma olmazsa yeni cihaz varsayılanlarla açılır. */
  hydratePrefs: () => Promise<void>;
  refreshMembership: () => Promise<void>; // §11 — tier'ı sunucudan tazele (onay sonrası haklar açılır)

  // şehir (global filtre)
  setCity: (city: string) => void;
  // §9.5 — müşteri profilini anında günceller (salon/uzman admin onayı ister)
  updateMyProfile: (patch: Partial<Pick<AuthUser, 'name' | 'email' | 'city'>>) => void;
  // §profil-onay — salon/uzman değişikliğini admin onay kuyruğuna gönderir
  submitProfileChange: (changes: Record<string, unknown>) => Promise<void>;
  applyApprovedProfileChanges: () => Promise<void>;

  // notifications
  pushNotification: (n: Omit<AppNotification, 'id' | 'read'>) => void;
  pruneNotifications: () => void; // §5.7 — 30 günden eski bildirimleri temizle
  markNotificationRead: (id: string) => void;
  setUnreadMessages: (n: number) => void;
  markAllNotificationsRead: () => void;
}

// Oturum (token/kullanıcı/mod) AsyncStorage'da KALICI saklanır — reload'da çıkış yapılmaz,
// alt bar kaybolmaz. Diğer state (mock bookings vb.) persist edilmez.
// Faz B — GİRİŞLİ hesapta tohum/mock KİŞİSEL veri asla görünmez. Bu dilimler persist
// EDİLMEZ (her açılışta initial-state tohumlarından gelir) → girişli açılışta sıfırlanır;
// gerçek değerleri hydrateLoyalty/hydrateBookings/hydrateDemands doldurur.
// (avatar/cutout/premium gibi PERSIST edilen kullanıcı verileri BURADA sıfırlanmaz.)
const SEEDED_PERSONAL_RESET: Partial<State> = {
  bookings: [],
  following: [],
  followingIds: [],
  followerNames: [],
  circlePosts: [], // W2W tohumları da girişli hesapta yok; gerçek gönderiler loadContent ile gelir

  demands: [],
  points: 0,
  raffleEntries: 0,
  pointsSpend: null,
  tier: null,
  ledger: [],
  notifications: [],
  // Artık PERSIST ediliyor → hesap değişiminde MUTLAKA sıfırlanmalı, yoksa
  // önceki üyenin "anket soruldu" kaydı yeni üyeye taşınır ve o kullanıcı
  // kendi randevusu için anket daveti hiç almaz.
  surveyAskedIds: [],
  unreadMessages: 0,
  userReviews: {},
  favorites: [],
  addresses: [],
  careRoutines: [],
  personalLogs: [],
  firstBookingBonusGiven: false,
  w2wLikeMonth: '',
  w2wLikePoints: 0,
};

// GİZLİLİK KAPISI — hesap değişimi/çıkışta İSTİSNASIZ sıfırlanan kullanıcı-verisi.
// Yeni üye aynı cihazda önceki üyeye ait HİÇBİR şeyi göremez (randevu, kazanç,
// hizmet menüsü, sertifika, salon profili, özel günler, Always bağları...).
// Yeni kullanıcı-alanı eklerken BURAYA da ekle (store.reset.test.ts bekçidir).
export const userScopedReset = (): Partial<State> => ({
  ...SEEDED_PERSONAL_RESET,
  pendingBookingSync: [], // önceki üyenin eşitleme kuyruğu yeni üyeye taşınmaz
  moments: [],
  closedDays: [],
  promotions: [],
  recentSearches: [],
  reportedPosts: [],
  reengagedIds: [],
  alwaysBonds: [],
  offersSeen: {},
  demandNotif: { cats: [], from: 8, to: 22 },
  notifPrefs: { care: true, moment: true, personal: true, booking: true },
  sellerServices: seedSellerServices(),
  sellerHours: defaultHours(),
  sellerSocial: emptySocial,
  sellerCerts: [],
  salonProfile: { photos: [], about: '', address: '', contact: '', areas: [] },
  premium: false,
  platinum: false,
  autoReengageEnabled: true,
  avatarUri: null,
  cutoutUri: null,
  sellerTrialStart: null,
  reviewAnonymous: true,
});

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      bookings: [],
      bookingsLoading: true,
      demandsLoading: true,
      demands: [],
      promotions: [],
      recentSearches: [],
      notifPrefs: { care: true, moment: true, personal: true, booking: true },
      demandNotif: { cats: [], from: 8, to: 22 },
      closedDays: [],
      circlePosts: [],
      reportedPosts: [],
      articles: [],
      weeklyTheme: null,
      config: {
        rates: {
          commissionPct: 10, // kurucu kararı: online randevudan %10 (fetch başarısızsa fallback)
          // K1 — oranlı kapora yedek değerleri (sunucu fetch'i başarısızsa)
          depositPct: 10,
          holdMinutes: 180,
          cancelWindowH: 3,
          lateCancelPct: 3,
          pointsEarnPct: DEFAULT_EARN_PCT,
          pointsCapPct: POINTS_SPEND_CAP_PCT,
          pointsUnlockKzt: POINTS_UNLOCK_KZT,
          pointsExpiryDays: POINTS_EXPIRY_DAYS,
          pointsSubsidyCapPct: 50,
          premiumUserKzt: PREMIUM_PRICE_KZT,
          premiumSalonKzt: 4990,
          raffleCost: RAFFLE_COST,
        },
        cities: { active: ['Almatı'], soon: ['Astana', 'Şımkent'] },
        features: { removebg: false, openai: false, sms: false },
      },
      loadContent: async () => {
        // AÇILIŞ SÜRESİ: bu fonksiyon eskiden DÖRT TUR ağ yapıyordu — önce
        // makale/tema/config grubu, sonra sırayla W2W gönderileri, /me ve
        // duyurular. Her tur ayrı bir gidiş-dönüş; sunucu Amsterdam'da,
        // kullanıcılar Kazakistan'da, yani tur başına ~1,5 sn. Dördü üst üste
        // binince açılış saniyeler sürüyordu.
        //
        // Hepsi TEK TURDA gidiyor artık. `allSettled` şart: biri düşerse
        // (ör. tema yok) diğerleri düşmemeli — sıralı hâlde zaten her blok
        // kendi try/catch'indeydi, o izolasyon korunuyor.
        const tokenNow = get().token;
        const [rowsR, themeR, cfgR, postsR, annsR] = await Promise.allSettled([
          api.contentArticles(),
          api.contentTheme(),
          api.appConfig(),
          api.circlePosts(tokenNow ?? undefined),
          tokenNow ? api.announcements(tokenNow, getCurrentLocale()) : Promise.resolve(null),
        ]);
        try {
          const rows = rowsR.status === 'fulfilled' ? rowsR.value : null;
          const theme = themeR.status === 'fulfilled' ? themeR.value : null;
          const cfg = cfgR.status === 'fulfilled' ? cfgR.value : null;
          set((s) => ({
            articles: rows ?? s.articles,
            weeklyTheme: theme ? { id: theme.id, title: theme.title, prompt: theme.prompt } : null,
            config: cfg ?? s.config,
          }));
        } catch {
          // Backend erişilemezse seed makaleler + varsayılan config ile devam
        }
        // §5.5 — backend'de yayınlanmış W2W gönderilerini akışa ekle (additive; yereli silmez)
        try {
          if (postsR.status === 'rejected') throw postsR.reason;
          const backendPosts = postsR.value;
          set((s) => {
            const have = new Set(s.circlePosts.map((p) => p.id));
            // Kaydetme durumu SUNUCUDAN gelir ve BİLİNEN gönderilerde de
            // tazelenir. Yalnız yeni gönderileri eklemek yetmiyordu: başka
            // cihazda kaydedilen bir gönderi burada hep "kaydedilmemiş"
            // görünürdü.
            const savedMap = new Map(backendPosts.map((p) => [p.id, p.savedByMe === true]));
            // Yorum SAYISI da tazelenir: başkası yorum yazınca akıştaki sayı
            // güncellensin (eskiden hiç yazılmadığı için hep 0 görünüyordu).
            const countMap = new Map(backendPosts.map((p) => [p.id, p.comments]));
            const guncel = s.circlePosts.map((p) =>
              savedMap.has(p.id)
                ? { ...p, savedByMe: savedMap.get(p.id), commentCount: countMap.get(p.id) }
                : p,
            );
            const fresh: CirclePost[] = backendPosts
              .filter((p) => !have.has(p.id))
              .map((p) => ({
                id: p.id,
                type: 'experience' as CirclePostType,
                category: p.category,
                author: p.authorLabel,
                authorUserId: p.authorUserId ?? null,
                anonymous: p.anonymous,
                text: p.text,
                helpful: p.helpful,
                savedByMe: p.savedByMe === true,
                // Dizi boş kalır (detay senkronu ayrı) ama SAYI saklanır; ekranlar
                // artık `comments.length` yerine bunu okuyor.
                comments: [],
                commentCount: p.comments,
              }));
            return { circlePosts: fresh.length ? [...fresh, ...guncel] : guncel };
          });
        } catch {
          // Backend erişilemezse seed gönderilerle devam
        }
        // §12.10 — segmentine uyan toplu duyuruları bildirim listesine ekle (girişliyse)
        const token = get().token;
        if (!token) return;
        // §12.3 — kısıt durumu ve üyelik katmanı ARTIK BURADA ÇEKİLMİYOR:
        // `refreshMembership` zaten aynı `/me` ucunu çağırıyordu ve açılışta
        // İKİ ÖZDEŞ istek gidiyordu. Alanlar oraya taşındı.
        try {
          // §14.5 — kullanıcı dilinde. Yukarıdaki tek turda çekildi.
          if (annsR.status === 'rejected') throw annsR.reason;
          const anns = annsR.value ?? [];
          set((s) => {
            const have = new Set(s.notifications.map((n) => n.id));
            const fresh: AppNotification[] = anns
              .filter((a) => !have.has(`ann-${a.id}`))
              .map((a) => ({
                id: `ann-${a.id}`,
                type: 'system' as const,
                title: a.title,
                body: a.body,
                dateLabel: new Date(a.createdAt).toLocaleDateString('tr-TR'),
                icon: 'megaphone-outline',
                read: false,
                createdAt: new Date(a.createdAt).getTime(), // §5.7 — 30 gün temizlik için
              }));
            return fresh.length ? { notifications: [...fresh, ...s.notifications] } : {};
          });
        } catch {
          // Duyuru çekilemezse sessizce geç
        }
      },
      careRoutines: [],
      personalLogs: [],
      moments: [],
      favorites: [],
      following: [],
      followingIds: [],
      followerNames: [],
      addresses: [],
      premium: false,
      platinum: false,
      reengagedIds: [],
      autoReengageEnabled: true,
      alwaysBonds: [],
      points: 0,
      raffleEntries: 0,
      pointsSpend: null, // çıkışta kilit durumu da sıfırlanır
      firstBookingBonusGiven: false,
      w2wLikeMonth: '',
      w2wLikePoints: 0,
      tier: null,
      ledger: [],
      userReviews: {},
      reviewAnonymous: true,
      surveyAskedIds: [],
      offersSeen: {},
      notifications: [],
      unreadMessages: 0,
      token: null,
      currentUser: null,
      sellerTrialStart: null,
      // Mevcut profilde başlangıç fotoğrafı (kullanıcı değiştirebilir/kaldırabilir)
      avatarUri: null,
      setAvatar: (uri) => {
        // KESİK PORTRE ESKİ FOTOĞRAFA AİTTİR ve burada KORUNUYORDU. Ana ekran
        // `cutoutUri ?? avatarUri` gösterdiği için, foto değiştirilince eski
        // yüz ekranda kalmaya devam ediyordu ("değiştirdim ama değişmedi").
        // Aynısı "fotoğrafı kaldır"da da oluyordu: foto silinip yüz kalıyordu.
        // Artık geçersiz kılınıyor; uygun kullanıcıda applyProfileCutout hemen
        // ardından yenisini üretiyor, üretemezse ham foto gösterilir (dürüst).
        set({ avatarUri: uri, cutoutUri: null, cutoutFor: null });
        // Foto HESABIN parçası: buluta da yaz (data URL ise) — diğer cihaz/girişte aynı görünür
        const token = get().token;
        const uid = get().currentUser?.id;
        if (uid) saveMediaCache(uid, { avatar: uri, cutout: null, cutoutFor: null });
        if (token) {
          if (uri == null || uri.startsWith('data:'))
            void api.setAvatar(token, uri).catch(() => undefined);
          // Bayat portre HESAPTAN da silinmeli; yoksa yeniden girişte geri gelir.
          void api.setCutoutRemote(token, null).catch(() => undefined);
        }
      },
      cutoutUri: null,
      cutoutFor: null,
      setCutout: (uri, forKey) => {
        set({ cutoutUri: uri, cutoutFor: forKey ?? null });
        // Kesik portre HESABIN parçası: buluta yaz → yeniden giriş/yeni cihazda kredi YAKMADAN geri gelir
        const token = get().token;
        const uid = get().currentUser?.id;
        if (uid)
          saveMediaCache(uid, { avatar: get().avatarUri, cutout: uri, cutoutFor: forKey ?? null });
        if (token && (uri == null || uri.startsWith('data:')))
          void api.setCutoutRemote(token, uri).catch(() => undefined);
      },
      applyProfileCutout: async (base64) => {
        // Bayrak stale olabilir (açılış config isteği o an düşmüş olabilir) → anında SUNUCUDAN tazele.
        let cfg = get().config;
        if (!cfg.features.removebg) {
          try {
            cfg = await api.appConfig();
            set({ config: cfg });
          } catch {
            /* çevrimdışı: mevcut bayrakla devam */
          }
        }
        if (!cfg.features.removebg) return 'unavailable';
        const role = get().currentUser?.role;
        const isSeller = role === 'professional' || role === 'salon';
        const tier = get().currentUser?.membershipTier ?? 'free';
        // §5.1.1 — cut-out portre uzman/salonun TEMEL sunumu → tier'dan bağımsız çalışır.
        // Müşteri avatarı için cut-out yalnız premium/platinum (loyalty perk).
        if (!isSeller && tier === 'free') return 'not_premium';
        const token = get().token;
        if (!token) return 'error';
        try {
          const { dataUrl } = await api.cutout(token, { imageB64: base64 });
          // Portre HANGİ FOTOĞRAFTAN üretildiğine bağlanır; bağ olmadan
          // bayatlığı anlamanın yolu yoktu.
          get().setCutout(dataUrl, medyaAnahtari(base64));
          return 'ok';
        } catch {
          return 'error';
        }
      },
      setSellerHours: (hours) => set({ sellerHours: hours }),
      sellerServices: seedSellerServices(),
      setSellerServices: (map) => {
        set({ sellerServices: map });
        // §9.5 — hizmet listesi HESABIN parçası: public profil de bundan beslenir
        const rows = Object.entries(map)
          .map(([id, r]) => {
            const svc = findServiceWithCategory(id);
            return {
              id,
              name: svc?.service.label.tr ?? id,
              price: Number(r.price) || 0,
              durationMin: Number(r.dur) || 60,
            };
          })
          .filter((x) => x.price > 0);
        void api.setMyServices(rows).catch(() => undefined);
      },
      sellerSocial: emptySocial,
      sellerHours: defaultHours(),
      sellerCerts: [],
      setSellerProfile: (p) => {
        set(() => ({
          ...(p.social ? { sellerSocial: p.social } : {}),
          ...(p.hours ? { sellerHours: p.hours } : {}),
          ...(p.certs ? { sellerCerts: p.certs } : {}),
        }));
        // §9.5 — çalışma saatleri HESAPTA (teklif slotları + public profil bunları kullanır)
        if (p.hours) void api.setMyHours(p.hours).catch(() => undefined);
        // §9.5 — sertifikalar HESAPTA (public profil certs alanı bundan beslenir)
        if (p.certs) void api.setMyCertificates(p.certs).catch(() => undefined);
      },
      // Sıfır-demo: salon profili BOŞ başlar — kayıtta/düzenlemede salon kendi doldurur
      salonProfile: {
        photos: [],
        about: '',
        address: '',
        contact: '',
        areas: [],
      },
      setSalonProfile: (p) => set((s) => ({ salonProfile: { ...s.salonProfile, ...p } })),

      setAuth: (session) => {
        set((s) => {
          // §11 — uzman/salon ise 3 günlük ücretsiz deneme sayacını başlat. Aynı kullanıcı tekrar
          // giriş yaparsa mevcut başlangıç korunur; farklı kullanıcı/rol için sıfırlanır.
          const isSeller = session.user.role === 'professional' || session.user.role === 'salon';
          const sameUser = s.currentUser?.id === session.user.id;
          const sellerTrialStart = isSeller
            ? sameUser && s.sellerTrialStart != null
              ? s.sellerTrialStart
              : Date.now()
            : null;
          // Faz B — FARKLI kullanıcı girişinde tüm kişisel dilimler sıfırlanır: tohumlar +
          // önceki kullanıcının persist edilen verileri (avatar/cutout/premium/sertifika)
          // yeni hesaba SIZMAZ. Gerçek veriler hydrate* ile dolar.
          const personalReset = sameUser
            ? {}
            : {
                ...userScopedReset(), // TAM gizlilik sıfırlaması (eksik alan = sızıntı)
                avatarUri: session.user.avatarUrl ?? null, // hesabın fotosu her cihazda
                cutoutUri: session.user.cutoutUrl ?? null, // kesik portre hesaptan (kredi yok)
              };
          setApiToken(session.token);
          return {
            token: session.token,
            currentUser: session.user,
            ...personalReset,
            // reset'in sellerTrialStart:null'unu EZMESİ için resetten SONRA yazılır
            sellerTrialStart,
            // aynı kullanıcı yeniden girdi + sunucuda foto varsa yereli tazele
            ...(sameUser && session.user.avatarUrl ? { avatarUri: session.user.avatarUrl } : {}),
            ...(sameUser && session.user.cutoutUrl ? { cutoutUri: session.user.cutoutUrl } : {}),
          };
        });
        void get().hydrateLoyalty();
        void get().hydrateBookings();
        void get().hydrateDemands();
      },
      markPhoneVerified: () =>
        set((s) =>
          s.currentUser ? { currentUser: { ...s.currentUser, phoneVerified: true } } : {},
        ),
      logout: () => {
        setApiToken(null);
        // GİZLİLİK — çıkışta kullanıcıya ait HER ŞEY bellekten ve persist'ten silinir;
        // sonraki üye (kayıt/giriş) sıfır durumla başlar.
        set({ token: null, currentUser: null, ...userScopedReset() });
      },

      setCity: (city) =>
        set((s) => (s.currentUser ? { currentUser: { ...s.currentUser, city } } : {})),

      // §9.5 — MÜŞTERİ profil güncelleme: anında uygulanır (currentUser persist edilir).
      // Salon/uzman DEĞİL — onların değişikliği admin onayına gider (submitProfileChange).
      updateMyProfile: (patch) => {
        // Yerel önce: kullanıcı değişikliği ANINDA görsün.
        set((s) => (s.currentUser ? { currentUser: { ...s.currentUser, ...patch } } : {}));
        // SUNUCUYA DA YAZ. Eskiden yalnız yerel güncelleniyordu; uygulama
        // yeniden açılınca hydrate sunucudaki eski adı geri getiriyor ve
        // düzenleme kaybolmuş görünüyordu.
        const token = get().token;
        if (!token) return;
        const gonder: { name?: string; city?: string } = {};
        if (typeof patch.name === 'string') gonder.name = patch.name;
        if (typeof patch.city === 'string') gonder.city = patch.city;
        if (Object.keys(gonder).length === 0) return;
        void api
          .updateMyProfileRemote(token, gonder)
          // Sunucu reddederse yereli SUNUCU GERÇEĞİNE çek — UI yalan durumda kalmaz.
          .then((u) => set({ currentUser: u }))
          .catch(() => {
            // Yazma başarısızsa yereli sunucudakiyle değiştir.
            void api
              .me(token)
              .then((u) => set({ currentUser: u }))
              .catch(() => undefined);
          });
      },

      // §profil-onay — SALON/UZMAN değişikliğini admin onay kuyruğuna gönderir (yerelde UYGULANMAZ)
      submitProfileChange: async (changes) => {
        const token = get().token;
        if (!token) return;
        await api.submitProfileChange(changes, token);
      },
      // Admin onayladıysa onaylı değişiklikleri yerelde uygula (app açılışında çağrılır)
      applyApprovedProfileChanges: async () => {
        const token = get().token;
        if (!token) return;
        try {
          const req = await api.myProfileChange(token);
          if (!req || req.status !== 'approved') return;
          const c = req.changes as Record<string, unknown>;
          if (typeof c.name === 'string' && c.name.trim()) {
            set((s) =>
              s.currentUser ? { currentUser: { ...s.currentUser, name: c.name as string } } : {},
            );
          }
          const sp: { social?: SocialValue; hours?: DayHours[]; certs?: string[] } = {};
          if (c.social) sp.social = c.social as SocialValue;
          if (c.hours) sp.hours = c.hours as DayHours[];
          if (c.certs) sp.certs = c.certs as string[];
          if (Object.keys(sp).length) get().setSellerProfile(sp);
          if (c.salonProfile)
            get().setSalonProfile(c.salonProfile as Partial<State['salonProfile']>);
        } catch {
          // erişilemezse yoksay
        }
      },

      addBooking: (input) => {
        const id = nextId('bk');
        const booking: Appointment = {
          id,
          source: input.source,
          service: input.service,
          proId: input.proId,
          proName: input.proName,
          proImage: input.proImage,
          ...(input.uzmanName ? { uzmanName: input.uzmanName } : {}),
          ...(input.offerId ? { offerId: input.offerId } : {}),
          startMs: input.startMs,
          durationMin: input.durationMin,
          price: input.price,
          // §1.6 — yeni randevu uzman onayı bekler
          status: input.status ?? 'awaiting_provider',
          // §4.1.3 — uzman yanıt son anı (yalnız onay bekleyen taleplerde)
          ...((input.status ?? 'awaiting_provider') === 'awaiting_provider'
            ? { responseDeadline: Date.now() + RESPONSE_WINDOW_MS }
            : {}),
        };
        set((s) => ({ bookings: [booking, ...s.bookings] }));
        // Backend'e yaz — başarısızsa kuyrukta kalır, flushBookingSync yeniden dener (veri kaybı yasağı)
        get().syncBooking(booking);
        get().pushNotification({
          type: 'booking',
          titleKey: 'notif.booking_sent',
          bodyKey: 'notif.booking_sent_b',
          params: { pro: input.proName, slot: formatSlotTr(input.startMs) },
          dateLabel: 'Az önce',
          icon: 'calendar-outline',
          route: `/booking/${id}`,
        });
        return id;
      },

      // §4.6/§10.2 — SALON offline randevu ekler → ilgili UZMANIN ONAYINA gider (awaiting_provider) + bildirim.
      // Salon silemez; her ekleme uzmana bildirimle düşer, uzman panelinde Kabul/Reddet ile teyit eder.
      salonAddOffline: (input) => {
        const id = nextId('sof');
        const booking: Appointment = {
          id,
          source: 'direct',
          service: input.service,
          proId: '',
          proName: input.salonName,
          proImage: '',
          uzmanName: input.uzmanName,
          customerName: input.customerName,
          ...(input.customerPhone ? { customerPhone: input.customerPhone } : {}),
          startMs: input.startMs,
          durationMin: input.durationMin,
          // §10 — salon KENDİ aldığı offline randevuda ücreti belirler (uzman fee'yi bilir). Uzmanın
          // KENDİ (app/offline) işlerinin fiyatı salona kapalıdır; bu istisna yalnız salon-oluşturma içindir.
          price: input.price,
          status: 'awaiting_provider', // uzman onayı bekliyor (§4.6)
          responseDeadline: Date.now() + RESPONSE_WINDOW_MS,
          bySalon: true, // §10 — salon panelinde yalnız salonun aldığı randevular görünür
        };
        set((s) => ({ bookings: [booking, ...s.bookings] }));
        get().syncBooking(booking);
        get().pushNotification({
          type: 'booking',
          audience: 'seller',
          titleKey: 'notif.salon_offline_pending',
          bodyKey: 'notif.salon_offline_pending_b',
          params: { uzman: input.uzmanName, slot: formatSlotTr(input.startMs) },
          dateLabel: 'Az önce',
          icon: 'time-outline',
          route: `/booking/${id}`,
        });
        return id;
      },

      // §11 — premium uzman otomatik geri-çağırmayı aç/kapat eder
      setAutoReengage: (v) => {
        set({ autoReengageEnabled: v });
        const token = get().token;
        if (token) void api.savePrefs(token, { autoReengage: v }).catch(() => undefined);
      },

      // §10/§4/§11 — SİSTEM OTOMATİK geri çağırma: premium + toggle açık uzmanda.
      // KURAL (spam önleme): yalnız TAM İKİ bildirim — periyot bitişine 1 gün kala ('pre')
      // ve bitiş günü ('due'). Ne öncesi ne sonrası; alakasız zamanlarda GÖNDERİLMEZ.
      /**
       * ARTIK SUNUCUDA — bu eylem yalnız GERİYE UYUM için duruyor.
       *
       * Eski hâli tamamen kurguydu: `SELLER_PAST_CLIENTS` yani SEED verisi
       * üzerinde dönüyor, gerçek müşterilere hiç bakmıyordu; ürettiği
       * bildirim YERELDİ, yani uzmanın kendi cihazında görünüyor müşteriye
       * ulaşmıyordu; üstelik yalnız uzman uygulamayı AÇTIĞINDA çalışıyordu —
       * periyot o gün dolarsa hatırlatma hiç gitmiyordu.
       *
       * Gönderimi sunucu zamanlayıcısı yapıyor (saatte bir, gerçek
       * randevulardan, gerçek push ile). Çağıranları kırmamak için imza
       * korundu; gövde bilerek boş.
       */
      runAutoReengage: () => undefined,

      sendReengage: () => undefined,

      // §11 — PLATINUM paket aç/kapat (satın alma). Komisyon oranını da etkiler (%10 → %8,5).
      setPlatinum: (v) => set({ platinum: v, ...(v ? { premium: true } : {}) }), // platinum → premium da açık

      // §11 — ALWAYS bağ isteği aç (karşı taraf kabul edene kadar 'pending')
      requestAlways: (input) => {
        // Sunucuya YALNIZ `proId` gidiyor: karşı tarafın kullanıcı kimliğini
        // sunucu buluyor. İstemcinin gönderdiği kimliğe güvenmek, başkası
        // adına bağ kurdurmak olurdu.
        const token = get().token;
        if (!token || !input.proId) return;
        void api
          .requestAlways(token, input.proId, input.lastServiceId)
          .then((b) =>
            set((s) => ({
              // Sunucu mevcut bağı da döndürebilir (tekrar istek yeni satır
              // açmaz) — kimliğe göre birleştiriyoruz, kopya oluşmasın.
              alwaysBonds: [b, ...s.alwaysBonds.filter((x) => x.id !== b.id)],
            })),
          )
          .catch(() => undefined);
      },

      // §11 — gelen ALWAYS isteğini kabul et → bağ kurulur
      acceptAlways: (id) => {
        const onceki = get().alwaysBonds;
        set((s) => ({
          alwaysBonds: s.alwaysBonds.map((b) => (b.id === id ? { ...b, status: 'accepted' } : b)),
        }));
        const token = get().token;
        if (!token) return;
        // Sunucu reddederse geri al: kullanıcı kabul ettiğini sanıp toplu
        // bildirim beklerse, hiç kurulmamış bir bağa güvenmiş olur.
        void api.acceptAlways(token, id).catch(() => set({ alwaysBonds: onceki }));
      },

      // §11 — gelen isteği reddet / bağı kaldır. İKİSİ DE aynı işlem:
      // sunucuda satır siliniyor. "Reddedildi" durumu saklamak, karşı tarafın
      // göremediği sessiz bir kara liste tutmak olurdu.
      declineAlways: (id) => get().removeAlways(id),
      removeAlways: (id) => {
        const onceki = get().alwaysBonds;
        set((s) => ({ alwaysBonds: s.alwaysBonds.filter((b) => b.id !== id) }));
        const token = get().token;
        if (!token) return;
        void api.removeAlways(token, id).catch(() => set({ alwaysBonds: onceki }));
      },

      // §11 — PLATINUM toplu bildirim: Always listesindeki (kabul edilmiş) müşterilere.
      // SORUMLULUK: içerik uzman/salona aittir (sözleşme §sorumluluk). Kaç alıcıya gittiğini döndürür.
      sendAlwaysBroadcast: async (input) => {
        // Gönderim SUNUCUDA. Eskiden yerel tek bir "özet bildirim"
        // üretiliyordu — hiçbir müşteriye ulaşmıyordu, yalnız gönderenin
        // kendi cihazında görünüyordu. Uzman "gönderdim" sanıyordu.
        //
        // Platinum kapısı da sunucuda: istemcideki `if (!platinum)` kapı
        // değildir, uç doğrudan çağrılabilir.
        const token = get().token;
        if (!token) return 0;
        try {
          const r = await api.broadcastAlways(token, input.title, input.body);
          return r.sent;
        } catch {
          return 0;
        }
      },

      // §4.4 — kullanıcı iptali: depozito ödendiyse ve >3 saat varsa iade akışı (refund_pending);
      // depozito ödendi + geç iptal (≤3 saat) → kapora yanar; depozito yoksa düz iptal.
      cancelBooking: (id, reason) => {
        const b = get().bookings.find((x) => x.id === id);
        const hasDeposit = b?.status === 'confirmed' || b?.status === 'deposit_submitted';
        const free = b ? b.startMs - Date.now() > FREE_CANCEL_WINDOW_MS : true;
        const next: Appointment['status'] = hasDeposit && free ? 'refund_pending' : 'cancelled';
        const forfeited = hasDeposit && !free;
        set((s) => ({
          bookings: s.bookings.map((x) =>
            x.id === id
              ? {
                  ...x,
                  status: next,
                  cancelReason: reason,
                  ...(forfeited ? { depositForfeited: true } : {}),
                }
              : x,
          ),
        }));
        // §4.4 — backend'de doğru geçiş: iade akışı → free-cancel; aksi → düz iptal
        // Sunucu reddederse yereli SUNUCU GERÇEĞİNE geri çek (UI asla yalan durumda kalmaz)
        const restore = () => void get().hydrateBookings();
        if (next === 'refund_pending') void api.freeCancelBooking(id, reason).catch(restore);
        else void api.cancelBooking(id, reason).catch(restore);
        if (b) {
          if (next === 'refund_pending')
            get().pushNotification({
              type: 'booking',
              titleKey: 'notif.cancel_refund',
              bodyKey: 'notif.cancel_refund_b',
              params: { pro: b.proName },
              dateLabel: 'Az önce',
              icon: 'return-up-back-outline',
              route: `/booking/${id}`,
            });
          else if (forfeited)
            get().pushNotification({
              type: 'booking',
              titleKey: 'notif.late_cancel',
              bodyKey: 'notif.late_cancel_b',
              // Yanan tutar randevunun kendi kaporası; sabit 1.000 ₸ değil (K1).
              params: {
                pro: b.proName,
                deposit: b.depositAmount ?? localDeposit(b.price, get().config.rates),
              },
              dateLabel: 'Az önce',
              icon: 'alert-circle-outline',
              route: `/booking/${id}`,
            });
        }
      },

      // §4.4 — uzman iade dekontunu yükler → kullanıcı "aldım" onayı beklenir
      uploadRefundReceipt: (id, receiptUri) => {
        set((s) => ({
          bookings: s.bookings.map((b) =>
            b.id === id ? { ...b, status: 'refund_submitted', refundReceiptUri: receiptUri } : b,
          ),
        }));
        void api.uploadRefundReceiptApi(id, receiptUri).catch(() => undefined); // §4.4 backend
        const b = get().bookings.find((x) => x.id === id);
        // §12.4 — iade dekontu admin anlaşmazlık kuyruğuna düşer (dekont görseliyle)
        const token = get().token;
        if (b && token)
          void api
            .fileDispute(token, {
              bookingRef: id,
              proName: b.proName,
              service: b.service,
              kind: 'refund',
              amount: b.depositAmount ?? 0,
              receiptUri,
            })
            .catch(() => undefined);
        if (b)
          get().pushNotification({
            type: 'booking',
            titleKey: 'notif.refund_uploaded',
            bodyKey: 'notif.refund_uploaded_b',
            params: { pro: b.proName },
            dateLabel: 'Az önce',
            icon: 'receipt-outline',
            route: `/booking/${id}`,
          });
      },

      // §4.4 — kullanıcı iadeyi aldı → kayıt kapanır
      confirmRefund: (id) => {
        set((s) => ({
          bookings: s.bookings.map((b) => (b.id === id ? { ...b, status: 'cancelled' } : b)),
        }));
        void api.confirmRefundApi(id).catch(() => undefined); // §4.4 backend
      },

      // §4.4 — taraflar itiraz açar (destek/admin kuyruğuna düşer)
      disputeBooking: (id) => {
        set((s) => ({
          bookings: s.bookings.map((b) => (b.id === id ? { ...b, status: 'disputed' } : b)),
        }));
        void api.disputeBookingApi(id).catch(() => undefined); // §4.4 backend durum geçişi
        const b = get().bookings.find((x) => x.id === id);
        // §12.4 — itiraz backend anlaşmazlık kuyruğuna düşer (varsa depozito dekontuyla)
        const token = get().token;
        if (b && token)
          void api
            .fileDispute(token, {
              bookingRef: id,
              proName: b.proName,
              service: b.service,
              kind: 'deposit',
              amount: b.depositAmount ?? 0,
              ...(b.receiptUri ? { receiptUri: b.receiptUri } : {}),
              note: 'Kullanıcı itirazı',
            })
            .catch(() => undefined);
        if (b)
          get().pushNotification({
            type: 'booking',
            titleKey: 'notif.dispute',
            bodyKey: 'notif.dispute_b',
            params: { pro: b.proName },
            dateLabel: 'Az önce',
            icon: 'flag-outline',
            route: `/booking/${id}`,
          });
      },

      // §4.1 adım 6 — onaylı randevular için 24s ve 2s hatırlatmaları (idempotent, bayrakla)
      checkReminders: () => {
        // §7 — hizmet bitiminden 3 SAAT sonra değerlendirme anketi (tek sefer; puan uzmana işler)
        {
          const now = Date.now();
          const asked = get().surveyAskedIds;
          const due = get().bookings.filter(
            (b) =>
              b.status === 'completed' &&
              !asked.includes(b.id) &&
              now >= b.startMs + b.durationMin * 60_000 + 3 * 60 * 60_000,
          );
          if (due.length > 0) {
            set((s) => ({ surveyAskedIds: [...s.surveyAskedIds, ...due.map((b) => b.id)] }));
            for (const b of due)
              get().pushNotification({
                type: 'booking',
                titleKey: 'survey.title',
                bodyKey: 'survey.body',
                params: { pro: b.proName },
                dateLabel: 'Az önce',
                icon: 'star-outline',
                route: `/review/new?bookingId=${b.id}`,
              });
          }
        }

        if (!get().notifPrefs.booking) return; // §5.4 — randevu bildirimleri kapalıysa üretme
        set((s) => {
          const now = Date.now();
          const news: AppNotification[] = [];
          const bookings = s.bookings.map((b) => {
            if (b.status !== 'confirmed') return b;
            const left = b.startMs - now;
            if (left <= 0) return b;
            let nb = b;
            if (left <= REMIND_24H_MS && !b.reminded24) {
              news.push({
                id: nextId('n'),
                type: 'booking',
                titleKey: 'notif.remind_24',
                bodyKey: 'notif.remind_24_b',
                params: { pro: b.proName, slot: formatSlotTr(b.startMs) },
                dateLabel: 'Az önce',
                icon: 'alarm-outline',
                read: false,
                route: `/booking/${b.id}`,
              });
              nb = { ...nb, reminded24: true };
            }
            if (left <= REMIND_2H_MS && !nb.reminded2) {
              news.push({
                id: nextId('n'),
                type: 'booking',
                titleKey: 'notif.remind_2',
                bodyKey: 'notif.remind_2_b',
                params: { pro: b.proName, slot: formatSlotTr(b.startMs) },
                dateLabel: 'Az önce',
                icon: 'alarm-outline',
                read: false,
                route: `/booking/${b.id}`,
              });
              nb = { ...nb, reminded2: true };
            }
            return nb;
          });
          if (news.length === 0) return {};
          return { bookings, notifications: [...news, ...s.notifications] };
        });
      },

      // §4.6 — günü kapalı/açık işaretle (izin/tatil). Kullanıcı tarafında kapalı gün slot göstermez.
      toggleClosedDay: (dayStartMs) => {
        set((s) => ({
          closedDays: s.closedDays.includes(dayStartMs)
            ? s.closedDays.filter((d) => d !== dayStartMs)
            : [...s.closedDays, dayStartMs],
        }));
        // §4.6 — izin günleri HESAPTA (kullanıcı tarafı slotları da bunlara göre kapanır)
        void api.setMyClosedDays(get().closedDays).catch(() => undefined);
      },

      // §10.1/§12.7 — promosyon oluştur → admin onayına düşer (status 'pending')
      createPromotion: (input) =>
        set((s) => ({
          promotions: [
            {
              id: nextId('promo'),
              title: input.title.trim(),
              desc: input.desc.trim(),
              ...(input.discountPct ? { discountPct: input.discountPct } : {}),
              startLabel: input.startLabel,
              endLabel: input.endLabel,
              ...(input.imageUri ? { imageUri: input.imageUri } : {}),
              status: 'pending' as const,
              createdAt: Date.now(),
            },
            ...s.promotions,
          ],
        })),

      // §5.2 — teklif/talep aç: aynı şehirdeki kategori uzmanlarından mock teklifler üretir
      // §5.2 Faz A — talep BULUTA açılır; aynı şehirdeki uzmanlara GERÇEK push gider.
      // Sahte teklif üretimi YOK: teklifler yalnızca gerçek uzmanlardan gelir.
      createDemand: async (input) => {
        const token = get().token;
        if (!token) return null;
        try {
          const demand = await api.createQuoteRequest(token, {
            category: input.category,
            mode: input.mode,
            ...(input.note ? { note: input.note } : {}),
            ...(input.photoDataUrl ? { photoDataUrl: input.photoDataUrl } : {}),
            ...(input.budget ? { budget: input.budget } : {}),
            collectMin: input.collectMin,
            ...(input.serviceId ? { serviceId: input.serviceId } : {}),
            ...(input.preferredSlots?.length ? { preferredSlots: input.preferredSlots } : {}),
          });
          set((s) => ({ demands: [demand, ...s.demands.filter((d) => d.id !== demand.id)] }));
          // Müşteri tarafı: teklif toplama başladı (uygulama-içi bildirim)
          get().pushNotification({
            type: 'quote',
            audience: 'user',
            titleKey: 'notif.offers_started',
            bodyKey: 'notif.offers_started_b',
            params: { n: 0 },
            dateLabel: 'Az önce',
            icon: 'pricetags-outline',
            route: `/quote/results?id=${demand.id}`,
          });
          return demand.id;
        } catch {
          return null; // ekran kullanıcıya hata gösterir; sahte veriye DÜŞÜLMEZ
        }
      },

      // §5.2 Faz A — taleplerim + gelen teklifler buluttan (girişli hesapta tek gerçek kaynak)
      hydrateDemands: async () => {
        const token = get().token;
        if (!token) {
          set({ demandsLoading: false });
          return;
        }
        set({ demandsLoading: true });
        try {
          const remote = await api.myQuoteRequests(token);
          // Sunucudakiler esas — yerel artıklar kullanıcının Taleplerim'ine karışmaz.
          set(() => ({ demands: remote }));
        } catch {
          // çevrimdışı: eldeki liste korunur
        } finally {
          // Hata da olsa inmeli; yoksa sunucu kapalıyken sonsuz iskelet.
          set({ demandsLoading: false });
        }
      },

      // Açılışta: son kapanıştan beri YENİ teklif geldiyse say + görüldü olarak işaretle
      takeNewOffers: () => {
        const seen = get().offersSeen;
        let count = 0;
        let demandId: string | null = null;
        const nextSeen: Record<string, number> = { ...seen };
        for (const d of get().demands) {
          const fresh = Math.max(0, d.offers.length - (seen[d.id] ?? 0));
          if (fresh > 0 && d.status === 'collecting') {
            count += fresh;
            if (!demandId) demandId = d.id;
          }
          nextSeen[d.id] = d.offers.length;
        }
        set({ offersSeen: nextSeen });
        return { count, demandId };
      },

      // §5.2 Faz A — seçim BULUTTA: randevu sunucuda doğar (deposit_pending), kazanan uzmana
      // ve seçilmeyenlere GERÇEK push sunucudan gider.
      selectOffer: async (demandId, offerId, slotMs) => {
        const token = get().token;
        if (!token) return null;
        try {
          const res = await api.selectQuote(token, demandId, { quoteId: offerId, slotMs });
          set((s) => ({
            demands: s.demands.map((d) =>
              d.id === demandId ? { ...d, status: 'booked', bookedOfferId: offerId } : d,
            ),
          }));
          // Randevu listesi sunucudan tazelensin (yeni booking düşsün)
          void get().hydrateBookings();
          return res.bookingId;
        } catch {
          return null;
        }
      },

      // §5.2 Faz A — teklif BULUTA gider (api.submitQuote); yerelde yalnız bildirim düşer.
      // Talep havuzu seller/requests ekranında doğrudan API'den beslendiği için burada
      // demands listesine yazmayız (uzman kendi teklifini havuzda 'myQuoteId' ile görür).
      submitOffer: async (demandId, offer) => {
        const token = get().token;
        if (!token) return false;
        try {
          await api.submitQuote(token, demandId, offer);
          get().pushNotification({
            type: 'quote',
            titleKey: 'notif.offer_sent',
            bodyKey: 'notif.offer_sent_b',
            dateLabel: 'Az önce',
            icon: 'pricetag-outline',
          });
          return true;
        } catch {
          return false;
        }
      },

      // §5.4 — bildirim grubunu aç/kapa
      toggleNotifPref: (key) => {
        const sonraki = !get().notifPrefs[key];
        set((s) => ({ notifPrefs: { ...s.notifPrefs, [key]: sonraki } }));
        const token = get().token;
        if (token) void api.savePrefs(token, { notif: { [key]: sonraki } }).catch(() => undefined);
      },

      setDemandNotif: (p) => {
        set((s) => ({ demandNotif: { ...s.demandNotif, ...p } }));
        const token = get().token;
        if (token)
          void api
            .savePrefs(token, { demand: p as unknown as Record<string, unknown> })
            .catch(() => undefined);
      },

      // §5.1.2 — son aramaya ekle (en yeni başta, dedup, maks 8)
      addRecentSearch: (q) => {
        const term = q.trim();
        if (!term) return;
        set((s) => ({
          recentSearches: [term, ...s.recentSearches.filter((x) => x !== term)].slice(0, 8),
        }));
      },

      // §4.3 — dekont yükleme süresi dolan deposit_pending randevular otomatik düşer (slot açılır)
      expireDeposits: () => {
        const now = Date.now();
        const expired = get().bookings.filter(
          (b) =>
            b.status === 'deposit_pending' && b.depositDeadline != null && b.depositDeadline <= now,
        );
        if (expired.length === 0) return;
        set((s) => ({
          bookings: s.bookings.map((b) =>
            expired.some((e) => e.id === b.id) ? { ...b, status: 'cancelled' } : b,
          ),
        }));
        for (const b of expired)
          get().pushNotification({
            type: 'booking',
            titleKey: 'notif.deposit_expired',
            bodyKey: 'notif.deposit_expired_b',
            params: { pro: b.proName },
            dateLabel: 'Az önce',
            icon: 'time-outline',
            route: `/booking/${b.id}`,
          });
      },

      // §4.1.3 — uzman belirlenen sürede yanıtlamadıysa talep otomatik düşer + kullanıcıya bildirim
      expireResponses: () => {
        const now = Date.now();
        const expired = get().bookings.filter(
          (b) =>
            b.status === 'awaiting_provider' &&
            b.responseDeadline != null &&
            b.responseDeadline <= now,
        );
        if (expired.length === 0) return;
        set((s) => ({
          bookings: s.bookings.map((b) =>
            expired.some((e) => e.id === b.id)
              ? { ...b, status: 'cancelled', cancelReason: 'response_timeout' }
              : b,
          ),
        }));
        for (const b of expired)
          get().pushNotification({
            type: 'booking',
            titleKey: 'notif.response_expired',
            bodyKey: 'notif.response_expired_b',
            params: { pro: b.proName },
            dateLabel: 'Az önce',
            icon: 'time-outline',
            route: `/booking/${b.id}`,
          });
      },

      // §5.2 — süresi dolan (teklif toplanan) talepleri işaretle
      expireDemands: () =>
        set((s) => {
          const now = Date.now();
          let changed = false;
          const demands = s.demands.map((d) => {
            if (d.status === 'collecting' && d.expiresAt <= now) {
              changed = true;
              return { ...d, status: 'expired' as const };
            }
            return d;
          });
          return changed ? { demands } : {};
        }),

      // §4.5 — uzman kadrodan çıkınca gelecek randevuları yeni uzmana devret (SESSİZ SİLME YASAK):
      // her randevu reassigned_pending olur, kullanıcı yeniden onaylar. Devredilen sayıyı döndürür.
      reassignStaffBookings: (oldUzman, newUzman) => {
        const now = Date.now();
        const affected = get().bookings.filter(
          (b) =>
            b.uzmanName === oldUzman &&
            b.startMs > now &&
            (b.status === 'confirmed' ||
              b.status === 'deposit_pending' ||
              b.status === 'deposit_submitted' ||
              b.status === 'awaiting_provider'),
        );
        if (affected.length === 0) return 0;
        set((s) => ({
          bookings: s.bookings.map((b) =>
            affected.some((a) => a.id === b.id)
              ? {
                  ...b,
                  status: 'reassigned_pending',
                  reassignedFrom: oldUzman,
                  uzmanName: newUzman,
                }
              : b,
          ),
        }));
        // SUNUCUYA YAZ: devretme yalnız yereldeydi, salon uygulamayı kapatıp
        // açınca randevular eski uzmanda görünüyordu ve müşteriye giden onay
        // isteği hiç var olmuyordu.
        const token = get().token;
        if (token)
          for (const b of affected)
            void api.reassignBooking(token, b.id, newUzman).catch(() => undefined);
        for (const b of affected)
          get().pushNotification({
            type: 'booking',
            titleKey: 'notif.reassigned',
            bodyKey: 'notif.reassigned_b',
            params: { pro: b.proName, old: oldUzman, new: newUzman },
            dateLabel: 'Az önce',
            icon: 'swap-horizontal-outline',
            route: `/booking/${b.id}`,
          });
        return affected.length;
      },

      // §4.5 — kullanıcı yeni uzmanı kabul eder → randevu tekrar onaylı
      acceptReassignment: (id) => {
        const onceki = get().bookings.find((b) => b.id === id);
        set((s) => ({
          bookings: s.bookings.map((b) =>
            b.id === id ? { ...b, status: 'confirmed', reassignedFrom: undefined } : b,
          ),
        }));
        // SUNUCUYA YAZ: durum yalnız yereldeydi, hydrate eski hâli geri
        // getiriyordu — müşteri onayladığını sanıyor, randevu onaysız kalıyordu.
        const token = get().token;
        if (!token || !onceki) return;
        void api.acceptReassignApi(token, id).catch(() => {
          set((s) => ({ bookings: s.bookings.map((b) => (b.id === id ? onceki : b)) }));
        });
      },

      // §4.5 — kullanıcı reddeder → iptal (depozito ödediyse iade akışı ayrıca yürür)
      // §4.5 — kullanıcı yeni uzmanı reddeder. Depozito ödediyse KUSURSUZ iptal (uzman ayrıldı)
      // → iade akışı; ödemediyse düz iptal. (Önceki hata: her koşulda kapora yakılıyordu.)
      rejectReassignment: (id) => {
        const b = get().bookings.find((x) => x.id === id);
        const paid = b?.status === 'reassigned_pending' && b.depositAmount != null;
        set((s) => ({
          bookings: s.bookings.map((x) =>
            x.id === id
              ? { ...x, status: paid ? 'refund_pending' : 'cancelled', reassignedFrom: undefined }
              : x,
          ),
        }));
        // SUNUCUYA YAZ. Bu bir PARA kararı: kapora iade mi edilecek yoksa
        // randevu düz mü iptal olacak? Kararı istemci veriyordu ve sunucuya hiç
        // ulaşmıyordu. Sunucuda kapora ASLA yanmaz — değişiklik müşteriden
        // değil sağlayıcıdan geldi.
        const token = get().token;
        if (!token || !b) return;
        void api.rejectReassignApi(token, id).catch(() => {
          set((s) => ({ bookings: s.bookings.map((x) => (x.id === id ? b : x)) }));
        });
      },

      // §1.6/§4.1 — kullanıcı uzmanın önerdiği alternatif saati kabul eder → DEPOZİTO adımı
      // (Önceki hata: doğrudan 'confirmed' yapıp depozitoyu atlıyordu.)
      acceptAlternative: (id) => {
        set((s) => ({
          bookings: s.bookings.map((b) =>
            b.id === id
              ? {
                  ...b,
                  status: 'deposit_pending',
                  depositAmount: localDeposit(b.price, s.config.rates),
                  depositDeadline: depositDeadlineFor(b.proposedStartMs ?? b.startMs, Date.now()),
                  startMs: b.proposedStartMs ?? b.startMs,
                  proposedStartMs: undefined,
                }
              : b,
          ),
        }));
        void api.acceptBooking(id).catch(() => undefined);
        const b = get().bookings.find((x) => x.id === id);
        if (b)
          get().pushNotification({
            type: 'booking',
            titleKey: 'notif.alt_approved',
            bodyKey: 'notif.alt_approved_b',
            params: {
              pro: b.proName,
              slot: formatSlotTr(b.startMs),
              deposit: b.depositAmount ?? localDeposit(b.price, get().config.rates),
            },
            dateLabel: 'Az önce',
            icon: 'card-outline',
            route: `/booking/${id}`,
          });
      },

      // §4.1 adım 4 — uzman kabul etti → depozito adımı açılır (§4.3)
      approveBooking: (id) => {
        set((s) => ({
          bookings: s.bookings.map((b) =>
            b.id === id
              ? {
                  ...b,
                  status: 'deposit_pending',
                  respondedAt: Date.now(),
                  depositAmount: localDeposit(b.price, s.config.rates),
                  depositDeadline: depositDeadlineFor(b.startMs, Date.now()),
                }
              : b,
          ),
        }));
        void api.approveBooking(id).catch(() => undefined);
        const b = get().bookings.find((x) => x.id === id);
        if (b)
          get().pushNotification({
            type: 'booking',
            titleKey: 'notif.pre_approved',
            bodyKey: 'notif.pre_approved_b',
            params: {
              pro: b.proName,
              slot: formatSlotTr(b.startMs),
              deposit: b.depositAmount ?? localDeposit(b.price, get().config.rates),
            },
            dateLabel: 'Az önce',
            icon: 'card-outline',
            route: `/booking/${id}`,
          });
      },

      // §4.1 — uzman reddetti
      rejectBooking: (id) => {
        set((s) => ({
          bookings: s.bookings.map((b) =>
            b.id === id ? { ...b, status: 'cancelled', respondedAt: Date.now() } : b,
          ),
        }));
        void api.cancelBooking(id, 'provider_rejected').catch(() => undefined);
        const b = get().bookings.find((x) => x.id === id);
        if (b)
          get().pushNotification({
            type: 'booking',
            titleKey: 'notif.rejected',
            bodyKey: 'notif.rejected_b',
            params: { pro: b.proName },
            dateLabel: 'Az önce',
            icon: 'close-circle-outline',
            route: `/booking/${id}`,
          });
      },

      // §4.1 adım 2 — uzman alternatif saat önerir (boş slotundan seçer)
      rescheduleBooking: (id, startMs) => {
        // §4.4 retention — iptal yerine: randevu korunur, yeni saat uzman onayına gider
        set((s) => ({
          bookings: s.bookings.map((b) =>
            b.id === id
              ? {
                  ...b,
                  startMs,
                  status: 'awaiting_provider',
                  responseDeadline: Date.now() + RESPONSE_WINDOW_MS,
                }
              : b,
          ),
        }));
        void api.counterBooking(id, startMs).catch(() => undefined);
        get().pushNotification({
          type: 'booking',
          titleKey: 'notif.reschedule',
          bodyKey: 'notif.reschedule_b',
          dateLabel: 'Az önce',
          icon: 'time-outline',
          route: `/booking/${id}`,
        });
      },

      proposeAlternative: (id, startMs) => {
        set((s) => ({
          bookings: s.bookings.map((b) =>
            b.id === id
              ? {
                  ...b,
                  status: 'alternative_proposed',
                  proposedStartMs: startMs,
                  respondedAt: Date.now(),
                }
              : b,
          ),
        }));
        void api.proposeBooking(id, startMs).catch(() => undefined);
        const b = get().bookings.find((x) => x.id === id);
        if (b)
          get().pushNotification({
            type: 'booking',
            titleKey: 'notif.alt_proposed',
            bodyKey: 'notif.alt_proposed_b',
            params: { pro: b.proName, slot: formatSlotTr(startMs) },
            dateLabel: 'Az önce',
            icon: 'time-outline',
            route: `/booking/${id}`,
          });
      },

      // §4.3 adım 2 — kullanıcı depozito dekontunu yükler → uzman onayı beklenir
      submitReceipt: (id, receiptUri) => {
        set((s) => ({
          bookings: s.bookings.map((b) =>
            b.id === id ? { ...b, status: 'deposit_submitted', receiptUri } : b,
          ),
        }));
        void api.submitDepositReceipt(id, receiptUri).catch(() => undefined); // §4.2 backend
        const b = get().bookings.find((x) => x.id === id);
        if (b)
          get().pushNotification({
            type: 'booking',
            titleKey: 'notif.receipt_sent',
            bodyKey: 'notif.receipt_sent_b',
            params: { pro: b.proName },
            dateLabel: 'Az önce',
            icon: 'receipt-outline',
            route: `/booking/${id}`,
          });
      },

      // §4.3 adım 3 — uzman dekontu görür → "Aldım, onaylıyorum" → randevu KESİN
      confirmReceipt: (id) => {
        set((s) => ({
          bookings: s.bookings.map((b) => (b.id === id ? { ...b, status: 'confirmed' } : b)),
        }));
        void api.confirmDepositReceipt(id).catch(() => undefined); // §4.2 backend
        const b = get().bookings.find((x) => x.id === id);
        if (b)
          get().pushNotification({
            type: 'booking',
            titleKey: 'notif.confirmed',
            bodyKey: 'notif.confirmed_b',
            params: { pro: b.proName, slot: formatSlotTr(b.startMs) },
            dateLabel: 'Az önce',
            icon: 'checkmark-circle-outline',
            route: `/booking/${id}`,
          });
      },

      // §4.4 — uzman kullanıcıyı "gelmedi" işaretler → kapora uzmanda kalır (depositForfeited).
      // Kural: randevu saatinin üzerinden 1 saat geçmeden işaretlenemez (UI da gizler; bu son savunma).
      markNoShow: (id) => {
        const bk = get().bookings.find((b) => b.id === id);
        if (bk?.startMs && Date.now() < bk.startMs + 60 * 60 * 1000) return;
        set((s) => ({
          bookings: s.bookings.map((b) =>
            b.id === id ? { ...b, status: 'no_show', depositForfeited: true } : b,
          ),
        }));
        void api.noShowApi(id).catch(() => undefined); // buluta taşı (best-effort)
      },

      // §4.1.7 — uzman hizmeti tamamladı: randevu 'completed' + kullanıcıya değerlendirme daveti
      completeBooking: (id) => {
        const b = get().bookings.find((x) => x.id === id);
        if (!b || b.status === 'completed') return;
        set((s) => ({
          bookings: s.bookings.map((x) => (x.id === id ? { ...x, status: 'completed' } : x)),
        }));
        void api.completeBookingApi(id).catch(() => undefined); // backend'e taşı (best-effort)
        // §7.1 — yalnız AYNA (online) randevularında kullanıcıya değerlendirme daveti (offline'da müşteri hesabı yok)
        if (b.source !== 'direct')
          get().pushNotification({
            type: 'booking',
            titleKey: 'notif.review_invite',
            bodyKey: 'notif.review_invite_b',
            params: { pro: b.proName },
            dateLabel: 'Az önce',
            icon: 'star-outline',
            route: `/review/new?id=${id}`,
          });
      },

      // §4.4-b — UZMAN gelmedi: müşteriye 1.000 puan telafi (loyalty ledger) + uzman iade borçlu
      reportProviderNoShow: (id) => {
        const b = get().bookings.find((x) => x.id === id);
        if (!b || b.providerNoShow) return; // tekrar telafi verme
        set((s) => ({
          // Uzman iade etmekle yükümlü → refund_pending; kapora yanmaz
          bookings: s.bookings.map((x) =>
            x.id === id ? { ...x, status: 'refund_pending', providerNoShow: true } : x,
          ),
        }));
        // §4.4-b backend: iade akışı + 1000₸ uzmanın komisyon borcuna (best-effort)
        void api.providerNoShowApi(id).catch(() => undefined);
        // Telafi puanı — yerel + backend loyalty ledger (earn zaten api.earnPoints çağırır)
        get().earn(1000, 'rewards.earn.provider_noshow', b.proName);
        get().pushNotification({
          type: 'loyalty',
          titleKey: 'notif.provider_noshow',
          bodyKey: 'notif.provider_noshow_b',
          params: { pro: b.proName },
          dateLabel: 'Az önce',
          icon: 'gift-outline',
          route: `/booking/${id}`,
        });
      },

      // §7.3 — uzmanın kullanıcıya GİZLİ sinyali (kamuya açık değil; yalnız sisteme akar)
      giveCustomerSignal: (id, signal) => {
        set((s) => ({
          bookings: s.bookings.map((b) => (b.id === id ? { ...b, providerSignal: signal } : b)),
        }));
        // SUNUCUYA YAZ. Sinyal yalnız bu cihazda yaşıyordu; uygulama yeniden
        // kurulunca kayboluyordu. Sunucu bunu müşteriye ASLA göndermez
        // (mapBooking gizli tutar), denetim kaydına da yalnız DEĞER girer.
        const token = get().token;
        if (!token) return;
        const onceki = get().bookings.find((b) => b.id === id)?.providerSignal;
        void api.setCustomerSignal(token, id, signal).catch(() => {
          // Yazılamadıysa yereli geri al — "kaydedildi" yalanı kalmasın.
          set((s) => ({
            bookings: s.bookings.map((b) => (b.id === id ? { ...b, providerSignal: onceki } : b)),
          }));
        });
      },

      pendingBookingSync: [],

      // Sunucuya yazımı garantile: başarısızsa id kuyrukta kalır, flushBookingSync yeniden dener.
      // createBooking sunucuda id ile upsert (idempotent) — tekrar gönderim çift kayıt yaratmaz.
      syncBooking: (booking) => {
        set((s) => ({
          pendingBookingSync: s.pendingBookingSync.includes(booking.id)
            ? s.pendingBookingSync
            : [...s.pendingBookingSync, booking.id],
        }));
        void api
          .createBooking(booking, get().token ?? undefined)
          .then(() =>
            set((s) => ({
              pendingBookingSync: s.pendingBookingSync.filter((x) => x !== booking.id),
            })),
          )
          .catch(() => undefined); // kuyrukta kalır — açılışta/hydrate'te yeniden denenir
      },

      flushBookingSync: async () => {
        const { pendingBookingSync, token } = get();
        if (!token || pendingBookingSync.length === 0) return;
        for (const id of [...pendingBookingSync]) {
          const b = get().bookings.find((x) => x.id === id);
          if (!b) {
            set((s) => ({ pendingBookingSync: s.pendingBookingSync.filter((x) => x !== id) }));
            continue;
          }
          try {
            await api.createBooking(b, token);
            set((s) => ({ pendingBookingSync: s.pendingBookingSync.filter((x) => x !== id) }));
          } catch (err) {
            // Faz 1/3 — SLOT_CONFLICT kalıcı reddir: sonsuz tekrar yerine kuyruktan düşür,
            // kaydı cancelled işaretle ve kullanıcıya bildir (yeni saat seçmesi gerekir).
            if (
              err instanceof ApiError &&
              (err.code === 'SLOT_CONFLICT' || err.code === 'CALENDAR_FORBIDDEN')
            ) {
              set((s) => ({
                pendingBookingSync: s.pendingBookingSync.filter((x) => x !== id),
                bookings: s.bookings.map((x) =>
                  x.id === id ? { ...x, status: 'sync_conflict' as const } : x,
                ),
              }));
              get().pushNotification({
                type: 'booking',
                titleKey: 'notif.slot_conflict',
                bodyKey: 'notif.slot_conflict_b',
                params: { slot: formatSlotTr(b.startMs) },
                dateLabel: 'Az önce',
                icon: 'alert-circle-outline',
                route: `/booking/${id}`,
              });
            }
            // diğer hatalar (ağ vb.) → sıradaki denemede tekrar
          }
        }
      },

      // Faz 3 — çakışan offline kaydı kullanıcı kararıyla yerelden kaldır
      dropLocalBooking: (id) =>
        set((s) => ({
          bookings: s.bookings.filter((b) => b.id !== id),
          pendingBookingSync: s.pendingBookingSync.filter((x) => x !== id),
        })),

      // Offline randevu: ÖNCE yerel kayıt (kalıcı), sonra sunucu eşitlemesi — ekleme asla kaybolmaz
      queueOfflineBooking: (booking) => {
        set((s) => ({ bookings: [booking, ...s.bookings] }));
        get().syncBooking(booking);
      },

      hydrateBookings: async () => {
        const token = get().token;
        // Giriş YOK → demo tohum (SEED_APPOINTMENTS) korunur. Beklenecek bir şey
        // yok; bayrak burada da inmeli, yoksa misafirde iskelet sonsuza kalır.
        if (!token) {
          set({ bookingsLoading: false });
          return;
        }
        set({ bookingsLoading: true });
        // Önce bekleyen yazımlar sunucuya gitsin ki tazeleme onları "sunucudan" geri getirsin
        await get().flushBookingSync();
        try {
          const role = get().currentUser?.role;
          const isProvider = role === 'professional' || role === 'salon';
          // Müşteri: kendi randevuları. Uzman/salon: SAĞLAYICI olduğu gelen randevular
          // ('Randevu Al' talepleri) + varsa kendi müşteri randevuları — ikisi birleşik.
          const [mine, provider] = await Promise.all([
            api.myBookings(token).catch(() => [] as Appointment[]),
            isProvider
              ? api.providerBookings(token).catch(() => [] as Appointment[])
              : Promise.resolve([] as Appointment[]),
          ]);
          const byId = new Map<string, (typeof mine)[number]>();
          for (const b of [...mine, ...provider]) byId.set(b.id, b);
          const remote = [...byId.values()];
          const remoteIds = new Set(remote.map((b) => b.id));
          set((s) => {
            // İSTEMCİYE ÖZEL alanlar sunucuda YOK. Sunucu nesnesi olduğu gibi
            // yazılırsa `reminded24`/`reminded2` her tazelemede siliniyor ve
            // `checkReminders` AYNI hatırlatmayı yeniden üretiyordu — uygulama
            // her açıldığında. "Aynı bildirim tekrar tekrar geliyor"un kaynağı.
            const yerel = new Map(s.bookings.map((b) => [b.id, b]));
            const birlesik = remote.map((r) => {
              const y = yerel.get(r.id);
              if (!y) return r;
              return {
                ...r,
                ...(y.reminded24 !== undefined ? { reminded24: y.reminded24 } : {}),
                ...(y.reminded2 !== undefined ? { reminded2: y.reminded2 } : {}),
              };
            });
            return { bookings: [...birlesik, ...s.bookings.filter((b) => !remoteIds.has(b.id))] };
          });
        } catch {
          // API erişilemez → mevcut veriler korunur (offline-first)
        } finally {
          // HATA DA OLSA inmeli: aksi halde sunucu kapalıyken kullanıcı
          // sonsuz iskelet görür — yanlış boş durumdan beter.
          set({ bookingsLoading: false });
        }
      },

      setReviewAnonymous: (v) => {
        set({ reviewAnonymous: v });
        const token = get().token;
        if (token) void api.savePrefs(token, { reviewAnonymous: v }).catch(() => undefined);
      },

      reviewBooking: (id, input) => {
        const b = get().bookings.find((x) => x.id === id);
        const anon = get().reviewAnonymous;
        // Gizlilik: anonimse "Doğrulanmış üye"; değilse kullanıcının ilk adı
        const firstName = get().currentUser?.name?.trim().split(/\s+/)[0];
        const authorLabel = anon || !firstName ? 'Doğrulanmış üye' : firstName;
        set((s) => ({
          bookings: s.bookings.map((x) => (x.id === id ? { ...x, reviewed: true } : x)),
        }));
        if (!b) return;
        // §7.1 — uzman değerlendirmesi (birincil, kamuya açık)
        const mk = (
          rating: number,
          text: string,
          tags: string[],
          suffix?: string,
          photos?: string[],
        ): Review => ({
          id: nextId('rv'),
          author: authorLabel,
          period: 'Az önce',
          rating,
          service: suffix ? `${b.service} · ${suffix}` : b.service,
          text,
          firstVisit: false,
          ...(tags.length ? { tags } : {}),
          ...(photos && photos.length ? { photos } : {}), // EK Z.10
        });
        const reviews = [mk(input.rating, input.text, input.tags, undefined, input.photos)];
        // §7.1 — salon randevusuysa ikinci adım: salon puanı da kaydedilir
        if (input.salon)
          reviews.push(mk(input.salon.rating, input.salon.text, input.salon.tags, 'Salon'));
        // Backend'e gönder — doğrulanmış yorum (giriş zorunlu; sunucu randevuyu denetler)
        const token = get().token;
        if (token) {
          void api
            .submitRating(token, {
              bookingId: b.id,
              raterRole: 'user',
              score: input.rating,
              comment: input.text,
              serviceTag: b.service,
              authorLabel,
              ...(input.photos && input.photos.length ? { photos: input.photos } : {}), // EK Z.10
            })
            .catch(() => undefined);
        }
        set((s) => ({
          userReviews: {
            ...s.userReviews,
            [b.proId]: [...reviews, ...(s.userReviews[b.proId] ?? [])],
          },
        }));
        get().earn(40, 'rewards.earn.review', b.proName);
        // §8.1 — ilk randevu tamamlama (değerlendirme = tamamlanmış hizmet) → 300 puan, tek seferlik
        if (!get().firstBookingBonusGiven) {
          set({ firstBookingBonusGiven: true });
          get().earn(300, 'rewards.earn.first_booking', b.proName);
        }
      },

      // §7.2 — uzman/salon yoruma tek yanıt yazar (yanıt kalıcı; bir kez)
      replyToReview: (proId, reviewId, reply) => {
        set((s) => ({
          userReviews: {
            ...s.userReviews,
            [proId]: (s.userReviews[proId] ?? []).map((r) =>
              r.id === reviewId && !r.reply ? { ...r, reply: reply.trim() } : r,
            ),
          },
        }));
        // §7.2 — yanıt SUNUCUYA da yazılır (public profildeki yorum kartında görünür)
        const tk = get().token;
        if (tk) void api.replySpecialistReview(tk, reviewId, reply).catch(() => undefined);
      },

      // §7.2 — negatif yoruma itiraz (admin kuyruğu; yorum görünür kalır — otomatik gizleme YOK)
      disputeReview: (proId, reviewId) => {
        set((s) => ({
          userReviews: {
            ...s.userReviews,
            [proId]: (s.userReviews[proId] ?? []).map((r) =>
              r.id === reviewId ? { ...r, disputed: true } : r,
            ),
          },
        }));
        // §7.2 — itiraz SUNUCUDAKİ admin kuyruğuna düşer (yorum süreç boyunca görünür kalır)
        const tk = get().token;
        if (tk) void api.disputeSpecialistReview(tk, reviewId, '').catch(() => undefined);
        get().pushNotification({
          type: 'system',
          titleKey: 'notif.review_dispute',
          bodyKey: 'notif.review_dispute_b',
          dateLabel: 'Az önce',
          icon: 'flag-outline',
        });
      },

      toggleFavorite: (proId) => {
        set((s) => ({
          favorites: s.favorites.includes(proId)
            ? s.favorites.filter((x) => x !== proId)
            : [proId, ...s.favorites],
        }));
        // §5.6 — favoriler HESAPTA da yaşar (cihaz/yeniden giriş kaybetmez)
        void api.setPrefs({ favorites: get().favorites }).catch(() => undefined);
      },

      // W2W — kişi takip et / bırak (yazar adına göre)
      toggleFollow: (author, targetUserId) => {
        // §5.5 — takip durumu KİMLİKLE izlenir (görünen ad ≠ hesap adı olabilir; buton
        // "takip ediyor ama Takip Et duruyor" hatasının kökü isim eşleşmesiydi)
        const on = targetUserId
          ? !get().followingIds.includes(targetUserId)
          : !get().following.includes(author);
        set((s) => ({
          following: on ? [author, ...s.following] : s.following.filter((x) => x !== author),
          ...(targetUserId
            ? {
                followingIds: on
                  ? [targetUserId, ...s.followingIds]
                  : s.followingIds.filter((x) => x !== targetUserId),
              }
            : {}),
        }));
        // §5.5 — gerçek sosyal graf: hedefin kullanıcı kimliği varsa SUNUCUYA yazılır
        if (targetUserId) void api.circleFollow(targetUserId, on).catch(() => undefined);
      },

      // W2W — takipçiyi kaldır (mock listeden çıkar)
      removeFollower: (name) =>
        set((s) => ({ followerNames: s.followerNames.filter((x) => x !== name) })),

      // §5.6 — adres ekle/kaldır
      addAddress: (label, detail) => {
        if (!detail.trim()) return;
        set((s) => ({
          addresses: [...s.addresses, { id: nextId('ad'), label, detail: detail.trim() }],
        }));
        void api.setPrefs({ addresses: get().addresses }).catch(() => undefined);
      },
      removeAddress: (id) => {
        set((s) => ({ addresses: s.addresses.filter((a) => a.id !== id) }));
        void api.setPrefs({ addresses: get().addresses }).catch(() => undefined);
      },

      // §5.6.2 — premium aç/kapa (gerçekte app-dışı ödeme; burada mock)
      setPremium: (v) => set({ premium: v }),

      addPersonalLog: (input) => {
        const gecici = nextId('pl');
        set((s) => ({
          personalLogs: [
            {
              id: gecici,
              title: input.title,
              dateLabel: input.dateLabel,
              icon: input.icon ?? TONE_ICON[input.tone],
              tone: input.tone,
              ...(input.note ? { note: input.note } : {}),
              ...(input.kind ? { kind: input.kind } : {}),
              ...(input.dateMs ? { dateMs: input.dateMs } : {}),
            },
            ...s.personalLogs,
          ],
        }));
        const token = get().token;
        if (!token) return;
        void api
          .addCareLog(token, {
            title: input.title,
            tone: input.tone,
            loggedAtMs: input.dateMs ?? Date.now(),
            ...(input.icon ? { icon: input.icon } : {}),
            ...(input.note ? { note: input.note } : {}),
            ...(input.kind ? { kind: input.kind } : {}),
          })
          .then((r) =>
            set((s) => ({
              personalLogs: s.personalLogs.map((x) => (x.id === gecici ? { ...x, id: r.id } : x)),
            })),
          )
          .catch(() =>
            set((s) => ({ personalLogs: s.personalLogs.filter((x) => x.id !== gecici) })),
          );
      },

      // §5.4 — kişisel kaydı düzenle (detay ekranından); note boşsa alanı temizle
      updatePersonalLog: (id, patch) => {
        const onceki = get().personalLogs.find((x) => x.id === id);
        set((s) => ({
          personalLogs: s.personalLogs.map((x) =>
            x.id === id
              ? {
                  ...x,
                  title: patch.title,
                  dateLabel: patch.dateLabel,
                  tone: patch.tone,
                  icon: patch.icon ?? TONE_ICON[patch.tone],
                  note: patch.note?.trim() ? patch.note : undefined,
                  ...(patch.kind ? { kind: patch.kind } : {}),
                  ...(patch.dateMs ? { dateMs: patch.dateMs } : {}),
                }
              : x,
          ),
        }));
        const token = get().token;
        if (!token) return;
        void api
          .updateCareLog(token, id, {
            title: patch.title,
            tone: patch.tone,
            // Notu BOŞALTMAK geçerli bir düzenleme: '' gönderiliyor ki sunucu
            // null'a çeksin. `undefined` gönderirsek eski not olduğu gibi kalır.
            note: patch.note?.trim() ? patch.note : '',
            ...(patch.icon ? { icon: patch.icon } : {}),
            ...(patch.kind ? { kind: patch.kind } : {}),
            ...(patch.dateMs ? { loggedAtMs: patch.dateMs } : {}),
          })
          .catch(() => {
            // Sunucu yazmadıysa YEREL DÜZENLEMEYİ GERİ AL — yoksa kullanıcı
            // değişikliği görür, uygulamayı kapatıp açınca eskisi geri gelir.
            if (!onceki) return;
            set((s) => ({ personalLogs: s.personalLogs.map((x) => (x.id === id ? onceki : x)) }));
          });
      },

      deletePersonalLog: (id) => {
        const onceki = get().personalLogs;
        set((s) => ({ personalLogs: s.personalLogs.filter((x) => x.id !== id) }));
        const token = get().token;
        if (!token) return;
        // Silme başarısızsa listeyi geri getir: kullanıcı sildiğini sanıp
        // sonraki açılışta kaydı geri görmemeli.
        void api.removeCareLog(token, id).catch(() => set({ personalLogs: onceki }));
      },

      addMoment: (input) => {
        const gecici = nextId('mo');
        set((s) => ({
          moments: [
            {
              id: gecici,
              title: input.title,
              dateLabel: input.dateLabel,
              daysLeft: input.daysLeft,
              icon: input.icon ?? 'gift-outline',
            },
            ...s.moments,
          ],
        }));
        const token = get().token;
        if (!token) return;
        // Sunucu TARİHİ saklıyor, "kaç gün kaldı"yı değil — o her istekte
        // yeniden hesaplanıyor. Kalan günü saklasaydık zaman donardı.
        void api
          .addCareMoment(token, {
            title: input.title,
            happensAtMs: Date.now() + input.daysLeft * 86_400_000,
            ...(input.icon ? { icon: input.icon } : {}),
          })
          .then((r) =>
            set((s) => ({
              moments: s.moments.map((x) => (x.id === gecici ? { ...x, id: r.id } : x)),
            })),
          )
          .catch(() => set((s) => ({ moments: s.moments.filter((x) => x.id !== gecici) })));
      },

      addRoutine: (input) => {
        // Geçici kimlikle ANINDA göster; sunucu kimliği gelince TAKAS et.
        // Takas şart: "tamamladım" ve silme kimliği sunucuya gönderiyor,
        // yerel `cr_3` gönderilirse sunucu tanımaz ve işlem sessizce düşer.
        const gecici = nextId('cr');
        set((s) => ({
          careRoutines: [
            {
              id: gecici,
              name: input.name,
              dueDays: input.dueDays,
              periodDays: input.dueDays, // ilk süre = döngü; "tamamladım" buna göre sıfırlar
              icon: input.icon ?? 'sparkles-outline',
              ...(input.categoryCode ? { categoryCode: input.categoryCode } : {}),
            },
            ...s.careRoutines,
          ],
        }));
        const token = get().token;
        if (!token) return;
        void api
          .addCareRoutine(token, {
            name: input.name,
            periodDays: input.dueDays,
            ...(input.icon ? { icon: input.icon } : {}),
            ...(input.categoryCode ? { categoryCode: input.categoryCode } : {}),
          })
          .then((r) =>
            set((s) => ({
              careRoutines: s.careRoutines.map((x) => (x.id === gecici ? { ...x, id: r.id } : x)),
            })),
          )
          .catch(() =>
            // Yazma başarısızsa HAYALET SATIR bırakma: kullanıcı kaydettiğini
            // sanıp uygulamayı kapatırsa veri zaten yok.
            set((s) => ({ careRoutines: s.careRoutines.filter((x) => x.id !== gecici) })),
          );
      },

      // "Tamamladım" → sayaç bakımın KENDİ periyoduna göre yeniden başlar (rastgele 30 değil)
      completeRoutine: (id) => {
        const onceki = get().careRoutines.find((x) => x.id === id)?.dueDays;
        set((s) => ({
          careRoutines: s.careRoutines.map((x) =>
            x.id === id ? { ...x, dueDays: x.periodDays > 0 ? x.periodDays : 30 } : x,
          ),
        }));
        const token = get().token;
        if (!token) return;
        void api.completeCareRoutine(token, id).catch(() => {
          // Sunucu kaydetmediyse sayacı GERİ AL — kullanıcı yaptığını sanıp
          // bir sonraki açılışta gecikmiş görürse güveni sarsılır.
          if (onceki === undefined) return;
          set((s) => ({
            careRoutines: s.careRoutines.map((x) => (x.id === id ? { ...x, dueDays: onceki } : x)),
          }));
        });
      },

      addPost: (input) => {
        const id = nextId('c');
        set((s) => ({
          circlePosts: [
            {
              id,
              type: input.type,
              category: input.category,
              author: input.anonymous ? 'Doğrulanmış üye' : 'Sen',
              anonymous: input.anonymous,
              text: input.text,
              helpful: 0,
              comments: [],
            },
            ...s.circlePosts,
          ],
        }));
        // §5.5 — backend moderasyonuna gönder (şüpheli→pending; best-effort)
        const token = get().token;
        if (token)
          void api
            .createCirclePost(token, {
              category: input.category,
              text: input.text,
              anonymous: input.anonymous,
            })
            .catch(() => undefined);
        return id;
      },

      toggleHelpful: (postId) => {
        const post = get().circlePosts.find((p) => p.id === postId);
        const liking = post ? !post.helpfulByMe : false;
        set((s) => ({
          circlePosts: s.circlePosts.map((p) =>
            p.id === postId
              ? { ...p, helpfulByMe: !p.helpfulByMe, helpful: p.helpful + (p.helpfulByMe ? -1 : 1) }
              : p,
          ),
        }));
        // §5.5 — beğeni SUNUCU sayacına da yazılır (diğer kullanıcılar aynı sayıyı görür)
        void api.circleHelpful(postId, liking).catch(() => undefined);
        // §8.1 — beğenirken 1 puan; ayda maks 100 (geri alınca puan iade edilmez)
        if (liking) {
          const month = new Date().toISOString().slice(0, 7);
          const s = get();
          const monthPts = s.w2wLikeMonth === month ? s.w2wLikePoints : 0;
          if (monthPts < 100) {
            set({ w2wLikeMonth: month, w2wLikePoints: monthPts + 1 });
            get().earn(1, 'rewards.earn.w2w_like', '');
          } else {
            set({ w2wLikeMonth: month, w2wLikePoints: monthPts });
          }
        }
      },

      toggleSaved: (postId) => {
        const token = get().token;
        const mevcut = get().circlePosts.find((p) => p.id === postId)?.savedByMe === true;
        const hedef = !mevcut;
        // Önce yerel: dokunuş anında tepki versin.
        set((s) => ({
          circlePosts: s.circlePosts.map((p) => (p.id === postId ? { ...p, savedByMe: hedef } : p)),
        }));
        if (!token) return;
        // SUNUCUYA YAZ. Yazılmazsa kayıt uygulamayı kapatınca kaybolurdu —
        // "kaydettim ama gitmiş" en can sıkıcı hata türü.
        void api.setCircleSaved(token, postId, hedef).catch(() => {
          // Yazım başarısızsa yereli GERİ AL: UI yalan durumda kalmasın.
          set((s) => ({
            circlePosts: s.circlePosts.map((p) =>
              p.id === postId ? { ...p, savedByMe: mevcut } : p,
            ),
          }));
        });
      },

      addComment: (postId, text, anonymous, proId) => {
        // §5.5 — yorum SUNUCUYA yazılır (moderasyon + diğer kullanıcılar görür)
        void api.circleComment(postId, text, anonymous, proId).catch(() => undefined);
        set((s) => ({
          circlePosts: s.circlePosts.map((p) =>
            p.id === postId
              ? {
                  ...p,
                  // Sunucu sayacı da anında artar; yoksa kendi yorumunu yazan
                  // kullanıcı akışta sayının değişmediğini görüyordu.
                  commentCount: (p.commentCount ?? p.comments.length) + 1,
                  comments: [
                    ...p.comments,
                    {
                      id: nextId('cm'),
                      author: anonymous ? 'Doğrulanmış üye' : 'Sen',
                      anonymous,
                      text,
                    },
                  ],
                }
              : p,
          ),
        }));
      },

      // §5.5 moderasyon katman 2 — şikâyet: eşik aşınca backend otomatik gizler + admin kuyruğu
      reportPost: (postId) => {
        if (get().reportedPosts.includes(postId)) return;
        set((s) => ({ reportedPosts: [...s.reportedPosts, postId] }));
        const token = get().token;
        if (token) void api.reportCirclePost(token, postId).catch(() => undefined); // §5.5 backend
        get().pushNotification({
          type: 'system',
          titleKey: 'notif.report_received',
          bodyKey: 'notif.report_received_b',
          dateLabel: 'Az önce',
          icon: 'flag-outline',
        });
      },

      earn: (points, labelKey, detail) => {
        // Optimistik yerel güncelleme (anında UI); oturum varsa sunucuya da yaz
        set((s) => ({
          points: s.points + points,
          ledger: [
            { id: nextId('le'), kind: 'earn', labelKey, detail, points, dateLabel: 'Az önce' },
            ...s.ledger,
          ],
        }));
        const token = get().token;
        // SUNUCU OTORİTEDİR: kazanım kuralı ve günlük sınır sunucuda. Yerel artış
        // yalnız anlık geri bildirim; sunucu yanıtı gelince bakiye onunla ezilir.
        // (Sunucu sınırı aşan kazanımı sessizce atlar — bakiye şişmiş kalmasın.)
        if (token)
          void api
            .earnPoints(token, labelKey, detail)
            .then((sum) =>
              set({
                points: sum.points,
                raffleEntries: sum.raffleEntries,
                pointsSpend: sum.spend ?? null,
              }),
            )
            .catch(() => undefined);
      },

      redeem: async (reward) => {
        const token = get().token;
        if (token) {
          try {
            const summary = await api.redeemReward(token, reward.id);
            set({
              points: summary.points,
              raffleEntries: summary.raffleEntries,
              tier: summary.tier,
              ledger: summary.ledger,
              pointsSpend: summary.spend ?? null,
            });
            return true;
          } catch {
            return false; // yetersiz puan / sunucu hatası
          }
        }
        // Oturum yok → yerel (çevrimdışı demo)
        if (get().points < reward.cost) return false;
        set((s) => ({
          points: s.points - reward.cost,
          raffleEntries: reward.id === 'rw3' ? s.raffleEntries + 1 : s.raffleEntries,
          ledger: [
            {
              id: nextId('le'),
              kind: 'spend',
              labelKey: reward.titleKey,
              detail: 'Ödül kullanıldı',
              points: -reward.cost,
              dateLabel: 'Az önce',
            },
            ...s.ledger,
          ],
        }));
        return true;
      },

      // §8.2 — çekilişe katıl: 500 puan öde → +1 bilet
      enterRaffle: () => {
        const bilet = get().config.rates.raffleCost || RAFFLE_COST;
        if (get().points < bilet) return false;
        // Optimistik yerel düşüş — dokunuş anında tepki.
        set((s) => ({
          points: s.points - bilet,
          raffleEntries: s.raffleEntries + 1,
          ledger: [
            {
              id: nextId('le'),
              kind: 'spend',
              labelKey: 'rewards.raffle.entry',
              detail: 'Çekiliş bileti',
              points: -bilet,
              dateLabel: 'Az önce',
            },
            ...s.ledger,
          ],
        }));
        // SUNUCUYA YAZ. Çekiliş bileti YALNIZ YERELDE düşülüyordu: puan defteri
        // sunucuda tutulduğu için uygulama yeniden açılınca puan geri geliyor,
        // bilet ise hiç var olmuyordu — kullanıcı bilet aldığını sanıyordu.
        // (CLAUDE.md: finans/sadakat LEDGER — yerel sayaç defter değildir.)
        const token = get().token;
        if (token) {
          void api
            .redeemReward(token, 'rw3')
            .then((sum) =>
              set({
                points: sum.points,
                raffleEntries: sum.raffleEntries,
                pointsSpend: sum.spend ?? null,
              }),
            )
            .catch(() => {
              // Sunucu reddettiyse (kilit, yetersiz puan) yerel düşüşü GERİ AL.
              set((s) => ({
                points: s.points + bilet,
                raffleEntries: Math.max(0, s.raffleEntries - 1),
                ledger: s.ledger.slice(1),
              }));
            });
        }
        return true;
      },

      // §11 — admin onayı sonrası: me() → membershipTier → premium/platinum bayrakları
      refreshMembership: async () => {
        const token = get().token;
        if (!token) return;
        try {
          const me = await api.me(token);
          const tier = me.membershipTier ?? 'free';
          const wasPremium = get().premium;
          // Medya = HESAP verisi; ama hesap BOŞ ve yerelde/cache'te data URL varsa KORU ve
          // hesaba GERİ YÜKLE (self-heal). avatarUri persist EDİLMEZ → soğuk açılışta yerel
          // null olabilir; bu yüzden CİHAZ ÖNBELLEĞİNİ de danış (yoksa foto siliniyordu).
          const uid = get().currentUser?.id;
          const cached = uid ? await loadMediaCache(uid) : null;
          const localAvatar = get().avatarUri ?? cached?.avatar ?? null;
          const localCutout = get().cutoutUri ?? cached?.cutout ?? null;
          const serverAvatar = me.avatarUrl ?? null;
          const serverCutout = me.cutoutUrl ?? null;
          const nextAvatar =
            serverAvatar ?? (localAvatar?.startsWith('data:') ? localAvatar : null);
          const nextCutout =
            serverCutout ?? (localCutout?.startsWith('data:') ? localCutout : null);
          if (!serverAvatar && nextAvatar)
            void api.setAvatar(token, nextAvatar).catch(() => undefined);
          if (!serverCutout && nextCutout)
            void api.setCutoutRemote(token, nextCutout).catch(() => undefined);
          set((s) => ({
            currentUser: s.currentUser
              ? {
                  ...s.currentUser,
                  membershipTier: tier,
                  // §12.3 — KISIT DURUMU buraya taşındı. Eskiden `loadContent`
                  // AYNI `/me` çağrısını ikinci kez yapıp bunları yazıyordu:
                  // açılışta iki özdeş istek gidiyordu. Alanlar buraya alındı
                  // ki tek çağrı yetsin — davranış aynı, istek yarıya indi.
                  restricted: me.restricted,
                  restrictedDaysLeft: me.restrictedDaysLeft,
                  membershipUntil: me.membershipUntil ?? null,
                }
              : s.currentUser,
            premium: tier === 'premium' || tier === 'platinum',
            platinum: tier === 'platinum',
            avatarUri: nextAvatar,
            cutoutUri: nextCutout,
            // Portrenin hangi fotoğraftan üretildiği bilgisi ÖNBELLEKTEN
            // taşınır. Taşınmazsa her açılışta bağ kopar ve geçerli bir portre
            // de bayat sayılırdı.
            cutoutFor: get().cutoutFor ?? cached?.cutoutFor ?? null,
          }));
          // Önbelleği yalnız bir şey VARSA güncelle — geçici null cache'i EZMESİN.
          if (uid && (nextAvatar || nextCutout))
            saveMediaCache(uid, {
              avatar: nextAvatar,
              cutout: nextCutout,
              cutoutFor: get().cutoutFor ?? cached?.cutoutFor ?? null,
            });
          // §5.6 — favoriler/adresler hesaptan (sunucuda veri varsa o esas; boşsa yerel korunur)
          const prefs = (me as { prefs?: { favorites?: string[]; addresses?: UserAddress[] } })
            .prefs;
          if (prefs?.favorites?.length) set({ favorites: prefs.favorites });
          if (prefs?.addresses?.length) set({ addresses: prefs.addresses });
          // §9.5 — uzman/salon: hizmet listesi + çalışma saatleri hesaptan gelir
          const role = get().currentUser?.role;
          if (role === 'professional' || role === 'salon') {
            void api
              .myServices()
              .then((r) => {
                if (!r.services.length) return;
                const map: Record<string, SellerServiceRow> = {};
                for (const svc of r.services)
                  map[svc.id] = { price: String(svc.price), dur: String(svc.durationMin) };
                set({ sellerServices: map });
              })
              .catch(() => undefined);
            void api
              .myHours()
              .then((r) => {
                if (r.hours.length) set({ sellerHours: r.hours });
              })
              .catch(() => undefined);
            void 0;
          }
          // §5.5 — takip/takipçi hesaptan (rol farketmez)
          void api
            .myFollows()
            .then((r) => {
              if (r.following.length)
                set({
                  following: r.following.map((x) => x.name),
                  followingIds: r.following.map((x) => x.userId),
                });
              if (r.followers.length) set({ followerNames: r.followers.map((x) => x.name) });
            })
            .catch(() => undefined);
          if (role === 'professional' || role === 'salon') {
            void api
              .myClosedDays()
              .then((r) => {
                if (r.days.length) set({ closedDays: r.days });
              })
              .catch(() => undefined);
          }
          // Push gelmese bile: yükselme ALGILANDIĞINDA uygulama-içi bildirim (§11)
          if (!wasPremium && (tier === 'premium' || tier === 'platinum'))
            get().pushNotification({
              type: 'system',
              titleKey: 'sub.upgraded_t',
              bodyKey: 'sub.upgraded_b',
              dateLabel: 'Az önce',
              icon: 'diamond-outline',
              route: '/profile/passport',
            });
        } catch {
          /* çevrimdışı: mevcut durum korunur */
        }
      },

      hydrateLoyalty: async () => {
        const token = get().token;
        if (!token) return;
        try {
          const summary = await api.loyalty(token);
          set({
            points: summary.points,
            raffleEntries: summary.raffleEntries,
            tier: summary.tier,
            ledger: summary.ledger,
            pointsSpend: summary.spend ?? null,
          });
        } catch {
          // sunucuya ulaşılamadı → yerel değerler korunur
        }
      },

      pushNotification: (n) =>
        set((s) => ({
          // §5.7 — gerçek bildirimler push anında zamanla damgalanır (30 gün temizlik için)
          notifications: [
            { ...n, id: nextId('n'), read: false, createdAt: n.createdAt ?? Date.now() },
            ...s.notifications,
          ],
        })),

      // §5.7 — 30 günden eski (zaman damgalı) bildirimleri temizle; seed'ler (damgasız) korunur
      pruneNotifications: () =>
        set((s) => {
          const cutoff = Date.now() - NOTIFICATION_TTL_MS;
          const kept = s.notifications.filter(
            (n) => n.createdAt === undefined || n.createdAt >= cutoff,
          );
          return kept.length === s.notifications.length ? {} : { notifications: kept };
        }),

      markNotificationRead: (id) =>
        set((s) => ({
          notifications: s.notifications.map((x) => (x.id === id ? { ...x, read: true } : x)),
        })),

      removeDemand: async (id) => {
        const onceki = get().demands;
        // Optimistik: liste anında temizlensin.
        set((s) => ({ demands: s.demands.filter((d) => d.id !== id) }));
        const token = get().token;
        if (!token) return true;
        try {
          await api.removeDemand(token, id);
          return true;
        } catch {
          // Sunucu reddettiyse (ör. randevuya dönüşmüş) GERİ AL — kullanıcı
          // sildiğini sanıp sonraki açılışta geri gelmesini görmemeli.
          set({ demands: onceki });
          return false;
        }
      },

      hydratePrefs: async () => {
        const token = get().token;
        if (!token) return;
        try {
          const p = await api.prefs(token);
          set((s) => ({
            // Sunucudan gelen anahtarlar YERELİN ÜSTÜNE biniyor, onu
            // silmiyor: sunucuda henüz olmayan yeni bir tercih türü
            // varsayılanını kaybetmemeli.
            notifPrefs: { ...s.notifPrefs, ...(p.notif as typeof s.notifPrefs) },
            demandNotif: { ...s.demandNotif, ...(p.demand as unknown as typeof s.demandNotif) },
            reviewAnonymous: p.reviewAnonymous,
            autoReengageEnabled: p.autoReengage,
          }));
        } catch {
          // Ağ yoksa yereldeki tercihlerle devam.
        }
      },

      hydrateAlways: async () => {
        const token = get().token;
        if (!token) return;
        try {
          set({ alwaysBonds: await api.alwaysBonds(token) });
        } catch {
          // Ağ yoksa yereldeki kopya görünmeye devam eder.
        }
      },

      hydrateCare: async () => {
        const token = get().token;
        if (!token) return;
        try {
          const d = await api.care(token);
          set({
            careRoutines: d.routines.map((r) => ({
              id: r.id,
              name: r.name,
              icon: r.icon,
              dueDays: r.dueDays,
              periodDays: r.periodDays,
              ...(r.categoryCode ? { categoryCode: r.categoryCode } : {}),
            })),
            // Etiketler SUNUCUDAN gelmiyor, tarihten yeniden üretiliyor —
            // sunucu tarihi saklıyor, gösterim biçimini değil. Tek
            // biçimlendirici (`date-label`) kullanılıyor ki aynı tarih iki
            // farklı yerde iki farklı görünmesin.
            moments: d.moments.map((m) => ({
              id: m.id,
              title: m.title,
              icon: m.icon,
              daysLeft: m.daysLeft,
              dateLabel: formatTrDate(new Date(m.happensAtMs), false),
            })),
            personalLogs: d.logs.map((l) => ({
              id: l.id,
              title: l.title,
              icon: l.icon,
              tone: l.tone as PersonalTone,
              dateLabel: formatTrDate(new Date(l.dateMs), true),
              dateMs: l.dateMs,
              ...(l.note ? { note: l.note } : {}),
              ...(l.kind ? { kind: l.kind as QuickAddKind } : {}),
            })),
          });
        } catch {
          // Ağ yoksa yereldeki (kalıcılaştırılmış) veri görünmeye devam eder.
        }
      },

      markAllNotificationsRead: () =>
        set((s) => ({ notifications: s.notifications.map((x) => ({ ...x, read: true })) })),

      setUnreadMessages: (n) => set({ unreadMessages: Math.max(0, Math.trunc(n) || 0) }),
    }),
    {
      name: 'ayna-session',
      storage: createJSONStorage(() => AsyncStorage),
      // v1: hizmet menüsü artık uzmanlık-odaklı seed (eski generic çok-kategorili liste kalıcıysa atılır).
      version: 1,
      migrate: (persisted, version) => {
        if (version < 1 && persisted && typeof persisted === 'object') {
          const rest = { ...(persisted as Record<string, unknown>) };
          delete rest.sellerServices; // düş → varsayılan (yeni) seed uygulanır; oturum korunur
          return rest as typeof persisted;
        }
        return persisted;
      },
      // Yalnız oturumu kalıcı sakla; mock veriler (bookings/demands vb.) her açılışta seed'den.
      partialize: (s) => ({
        token: s.token,
        currentUser: s.currentUser,
        // VERİ KAYBI YASAĞI — randevular + bekleyen sunucu yazımları cihazda kalıcıdır;
        // kapat-aç sonrası sunucuya ulaşmamış talep kaybolmaz, kuyruktan eşitlenir.
        bookings: s.bookings,
        pendingBookingSync: s.pendingBookingSync,
        // Bunlar persist edilmiyordu: her açılışta liste boşalıyor, dedup'lar
        // (duyuru id'si, anket sorulmuşluğu) sıfırlanıyor ve TÜM bildirimler
        // yeniden OKUNMAMIŞ olarak üretiliyordu.
        notifications: s.notifications,
        surveyAskedIds: s.surveyAskedIds,
        sellerTrialStart: s.sellerTrialStart, // §11 — 3 günlük ücretsiz deneme sayacı korunur
        // PERF: avatar/cutout PERSIST EDİLMEZ — MB'lık data-URL'ler her state değişiminde
        // diske yazılıp uygulamayı yavaşlatıyordu. Açılışta HESAPTAN geri yüklenir (tek kaynak).
        sellerServices: s.sellerServices,
        sellerSocial: s.sellerSocial,
        sellerHours: s.sellerHours,
        sellerCerts: s.sellerCerts,
        salonProfile: s.salonProfile,
        demandNotif: s.demandNotif,
        offersSeen: s.offersSeen, // açılış 'yeni teklif' pop-up sayacı
        premium: s.premium, // §11 — satın alınan paket app yeniden açılınca korunmalı
        platinum: s.platinum,
        autoReengageEnabled: s.autoReengageEnabled,
      }),
    },
  ),
);

// Faz B — GİRİŞLİ açılışta tohumları at: persist edilmeyen kişisel dilimler (puan 340,
// tohum bildirim/randevu/talep/bakım günlüğü) her açılışta initial-state'ten geri geliyordu.
// Oturum varsa bunlar sıfırlanır; gerçek değerleri _layout'taki hydrate* çağrıları doldurur.
useStore.persist.onFinishHydration((state) => {
  setApiToken(state.token);
  if (state.token) {
    // Tohum temizliği KALICI randevulara dokunmaz: yalnız demo id'leri ayıklanır (veri kaybı yasağı).
    const seedIds = new Set(SEED_APPOINTMENTS.map((b) => b.id));
    useStore.setState({
      ...SEEDED_PERSONAL_RESET,
      bookings: state.bookings.filter((b) => !seedIds.has(b.id)),
      // Bildirimler artık KALICI; sıfırlama onları silmemeli, yoksa persist
      // etmenin anlamı kalmaz ve her açılışta hepsi yeniden üretilir.
      notifications: state.notifications,
      surveyAskedIds: state.surveyAskedIds,
    });
    // Açılışta bekleyen sunucu yazımlarını eşitle (önceki oturumda ağ yoksa burada tamamlanır)
    void useStore.getState().flushBookingSync();
  }
  // Medya önbelleği: persist DIŞI tutulan foto/portre açılışta cihaz önbelleğinden anında gelir;
  // refreshMembership ardından hesapla eşitler (hesap boşsa self-heal yükler).
  const uid = state.currentUser?.id;
  if (uid)
    void loadMediaCache(uid).then((m) => {
      if (!m) return;
      const cur = useStore.getState();
      useStore.setState({
        ...(cur.avatarUri == null && m.avatar ? { avatarUri: m.avatar } : {}),
        ...(cur.cutoutUri == null && m.cutout ? { cutoutUri: m.cutout } : {}),
      });
    });
});

// ── Türetilmiş seçiciler (hook'larda kullanılabilir) ─────────────────────
export const selectUpcomingEvents = (s: State): UpcomingEvent[] =>
  buildUpcomingEvents(s.bookings, s.moments, s.careRoutines);

// §9.1/§10 — aktif moda göre bildirim kitlesi: uzman/salon paneli 'seller', aksi 'user'.
// Kitlesi tanımsız bildirimler (ortak/sistem) her iki modda görünür.
// Satıcı hesabı (uzman/salon) her zaman panel bağlamındadır (müşteri modu kaldırıldı).
// selectSellerView primitive (boolean) döndürür → hook seçici olarak güvenli (yeni-ref tuzağı yok).
export const selectSellerView = (s: State): boolean =>
  s.currentUser?.role === 'professional' || s.currentUser?.role === 'salon';

export const inAudience = (n: { audience?: 'user' | 'seller' }, seller: boolean): boolean =>
  n.audience === undefined || n.audience === (seller ? 'seller' : 'user');

// K1 — yerel kapora tutarı. Sunucu ile AYNI saf fonksiyon (@ayna/domain) ve aynı
// admin kuralları kullanılır; aksi hâlde bildirimde "1.000 ₸" yazıp ödeme ekranında
// başka tutar istenirdi. Config gelmemişse fonksiyonun kendi varsayılanları geçerli.
export const localDeposit = (price: number, rates: State['config']['rates']): number =>
  depositFor(price, { pct: rates.depositPct ?? DEFAULT_DEPOSIT_RULES.pct });

// §12.8 — komisyon oranı SUNUCUDAN gelir. Burada eskiden "Platinum'da %8,5"
// vardı; sunucu komisyonu hesaplarken membershipTier'ı hiç okumuyor, yani o
// indirim hiç uygulanmıyordu. Platinum uzman gelir raporunda %8,5 ile hesaplanmış
// YANLIŞ bir net rakam görüyordu. Karar K6: kademeli oran matrisi uygulanana kadar
// tek oran gösterilir.
export const selectCommissionRate = (s: State): number =>
  s.config.rates.commissionPct ?? COMMISSION_PCT_STANDARD;

// §11 — üyelik katmanı (upsell teşviki bunu kullanır). Primitive string → hook için güvenli.
export const selectTier = (s: State): 'free' | 'premium' | 'platinum' =>
  s.platinum ? 'platinum' : s.premium ? 'premium' : 'free';

// §11 — uzman ücretsiz deneme: kayıttan itibaren 3 gün. SAF yardımcı (bileşende çağrılır,
// useStore selektörü olarak KULLANMA — her render yeni obje döner). daysLeft: kalan tam gün (yukarı).
export const SELLER_TRIAL_DAYS = 3;
const SELLER_TRIAL_MS = SELLER_TRIAL_DAYS * 24 * 60 * 60 * 1000;
export const sellerTrialInfo = (start: number | null): { active: boolean; daysLeft: number } => {
  if (start == null) return { active: false, daysLeft: 0 };
  const elapsed = Date.now() - start;
  const active = elapsed < SELLER_TRIAL_MS;
  return {
    active,
    daysLeft: active ? Math.max(1, Math.ceil((SELLER_TRIAL_MS - elapsed) / 86_400_000)) : 0,
  };
};

// §11 — ALWAYS: geçerli oturumun (uzman/salon ya da müşteri) bağları.
// NOT: bunlar SAF yardımcılar (bileşende useMemo ile çağrılır) — doğrudan useStore
// selektörü olarak KULLANMA (her render yeni dizi → sonsuz render döngüsü).
const bondIsMine = (b: AlwaysBond, me: string, isProvider: boolean): boolean =>
  isProvider ? b.providerName === me : b.customerName === me;
const bondInitiatedByOther = (b: AlwaysBond, isProvider: boolean): boolean =>
  isProvider ? b.initiator === 'customer' : b.initiator === 'provider';
export const filterAlwaysAccepted = (
  bonds: AlwaysBond[],
  me: string,
  isProvider: boolean,
): AlwaysBond[] => bonds.filter((b) => b.status === 'accepted' && bondIsMine(b, me, isProvider));
export const filterAlwaysIncoming = (
  bonds: AlwaysBond[],
  me: string,
  isProvider: boolean,
): AlwaysBond[] =>
  bonds.filter(
    (b) =>
      b.status === 'pending' &&
      bondIsMine(b, me, isProvider) &&
      bondInitiatedByOther(b, isProvider),
  );
export const filterAlwaysOutgoing = (
  bonds: AlwaysBond[],
  me: string,
  isProvider: boolean,
): AlwaysBond[] =>
  bonds.filter(
    (b) =>
      b.status === 'pending' &&
      bondIsMine(b, me, isProvider) &&
      !bondInitiatedByOther(b, isProvider),
  );

export const selectUnreadCount = (s: State): number => {
  const seller = selectSellerView(s);
  return s.notifications.filter((n) => !n.read && inAudience(n, seller)).length;
};

export const selectActiveBookings = (s: State): Appointment[] =>
  s.bookings.filter((b) => b.status === 'confirmed' || b.status === 'pending');

/**
 * EKRANDA GÖSTERİLECEK PORTRE — kesik portre yalnız GEÇERLİYSE kullanılır.
 *
 * Ana ekran doğrudan `cutoutUri ?? avatarUri` okuyordu. Portreyi hangi
 * fotoğraftan üretildiğine bağlayan hiçbir şey olmadığı için, fotoğraf
 * değiştikten sonra eski yüz ekranda kalabiliyordu ("profildeki foto ile ana
 * sayfadaki foto farklı"). Bağ artık `cutoutFor` ile kuruluyor: anahtar
 * eşleşmezse portre BAYAT sayılır ve gerçek fotoğraf gösterilir.
 *
 * Anahtarı olmayan ESKİ kayıtlar da bayat sayılır — bilinmeyeni geçerli
 * varsaymak, hatanın kendisiydi. Kullanıcı fotoğrafını bir daha seçtiğinde
 * portre yeniden üretilir ve bağ kurulur.
 *
 * Dönen değer string|null olduğu için seçici referans olarak KARARLIDIR
 * (useSyncExternalStore döngüsüne yol açmaz).
 */
export const selectPortrait = (s: State): string | null => {
  const { cutoutUri, cutoutFor, avatarUri } = s;
  if (cutoutUri && cutoutFor && cutoutFor === medyaAnahtari(avatarUri)) return cutoutUri;
  return avatarUri ?? null;
};
