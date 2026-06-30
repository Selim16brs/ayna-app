import { create } from 'zustand';
import type { MessageKey } from '@ayna/i18n';
import { api } from './api';
import {
  type AppNotification,
  type Appointment,
  type BookingSource,
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
  dateLabel: string;
  price: number;
  inDays?: number;
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
  ledger: LedgerEntry[];
  userReviews: Record<string, Review[]>;
  notifications: AppNotification[];

  // bookings
  addBooking: (input: AddBookingInput) => string;
  cancelBooking: (id: string) => void;
  reviewBooking: (id: string, rating: number, text: string) => void;
  hydrateBookings: () => Promise<void>;

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
  redeem: (reward: Reward) => boolean;

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
  ledger: SEED_LEDGER,
  userReviews: {},
  notifications: SEED_NOTIFICATIONS,

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
      dateLabel: input.dateLabel,
      inDays: input.inDays ?? 2,
      price: input.price,
      status: input.status ?? 'confirmed',
    };
    set((s) => ({ bookings: [booking, ...s.bookings] }));
    // Backend'e yaz (best-effort; offline'da sessizce geçilir)
    void api.createBooking(booking).catch(() => undefined);
    get().pushNotification({
      type: 'booking',
      title: 'Randevun oluşturuldu',
      body: `${input.proName} · ${input.dateLabel} · ${input.service}`,
      dateLabel: 'Az önce',
      icon: 'calendar-outline',
    });
    return id;
  },

  cancelBooking: (id) => {
    set((s) => ({
      bookings: s.bookings.map((b) => (b.id === id ? { ...b, status: 'cancelled' } : b)),
    }));
    void api.cancelBooking(id).catch(() => undefined);
  },

  hydrateBookings: async () => {
    try {
      const remote = await api.bookings();
      if (remote.length === 0) return;
      const remoteIds = new Set(remote.map((b) => b.id));
      set((s) => ({ bookings: [...remote, ...s.bookings.filter((b) => !remoteIds.has(b.id))] }));
    } catch {
      // API erişilemez → yerel tohum korunur (offline-first)
    }
  },

  reviewBooking: (id, rating, text) => {
    const b = get().bookings.find((x) => x.id === id);
    set((s) => ({
      bookings: s.bookings.map((x) => (x.id === id ? { ...x, reviewed: true } : x)),
    }));
    if (b) {
      const review: Review = {
        id: nextId('rv'),
        author: 'Sen',
        period: 'Az önce',
        rating,
        service: b.service,
        text,
        firstVisit: false,
      };
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

  earn: (points, labelKey, detail) =>
    set((s) => ({
      points: s.points + points,
      ledger: [
        { id: nextId('le'), kind: 'earn', labelKey, detail, points, dateLabel: 'Az önce' },
        ...s.ledger,
      ],
    })),

  redeem: (reward) => {
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
