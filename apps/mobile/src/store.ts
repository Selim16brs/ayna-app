import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { MessageKey } from '@ayna/i18n';
import { api, type AppConfig, type AuthSession, type AuthUser, type LoyaltyTier } from './api';
import { formatSlotTr } from './datetime';
import { getCurrentLocale } from './locale';
import {
  type AppNotification,
  type Appointment,
  type BookingSource,
  type DemandMode,
  type DemandRequest,
  type Promotion,
  DEPOSIT_KZT,
  POINTS_SPEND_CAP_PCT,
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
  SELLER_PAST_CLIENTS,
  type AlwaysBond,
  COMMISSION_PCT_STANDARD,
  COMMISSION_PCT_PLATINUM,
  reengageMessage,
  type UpcomingEvent,
  type UserAddress,
} from './data';
import { findServiceWithCategory, servicesOf, tri } from './taxonomy';
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
  // §8.1 — puan kazanım limitleri: ilk randevu 300 (tek seferlik) + W2W beğeni 1/ay maks 100
  firstBookingBonusGiven: boolean;
  w2wLikeMonth: string;
  w2wLikePoints: number;
  tier: LoyaltyTier | null;
  ledger: LedgerEntry[];
  userReviews: Record<string, Review[]>;
  notifications: AppNotification[];
  token: string | null;
  currentUser: AuthUser | null;
  // Profil fotoğrafı (galeri/kamera; kaldırılabilir). Kalıcı saklanır.
  avatarUri: string | null;
  setAvatar: (uri: string | null) => void;
  // §5.1.1 — remove.bg cut-out (arka planı temizlenmiş şeffaf PNG). Keşfet/uzman ana sayfa hero'sunda.
  cutoutUri: string | null;
  setCutout: (uri: string | null) => void;
  // Yerel foto base64 → cut-out uygula. Sonuç: 'ok' | 'not_premium' | 'unavailable' | 'error'.
  applyProfileCutout: (base64: string) => Promise<'ok' | 'not_premium' | 'unavailable' | 'error'>;
  // §6.1 — uzman/salon hizmet kataloğu (taksonomi id → fiyat/süre). Profil "Hizmetler" ekranından
  // yönetilir; offline randevu akışında hazır (accordion) seçim olarak kullanılır. Kalıcı saklanır.
  sellerServices: Record<string, SellerServiceRow>;
  setSellerServices: (map: Record<string, SellerServiceRow>) => void;
  // §9.5 — uzman/salon profil verileri (kayıt sonrası düzenlenebilir). Kalıcı saklanır.
  sellerSocial: SocialValue;
  sellerHours: DayHours[];
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
  requestAlways: (input: {
    providerName: string;
    providerImage?: string;
    customerName: string;
    customerImage?: string;
    initiator: 'provider' | 'customer';
    lastServiceId?: string;
  }) => void;
  acceptAlways: (id: string) => void;
  declineAlways: (id: string) => void;
  removeAlways: (id: string) => void;
  // Platinum toplu bildirim — Always listesindeki müşterilere; kaç alıcıya gittiğini döndürür
  sendAlwaysBroadcast: (input: { title: string; body: string }) => number;
  // Faz 3 — dolu uzmana bekleme listesine eklenme
  joinWaitlist: (pro: { id: string; name: string; image: string; service: string }) => void;
  cancelBooking: (id: string, reason?: string) => void;
  acceptAlternative: (id: string) => void;
  // §4.1/§4.3 — uzman yanıtı + depozito/dekont akışı
  approveBooking: (id: string) => void; // uzman kabul → depozito adımı açılır
  rejectBooking: (id: string) => void; // uzman reddet → iptal
  proposeAlternative: (id: string, startMs: number) => void; // uzman alternatif saat önerir
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
  }) => Promise<string | null>; // → talep id (backend) | null = hata
  hydrateDemands: () => Promise<void>; // taleplerim + gelen teklifleri buluttan çek
  selectOffer: (demandId: string, offerId: string, slotMs: number) => Promise<string | null>; // → booking id
  expireDemands: () => void; // süresi dolan talepleri işaretle
  addRecentSearch: (q: string) => void; // §5.1.2 — son aramaya ekle (dedup, en fazla 8)
  toggleNotifPref: (key: 'care' | 'moment' | 'personal' | 'booking') => void; // §5.4
  // §5.2 Faz A — uzman tarafı: açık talebe teklif BULUTA gider (true=başarılı)
  submitOffer: (
    demandId: string,
    offer: { price: number; etaMin: number; note?: string; slots: number[] },
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

  // gizlilik: değerlendirmede kimliği gizle (salon/uzman yorum sahibini göremez)
  reviewAnonymous: boolean;
  setReviewAnonymous: (v: boolean) => void;

  // favorites
  toggleFavorite: (proId: string) => void;
  toggleFollow: (author: string) => void;
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
  addComment: (postId: string, text: string, anonymous: boolean) => void;
  // §5.5 — moderasyon katman 2: şikâyet et (eşik aşınca gizlenir + admin kuyruğu)
  reportedPosts: string[];
  reportPost: (postId: string) => void;

  // loyalty
  earn: (points: number, labelKey: MessageKey, detail: string) => void;
  redeem: (reward: Reward) => Promise<boolean>;
  enterRaffle: () => boolean; // §8.2 — 500 puan = 1 çekiliş bileti
  hydrateLoyalty: () => Promise<void>;
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
  followerNames: [],
  circlePosts: [], // W2W tohumları da girişli hesapta yok; gerçek gönderiler loadContent ile gelir

  demands: [],
  points: 0,
  raffleEntries: 0,
  tier: null,
  ledger: [],
  notifications: [],
  userReviews: {},
  favorites: [],
  addresses: [],
  careRoutines: [],
  personalLogs: [],
  firstBookingBonusGiven: false,
  w2wLikeMonth: '',
  w2wLikePoints: 0,
};

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      bookings: [],
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
          commissionPct: 15, // MD %15 (fetch başarısızsa fallback)
          depositKzt: DEPOSIT_KZT,
          cancelWindowH: 3,
          lateCancelPct: 3,
          pointsCapPct: POINTS_SPEND_CAP_PCT,
          premiumUserKzt: PREMIUM_PRICE_KZT,
          premiumSalonKzt: 4990,
          raffleCost: RAFFLE_COST,
        },
        cities: { active: ['Almatı'], soon: ['Astana', 'Şımkent'] },
        features: { removebg: false, openai: false, sms: false },
      },
      loadContent: async () => {
        try {
          const [rows, theme, cfg] = await Promise.all([
            api.contentArticles(),
            api.contentTheme(),
            api.appConfig(),
          ]);
          set({
            // Backend'de yayınlanmış yazı yoksa seed'i koru (app boş kalmasın)
            articles: rows,
            weeklyTheme: theme ? { id: theme.id, title: theme.title, prompt: theme.prompt } : null,
            config: cfg,
          });
        } catch {
          // Backend erişilemezse seed makaleler + varsayılan config ile devam
        }
        // §5.5 — backend'de yayınlanmış W2W gönderilerini akışa ekle (additive; yereli silmez)
        try {
          const backendPosts = await api.circlePosts();
          set((s) => {
            const have = new Set(s.circlePosts.map((p) => p.id));
            const fresh: CirclePost[] = backendPosts
              .filter((p) => !have.has(p.id))
              .map((p) => ({
                id: p.id,
                type: 'experience' as CirclePostType,
                category: p.category,
                author: p.authorLabel,
                anonymous: p.anonymous,
                text: p.text,
                helpful: p.helpful,
                comments: [], // backend yorum SAYISI döner; detay senkronu ayrı (şimdilik boş)
              }));
            return fresh.length ? { circlePosts: [...fresh, ...s.circlePosts] } : {};
          });
        } catch {
          // Backend erişilemezse seed gönderilerle devam
        }
        // §12.10 — segmentine uyan toplu duyuruları bildirim listesine ekle (girişliyse)
        const token = get().token;
        if (!token) return;
        // §12.3 — kısıt durumunu tazele (admin ceza uygularsa re-login gerekmesin)
        try {
          const me = await api.me(token);
          // §11 — üyelik katmanını backend'den senkronla (admin onayı sonrası premium/platinum açılır)
          const tier = me.membershipTier ?? 'free';
          set((s) =>
            s.currentUser
              ? {
                  currentUser: {
                    ...s.currentUser,
                    restricted: me.restricted,
                    restrictedDaysLeft: me.restrictedDaysLeft,
                    membershipTier: tier,
                    membershipUntil: me.membershipUntil ?? null,
                  },
                  premium: tier === 'premium' || tier === 'platinum',
                  platinum: tier === 'platinum',
                }
              : {},
          );
        } catch {
          // /me erişilemezse mevcut currentUser korunur
        }
        try {
          const anns = await api.announcements(token, getCurrentLocale()); // §14.5 — kullanıcı dilinde
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
      followerNames: [],
      addresses: [],
      premium: false,
      platinum: false,
      reengagedIds: [],
      autoReengageEnabled: true,
      alwaysBonds: [],
      points: 0,
      raffleEntries: 0,
      firstBookingBonusGiven: false,
      w2wLikeMonth: '',
      w2wLikePoints: 0,
      tier: null,
      ledger: [],
      userReviews: {},
      reviewAnonymous: true,
      notifications: [],
      token: null,
      currentUser: null,
      sellerTrialStart: null,
      // Mevcut profilde başlangıç fotoğrafı (kullanıcı değiştirebilir/kaldırabilir)
      avatarUri: null,
      setAvatar: (uri) => {
        set({ avatarUri: uri });
        // Foto HESABIN parçası: buluta da yaz (data URL ise) — diğer cihaz/girişte aynı görünür
        const token = get().token;
        if (token && (uri == null || uri.startsWith('data:')))
          void api.setAvatar(token, uri).catch(() => undefined);
      },
      cutoutUri: null,
      setCutout: (uri) => set({ cutoutUri: uri }),
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
          set({ cutoutUri: dataUrl });
          return 'ok';
        } catch {
          return 'error';
        }
      },
      sellerServices: seedSellerServices(),
      setSellerServices: (map) => set({ sellerServices: map }),
      sellerSocial: emptySocial,
      sellerHours: defaultHours(),
      sellerCerts: [],
      setSellerProfile: (p) =>
        set((s) => ({
          ...(p.social ? { sellerSocial: p.social } : {}),
          ...(p.hours ? { sellerHours: p.hours } : {}),
          ...(p.certs ? { sellerCerts: p.certs } : {}),
        })),
      salonProfile: {
        photos: [],
        about: 'Almatı merkezde, hijyen ve kaliteye önem veren güzellik salonu.',
        address: 'Almatı, Dostyk 12',
        contact: '+7 727 000 00 00',
        areas: ['hair', 'nails', 'brows'],
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
                ...SEEDED_PERSONAL_RESET,
                avatarUri: session.user.avatarUrl ?? null, // hesabın fotosu her cihazda
                cutoutUri: null,
                premium: false,
                platinum: false,
                sellerSocial: emptySocial,
                sellerCerts: [],
              };
          return {
            token: session.token,
            currentUser: session.user,
            sellerTrialStart,
            ...personalReset,
            // aynı kullanıcı yeniden girdi + sunucuda foto varsa yereli tazele
            ...(sameUser && session.user.avatarUrl ? { avatarUri: session.user.avatarUrl } : {}),
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
      logout: () => set({ token: null, currentUser: null }),

      setCity: (city) =>
        set((s) => (s.currentUser ? { currentUser: { ...s.currentUser, city } } : {})),

      // §9.5 — MÜŞTERİ profil güncelleme: anında uygulanır (currentUser persist edilir).
      // Salon/uzman DEĞİL — onların değişikliği admin onayına gider (submitProfileChange).
      updateMyProfile: (patch) =>
        set((s) => (s.currentUser ? { currentUser: { ...s.currentUser, ...patch } } : {})),

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
        // Backend'e yaz (best-effort; offline'da sessizce geçilir). Token → sahibine bağlanır.
        void api.createBooking(booking, get().token ?? undefined).catch(() => undefined);
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
        void api.createBooking(booking, get().token ?? undefined).catch(() => undefined);
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
      setAutoReengage: (v) => set({ autoReengageEnabled: v }),

      // §10/§4/§11 — SİSTEM OTOMATİK geri çağırma: premium + toggle açık uzmanda.
      // KURAL (spam önleme): yalnız TAM İKİ bildirim — periyot bitişine 1 gün kala ('pre')
      // ve bitiş günü ('due'). Ne öncesi ne sonrası; alakasız zamanlarda GÖNDERİLMEZ.
      runAutoReengage: (locale) => {
        const s = get();
        if (s.currentUser?.role !== 'professional') return; // yalnız uzman
        if (!s.premium) return; // §11 — PREMIUM özelliği
        if (!s.autoReengageEnabled) return; // uzman kapatmışsa gönderme
        const now = Date.now();
        const expertName = s.currentUser?.name ?? 'Uzman';
        for (const c of SELLER_PAST_CLIENTS) {
          const found = findServiceWithCategory(c.serviceId);
          const period = found?.service.periodDays ?? 30;
          const dueMs = c.lastVisitMs + period * 24 * 60 * 60_000; // periyot bitiş anı
          const daysUntil = Math.round((dueMs - now) / (24 * 60 * 60_000)); // +1 = yarın, 0 = bugün
          let stage: 'pre' | 'due' | null = null;
          if (daysUntil === 1)
            stage = 'pre'; // 1 gün kala
          else if (daysUntil === 0) stage = 'due'; // bitiş günü
          if (!stage) continue; // pencere dışı → gönderme
          if (s.reengagedIds.includes(`${c.id}#${stage}`)) continue; // bu aşama zaten gitti (idempotent)
          const label = found ? tri(found.service.label, locale) : c.serviceId;
          get().sendReengage({
            clientId: c.id,
            stage,
            serviceId: c.serviceId,
            customerName: c.name,
            serviceLabel: label,
            expertName,
          });
        }
      },

      // §10/§4 — memnun müşteriye sıcak bildirim gönderir (runAutoReengage çağırır).
      // 'pre' (1 gün kala) → genel "yaklaşıyor" şablonu; 'due' (bitiş günü) → kategoriye özel samimi şablon.
      // Bildirim müşteri modunda görünür (audience 'user').
      sendReengage: (input) => {
        const key = `${input.clientId}#${input.stage}`;
        if (get().reengagedIds.includes(key)) return; // aynı aşama tekrar gönderilmez (spam önleme)
        const tpl = reengageMessage(input.serviceId, input.stage); // §11 — hizmete özel 2 mesajdan biri
        get().pushNotification({
          type: 'quote', // dokununca talep/randevu köprüsüne gider (retention → gelir)
          audience: 'user',
          titleKey: tpl.titleKey,
          bodyKey: tpl.bodyKey,
          params: { expert: input.expertName, service: input.serviceLabel },
          dateLabel: 'Az önce',
          icon: tpl.icon,
        });
        set((s) => ({ reengagedIds: [...s.reengagedIds, key] }));
      },

      // §11 — PLATINUM paket aç/kapat (satın alma). Komisyon oranını da etkiler (%10 → %8,5).
      setPlatinum: (v) => set({ platinum: v, ...(v ? { premium: true } : {}) }), // platinum → premium da açık

      // §11 — ALWAYS bağ isteği aç (karşı taraf kabul edene kadar 'pending')
      requestAlways: (input) => {
        const bond: AlwaysBond = {
          id: nextId('ab'),
          providerName: input.providerName,
          ...(input.providerImage ? { providerImage: input.providerImage } : {}),
          customerName: input.customerName,
          ...(input.customerImage ? { customerImage: input.customerImage } : {}),
          initiator: input.initiator,
          status: 'pending',
          ...(input.lastServiceId ? { lastServiceId: input.lastServiceId } : {}),
          createdMs: Date.now(),
        };
        set((s) => ({ alwaysBonds: [bond, ...s.alwaysBonds] }));
        // karşı tarafa bildirim (demo: audience karşı role göre)
        get().pushNotification({
          type: 'system',
          audience: input.initiator === 'provider' ? 'user' : 'seller',
          titleKey: 'notif.always_request',
          bodyKey: 'notif.always_request_b',
          params: {
            name: input.initiator === 'provider' ? input.providerName : input.customerName,
          },
          dateLabel: 'Az önce',
          icon: 'heart-circle-outline',
          route: '/always',
        });
      },

      // §11 — gelen ALWAYS isteğini kabul et → bağ kurulur
      acceptAlways: (id) =>
        set((s) => ({
          alwaysBonds: s.alwaysBonds.map((b) => (b.id === id ? { ...b, status: 'accepted' } : b)),
        })),

      // §11 — gelen isteği reddet / bağı kaldır (sessiz)
      declineAlways: (id) =>
        set((s) => ({ alwaysBonds: s.alwaysBonds.filter((b) => b.id !== id) })),
      removeAlways: (id) => set((s) => ({ alwaysBonds: s.alwaysBonds.filter((b) => b.id !== id) })),

      // §11 — PLATINUM toplu bildirim: Always listesindeki (kabul edilmiş) müşterilere.
      // SORUMLULUK: içerik uzman/salona aittir (sözleşme §sorumluluk). Kaç alıcıya gittiğini döndürür.
      sendAlwaysBroadcast: (input) => {
        const s = get();
        const me = s.currentUser?.name ?? '';
        const isProvider =
          s.currentUser?.role === 'professional' || s.currentUser?.role === 'salon';
        const recipients = s.alwaysBonds.filter(
          (b) =>
            b.status === 'accepted' && (isProvider ? b.providerName === me : b.customerName === me),
        );
        if (recipients.length === 0) return 0;
        // Demo: tek özet bildirim (gerçekte her alıcıya sunucu-taraflı push). audience müşteri.
        get().pushNotification({
          type: 'system',
          audience: 'user',
          title: input.title,
          body: input.body,
          dateLabel: 'Az önce',
          icon: 'megaphone-outline',
        });
        return recipients.length;
      },

      // Faz 3 — bekleme listesi: dolu uzmana eklenir, yer açılınca bildirilir (auto-promote ileride)
      joinWaitlist: (pro) => {
        const id = nextId('bk');
        const booking: Appointment = {
          id,
          source: 'direct',
          service: pro.service,
          proId: pro.id,
          proName: pro.name,
          proImage: pro.image,
          // Bekleme listesinde henüz slot yok — yer açılınca gerçek startMs atanır (Faz 3).
          startMs: Date.now(),
          durationMin: 0,
          price: 0,
          status: 'waitlist',
        };
        set((s) => ({ bookings: [booking, ...s.bookings] }));
        void api.createBooking(booking, get().token ?? undefined).catch(() => undefined);
        get().pushNotification({
          type: 'booking',
          titleKey: 'notif.waitlist',
          bodyKey: 'notif.waitlist_b',
          params: { pro: pro.name },
          dateLabel: 'Az önce',
          icon: 'hourglass-outline',
          route: `/booking/${id}`,
        });
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
        if (next === 'refund_pending')
          void api.freeCancelBooking(id, reason).catch(() => undefined);
        else void api.cancelBooking(id, reason).catch(() => undefined);
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
              params: { pro: b.proName, deposit: DEPOSIT_KZT },
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
      toggleClosedDay: (dayStartMs) =>
        set((s) => ({
          closedDays: s.closedDays.includes(dayStartMs)
            ? s.closedDays.filter((d) => d !== dayStartMs)
            : [...s.closedDays, dayStartMs],
        })),

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
        if (!token) return;
        try {
          const remote = await api.myQuoteRequests(token);
          const remoteIds = new Set(remote.map((d) => d.id));
          set((s) => ({
            // Sunucudakiler esas; yerelde kalan (tohum/uzman-havuzu) kayıtlar kullanıcının
            // Taleplerim'ine karışmasın diye yalnız 'seeded' olanlar korunur.
            demands: remote,
          }));
        } catch {
          // çevrimdışı: eldeki liste korunur
        }
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
      toggleNotifPref: (key) =>
        set((s) => ({ notifPrefs: { ...s.notifPrefs, [key]: !s.notifPrefs[key] } })),

      setDemandNotif: (p) => set((s) => ({ demandNotif: { ...s.demandNotif, ...p } })),

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
        set((s) => ({
          bookings: s.bookings.map((b) =>
            b.id === id ? { ...b, status: 'confirmed', reassignedFrom: undefined } : b,
          ),
        }));
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
                  depositAmount: DEPOSIT_KZT,
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
            params: { pro: b.proName, slot: formatSlotTr(b.startMs), deposit: DEPOSIT_KZT },
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
                  depositAmount: DEPOSIT_KZT,
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
            params: { pro: b.proName, slot: formatSlotTr(b.startMs), deposit: DEPOSIT_KZT },
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

      // §4.4 — uzman kullanıcıyı "gelmedi" işaretler → kapora uzmanda kalır (depositForfeited)
      markNoShow: (id) => {
        set((s) => ({
          bookings: s.bookings.map((b) =>
            b.id === id ? { ...b, status: 'no_show', depositForfeited: true } : b,
          ),
        }));
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
      },

      hydrateBookings: async () => {
        const token = get().token;
        // Giriş YOK → demo tohum (SEED_APPOINTMENTS) korunur.
        if (!token) return;
        try {
          const remote = await api.myBookings(token);
          const remoteIds = new Set(remote.map((b) => b.id));
          // Giriş YAPILDI → hesabın GERÇEK randevuları esas; mock tohumu AT (yeni hesap sıfır görünsün).
          // Yerelde oluşturulan (tohum olmayan) senkronlanmamış kayıtlar korunur.
          set((s) => ({
            bookings: [...remote, ...s.bookings.filter((b) => !remoteIds.has(b.id))],
          }));
        } catch {
          // API erişilemez → mevcut veriler korunur (offline-first)
        }
      },

      setReviewAnonymous: (v) => set({ reviewAnonymous: v }),

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
      replyToReview: (proId, reviewId, reply) =>
        set((s) => ({
          userReviews: {
            ...s.userReviews,
            [proId]: (s.userReviews[proId] ?? []).map((r) =>
              r.id === reviewId && !r.reply ? { ...r, reply: reply.trim() } : r,
            ),
          },
        })),

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
        get().pushNotification({
          type: 'system',
          titleKey: 'notif.review_dispute',
          bodyKey: 'notif.review_dispute_b',
          dateLabel: 'Az önce',
          icon: 'flag-outline',
        });
      },

      toggleFavorite: (proId) =>
        set((s) => ({
          favorites: s.favorites.includes(proId)
            ? s.favorites.filter((x) => x !== proId)
            : [proId, ...s.favorites],
        })),

      // W2W — kişi takip et / bırak (yazar adına göre)
      toggleFollow: (author) =>
        set((s) => ({
          following: s.following.includes(author)
            ? s.following.filter((x) => x !== author)
            : [author, ...s.following],
        })),

      // W2W — takipçiyi kaldır (mock listeden çıkar)
      removeFollower: (name) =>
        set((s) => ({ followerNames: s.followerNames.filter((x) => x !== name) })),

      // §5.6 — adres ekle/kaldır
      addAddress: (label, detail) => {
        if (!detail.trim()) return;
        set((s) => ({
          addresses: [...s.addresses, { id: nextId('ad'), label, detail: detail.trim() }],
        }));
      },
      removeAddress: (id) => set((s) => ({ addresses: s.addresses.filter((a) => a.id !== id) })),

      // §5.6.2 — premium aç/kapa (gerçekte app-dışı ödeme; burada mock)
      setPremium: (v) => set({ premium: v }),

      addPersonalLog: (input) =>
        set((s) => ({
          personalLogs: [
            {
              id: nextId('pl'),
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
        })),

      // §5.4 — kişisel kaydı düzenle (detay ekranından); note boşsa alanı temizle
      updatePersonalLog: (id, patch) =>
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
        })),

      deletePersonalLog: (id) =>
        set((s) => ({ personalLogs: s.personalLogs.filter((x) => x.id !== id) })),

      addMoment: (input) =>
        set((s) => ({
          moments: [
            {
              id: nextId('mo'),
              title: input.title,
              dateLabel: input.dateLabel,
              daysLeft: input.daysLeft,
              icon: input.icon ?? 'gift-outline',
            },
            ...s.moments,
          ],
        })),

      addRoutine: (input) =>
        set((s) => ({
          careRoutines: [
            {
              id: nextId('cr'),
              name: input.name,
              dueDays: input.dueDays,
              periodDays: input.dueDays, // ilk süre = döngü; "tamamladım" buna göre sıfırlar
              icon: input.icon ?? 'sparkles-outline',
              ...(input.categoryCode ? { categoryCode: input.categoryCode } : {}),
            },
            ...s.careRoutines,
          ],
        })),

      // "Tamamladım" → sayaç bakımın KENDİ periyoduna göre yeniden başlar (rastgele 30 değil)
      completeRoutine: (id) =>
        set((s) => ({
          careRoutines: s.careRoutines.map((x) =>
            x.id === id ? { ...x, dueDays: x.periodDays > 0 ? x.periodDays : 30 } : x,
          ),
        })),

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

      addComment: (postId, text, anonymous) =>
        set((s) => ({
          circlePosts: s.circlePosts.map((p) =>
            p.id === postId
              ? {
                  ...p,
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
        })),

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
        if (token) void api.earnPoints(token, points, labelKey, detail).catch(() => undefined);
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
        if (get().points < RAFFLE_COST) return false;
        set((s) => ({
          points: s.points - RAFFLE_COST,
          raffleEntries: s.raffleEntries + 1,
          ledger: [
            {
              id: nextId('le'),
              kind: 'spend',
              labelKey: 'rewards.raffle.entry',
              detail: 'Çekiliş bileti',
              points: -RAFFLE_COST,
              dateLabel: 'Az önce',
            },
            ...s.ledger,
          ],
        }));
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
          set((s) => ({
            currentUser: s.currentUser ? { ...s.currentUser, membershipTier: tier } : s.currentUser,
            premium: tier === 'premium' || tier === 'platinum',
            platinum: tier === 'platinum',
          }));
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

      markAllNotificationsRead: () =>
        set((s) => ({ notifications: s.notifications.map((x) => ({ ...x, read: true })) })),
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
        sellerTrialStart: s.sellerTrialStart, // §11 — 3 günlük ücretsiz deneme sayacı korunur
        avatarUri: s.avatarUri,
        cutoutUri: s.cutoutUri, // §5.1.1 — cut-out foto app yeniden açılınca korunur
        sellerServices: s.sellerServices,
        sellerSocial: s.sellerSocial,
        sellerHours: s.sellerHours,
        sellerCerts: s.sellerCerts,
        salonProfile: s.salonProfile,
        demandNotif: s.demandNotif,
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
  if (state.token) useStore.setState(SEEDED_PERSONAL_RESET);
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

// §12.8 — komisyon oranı: Platinum üyede %8,5, diğerlerinde %10.
export const selectCommissionRate = (s: State): number =>
  s.platinum ? COMMISSION_PCT_PLATINUM : COMMISSION_PCT_STANDARD;

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
