import { create } from 'zustand';
import type { MessageKey } from '@ayna/i18n';
import { api, type AuthSession, type AuthUser, type LoyaltyTier } from './api';
import { formatSlotTr } from './datetime';
import {
  type AppNotification,
  type Appointment,
  type BookingSource,
  DEPOSIT_KZT,
  buildUpcomingEvents,
  type CareRoutine,
  type CirclePost,
  type CirclePostType,
  type LedgerEntry,
  type Moment,
  type PersonalLog,
  type PersonalTone,
  type Review,
  type Reward,
  SEED_APPOINTMENTS,
  SEED_CARE_ROUTINES,
  SEED_CIRCLE_POSTS,
  SEED_LEDGER,
  SEED_MOMENTS,
  SEED_NOTIFICATIONS,
  SEED_PERSONAL_LOGS,
  type UpcomingEvent,
} from './data';

let seq = 5000;
const nextId = (prefix: string) => `${prefix}${++seq}`;

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
}

export interface AddPostInput {
  type: CirclePostType;
  category: string;
  text: string;
  anonymous: boolean;
}

interface State {
  bookings: Appointment[];
  circlePosts: CirclePost[];
  careRoutines: CareRoutine[];
  personalLogs: PersonalLog[];
  moments: Moment[];
  favorites: string[];
  points: number;
  raffleEntries: number;
  tier: LoyaltyTier | null;
  ledger: LedgerEntry[];
  userReviews: Record<string, Review[]>;
  notifications: AppNotification[];
  token: string | null;
  currentUser: AuthUser | null;

  // auth
  setAuth: (session: AuthSession) => void;
  markPhoneVerified: () => void;
  logout: () => void;

  // bookings
  addBooking: (input: AddBookingInput) => string;
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
  markNoShow: (id: string) => void; // §4.4 — uzman "gelmedi" işaretler
  reviewBooking: (id: string, rating: number, text: string) => void;
  hydrateBookings: () => Promise<void>;

  // gizlilik: değerlendirmede kimliği gizle (salon/uzman yorum sahibini göremez)
  reviewAnonymous: boolean;
  setReviewAnonymous: (v: boolean) => void;

  // favorites
  toggleFavorite: (proId: string) => void;

  // personal
  addPersonalLog: (input: AddPersonalLogInput) => void;
  deletePersonalLog: (id: string) => void;
  addMoment: (input: AddMomentInput) => void;
  addRoutine: (input: AddRoutineInput) => void;
  completeRoutine: (id: string) => void;

  // circle
  addPost: (input: AddPostInput) => string;
  toggleHelpful: (postId: string) => void;
  addComment: (postId: string, text: string, anonymous: boolean) => void;

  // loyalty
  earn: (points: number, labelKey: MessageKey, detail: string) => void;
  redeem: (reward: Reward) => Promise<boolean>;
  hydrateLoyalty: () => Promise<void>;

  // şehir (global filtre)
  setCity: (city: string) => void;

  // notifications
  pushNotification: (n: Omit<AppNotification, 'id' | 'read'>) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
}

export const useStore = create<State>((set, get) => ({
  bookings: SEED_APPOINTMENTS,
  circlePosts: SEED_CIRCLE_POSTS,
  careRoutines: SEED_CARE_ROUTINES,
  personalLogs: SEED_PERSONAL_LOGS,
  moments: SEED_MOMENTS,
  favorites: ['3'],
  points: 340,
  raffleEntries: 5,
  tier: null,
  ledger: SEED_LEDGER,
  userReviews: {},
  reviewAnonymous: true,
  notifications: SEED_NOTIFICATIONS,
  token: null,
  currentUser: null,

  setAuth: (session) => {
    set({ token: session.token, currentUser: session.user });
    void get().hydrateLoyalty();
    void get().hydrateBookings();
  },
  markPhoneVerified: () =>
    set((s) => (s.currentUser ? { currentUser: { ...s.currentUser, phoneVerified: true } } : {})),
  logout: () => set({ token: null, currentUser: null }),

  setCity: (city) =>
    set((s) => (s.currentUser ? { currentUser: { ...s.currentUser, city } } : {})),

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
    };
    set((s) => ({ bookings: [booking, ...s.bookings] }));
    // Backend'e yaz (best-effort; offline'da sessizce geçilir). Token → sahibine bağlanır.
    void api.createBooking(booking, get().token ?? undefined).catch(() => undefined);
    get().pushNotification({
      type: 'booking',
      title: 'Randevu isteğin gönderildi',
      body: `${input.proName} · ${formatSlotTr(input.startMs)} · uzman onayı bekleniyor`,
      dateLabel: 'Az önce',
      icon: 'calendar-outline',
    });
    return id;
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
      title: 'Bekleme listesine eklendin',
      body: `${pro.name} · yer açılınca öncelikli bildirim alacaksın`,
      dateLabel: 'Az önce',
      icon: 'hourglass-outline',
    });
  },

  cancelBooking: (id, reason) => {
    set((s) => ({
      bookings: s.bookings.map((b) =>
        b.id === id ? { ...b, status: 'cancelled', cancelReason: reason } : b,
      ),
    }));
    void api.cancelBooking(id, reason).catch(() => undefined);
  },

  // §1.6 — kullanıcı uzmanın önerdiği alternatif saati kabul eder
  acceptAlternative: (id) => {
    set((s) => ({
      bookings: s.bookings.map((b) =>
        b.id === id
          ? {
              ...b,
              status: 'confirmed',
              startMs: b.proposedStartMs ?? b.startMs,
              proposedStartMs: undefined,
            }
          : b,
      ),
    }));
    void api.acceptBooking(id).catch(() => undefined);
  },

  // §4.1 adım 4 — uzman kabul etti → depozito adımı açılır (§4.3)
  approveBooking: (id) => {
    set((s) => ({
      bookings: s.bookings.map((b) =>
        b.id === id ? { ...b, status: 'deposit_pending', depositAmount: DEPOSIT_KZT } : b,
      ),
    }));
    void api.approveBooking(id).catch(() => undefined);
    const b = get().bookings.find((x) => x.id === id);
    if (b)
      get().pushNotification({
        type: 'booking',
        title: 'Randevun ön onaylandı',
        body: `${b.proName} · ${formatSlotTr(b.startMs)} · ${DEPOSIT_KZT}₸ depozito gönder ve dekontu yükle`,
        dateLabel: 'Az önce',
        icon: 'card-outline',
        route: `/booking/${id}`,
      });
  },

  // §4.1 — uzman reddetti
  rejectBooking: (id) => {
    set((s) => ({
      bookings: s.bookings.map((b) => (b.id === id ? { ...b, status: 'cancelled' } : b)),
    }));
    void api.cancelBooking(id, 'provider_rejected').catch(() => undefined);
    const b = get().bookings.find((x) => x.id === id);
    if (b)
      get().pushNotification({
        type: 'booking',
        title: 'Randevu talebin yanıtlandı',
        body: `${b.proName} · talebini şu an karşılayamadı`,
        dateLabel: 'Az önce',
        icon: 'close-circle-outline',
      });
  },

  // §4.1 adım 2 — uzman alternatif saat önerir (boş slotundan seçer)
  proposeAlternative: (id, startMs) => {
    set((s) => ({
      bookings: s.bookings.map((b) =>
        b.id === id ? { ...b, status: 'alternative_proposed', proposedStartMs: startMs } : b,
      ),
    }));
    void api.proposeBooking(id, startMs).catch(() => undefined);
    const b = get().bookings.find((x) => x.id === id);
    if (b)
      get().pushNotification({
        type: 'booking',
        title: 'Uzman alternatif saat önerdi',
        body: `${b.proName} · ${formatSlotTr(startMs)}`,
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
    const b = get().bookings.find((x) => x.id === id);
    if (b)
      get().pushNotification({
        type: 'booking',
        title: 'Dekontun gönderildi',
        body: `${b.proName} · uzman onayı bekleniyor`,
        dateLabel: 'Az önce',
        icon: 'receipt-outline',
      });
  },

  // §4.3 adım 3 — uzman dekontu görür → "Aldım, onaylıyorum" → randevu KESİN
  confirmReceipt: (id) => {
    set((s) => ({
      bookings: s.bookings.map((b) => (b.id === id ? { ...b, status: 'confirmed' } : b)),
    }));
    const b = get().bookings.find((x) => x.id === id);
    if (b)
      get().pushNotification({
        type: 'booking',
        title: 'Randevun kesinleşti',
        body: `${b.proName} · ${formatSlotTr(b.startMs)}`,
        dateLabel: 'Az önce',
        icon: 'checkmark-circle-outline',
        route: `/booking/${id}`,
      });
  },

  // §4.4 — uzman kullanıcıyı "gelmedi" işaretler (istatistik bütünlüğü)
  markNoShow: (id) => {
    set((s) => ({
      bookings: s.bookings.map((b) => (b.id === id ? { ...b, status: 'no_show' } : b)),
    }));
  },

  hydrateBookings: async () => {
    try {
      // Giriş yapıldıysa yalnızca kullanıcının randevuları; yoksa yerel tohum korunur
      const token = get().token;
      const remote = token ? await api.myBookings(token) : [];
      if (remote.length === 0) return;
      const remoteIds = new Set(remote.map((b) => b.id));
      set((s) => ({ bookings: [...remote, ...s.bookings.filter((b) => !remoteIds.has(b.id))] }));
    } catch {
      // API erişilemez → yerel tohum korunur (offline-first)
    }
  },

  setReviewAnonymous: (v) => set({ reviewAnonymous: v }),

  reviewBooking: (id, rating, text) => {
    const b = get().bookings.find((x) => x.id === id);
    const anon = get().reviewAnonymous;
    // Gizlilik: anonimse "Doğrulanmış üye"; değilse kullanıcının ilk adı
    const firstName = get().currentUser?.name?.trim().split(/\s+/)[0];
    const authorLabel = anon || !firstName ? 'Doğrulanmış üye' : firstName;
    set((s) => ({
      bookings: s.bookings.map((x) => (x.id === id ? { ...x, reviewed: true } : x)),
    }));
    if (b) {
      const review: Review = {
        id: nextId('rv'),
        author: authorLabel,
        period: 'Az önce',
        rating,
        service: b.service,
        text,
        firstVisit: false,
      };
      // Backend'e gönder — doğrulanmış yorum (giriş zorunlu; sunucu randevuyu denetler)
      const token = get().token;
      if (token) {
        void api
          .submitRating(token, {
            bookingId: b.id,
            raterRole: 'user',
            score: rating,
            comment: text,
            serviceTag: b.service,
            authorLabel,
          })
          .catch(() => undefined);
      }
      set((s) => ({
        userReviews: { ...s.userReviews, [b.proId]: [review, ...(s.userReviews[b.proId] ?? [])] },
      }));
      get().earn(40, 'rewards.earn.review', b.proName);
    }
  },

  toggleFavorite: (proId) =>
    set((s) => ({
      favorites: s.favorites.includes(proId)
        ? s.favorites.filter((x) => x !== proId)
        : [proId, ...s.favorites],
    })),

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
        },
        ...s.personalLogs,
      ],
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
          icon: input.icon ?? 'sparkles-outline',
        },
        ...s.careRoutines,
      ],
    })),

  completeRoutine: (id) =>
    set((s) => ({
      careRoutines: s.careRoutines.map((x) => (x.id === id ? { ...x, dueDays: 30 } : x)),
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
    return id;
  },

  toggleHelpful: (postId) =>
    set((s) => ({
      circlePosts: s.circlePosts.map((p) =>
        p.id === postId
          ? {
              ...p,
              helpfulByMe: !p.helpfulByMe,
              helpful: p.helpful + (p.helpfulByMe ? -1 : 1),
            }
          : p,
      ),
    })),

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
      notifications: [{ ...n, id: nextId('n'), read: false }, ...s.notifications],
    })),

  markNotificationRead: (id) =>
    set((s) => ({
      notifications: s.notifications.map((x) => (x.id === id ? { ...x, read: true } : x)),
    })),

  markAllNotificationsRead: () =>
    set((s) => ({ notifications: s.notifications.map((x) => ({ ...x, read: true })) })),
}));

// ── Türetilmiş seçiciler (hook'larda kullanılabilir) ─────────────────────
export const selectUpcomingEvents = (s: State): UpcomingEvent[] =>
  buildUpcomingEvents(s.bookings, s.moments, s.careRoutines);

export const selectUnreadCount = (s: State): number =>
  s.notifications.filter((n) => !n.read).length;

export const selectActiveBookings = (s: State): Appointment[] =>
  s.bookings.filter((b) => b.status === 'confirmed' || b.status === 'pending');
