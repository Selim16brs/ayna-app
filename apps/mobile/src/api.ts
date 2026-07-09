import Constants from 'expo-constants';
import type {
  AdBanner,
  Appointment,
  Campaign,
  DemandMode,
  DemandRequest,
  LedgerEntry,
  Professional,
  ProfessionalDetail,
} from './data';
import { getCurrentLocale } from './locale';

// §14.5 — admin→app içeriklerini kullanıcı dilinde çöz (kk/ru override, tr fallback)
function localeQuery(): string {
  const l = getCurrentLocale();
  return l && l !== 'tr' ? `?locale=${l}` : '';
}

export type LoyaltyTierKey = 'bronze' | 'silver' | 'gold';

export interface LoyaltyTier {
  key: LoyaltyTierKey;
  lifetimeEarned: number;
  next: LoyaltyTierKey | null;
  pointsToNext: number;
  progress: number;
}

export interface LoyaltySummary {
  points: number;
  raffleEntries: number;
  tier: LoyaltyTier;
  ledger: LedgerEntry[];
}

export interface AiQuota {
  premium: boolean;
  used: number;
  limit: number;
  remaining: number;
}

export interface BookingStats {
  total: number;
  completed: number;
  cancelled: number;
  noShow: number;
  noShowRate: number;
  upcoming: number;
  revenue: number;
  // §12.8 — komisyon tabanı (online ciro) + ödenecek komisyon + oran(%)
  commissionBase: number;
  commission: number;
  commissionRate: number;
  currency: string;
}

export interface RatingReview {
  id: string;
  score: number;
  comment: string;
  serviceTag: string;
  photos?: string[]; // EK Z.10 — öncesi/sonrası galeri
  createdAt: string;
  reply: string;
  repliedAt: string | null;
}

export interface RatingSummary {
  subjectId: string;
  count: number;
  average: number | null;
  revealed: boolean;
  threshold: number;
  reviews: RatingReview[];
}

// Salon sahibi mobil yönetim tipleri
export interface SellerBusiness {
  id: string;
  name: string;
  ownerName: string;
  sector: string;
  categories: string[];
  city: string;
  district: string;
  address: string;
  phone: string;
  email: string;
  workingHours: string;
  status: string;
  rejectReason?: string;
}
export interface SellerInviteCode {
  id: string;
  code: string;
  status: string;
  attempts?: number;
  expiresAt?: string;
}
export interface SellerReview {
  id: string;
  score: number;
  comment: string;
  serviceTag: string;
  authorLabel: string;
  reply: string;
  createdAt: string;
}
export interface SellerReviews {
  linked: boolean;
  average: number | null;
  count: number;
  reviews: SellerReview[];
}

// API taban adresi.
// Öncelik: EXPO_PUBLIC_API_URL (uzaktan/çok kişili test için public tünel ya da deploy URL'i,
//   ör. https://xxxx.trycloudflare.com). Ayarlıysa uygulama buna bağlanır — farklı şehirler çalışır.
// Yoksa: Expo dev host IP'sinden türet (yerel simülatör + aynı ağdaki cihaz).
const explicitApiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
const hostUri = Constants.expoConfig?.hostUri ?? '';
const host = hostUri.split(':')[0] || 'localhost';
export const API_BASE = explicitApiUrl
  ? `${explicitApiUrl.replace(/\/+$/, '')}/api/v1`
  : `http://${host}:3000/api/v1`;

function authHeader(token?: string): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Oturum token'ı (store girişte set eder) — açıkça token geçilmeyen çağrılar da kimlikli
// gider; backend'deki JwtAuthGuard'lı yazma uçları böylece kırılmadan korunur.
let sessionToken: string | undefined;
export function setApiToken(token: string | null | undefined): void {
  sessionToken = token ?? undefined;
}

async function get<T>(path: string, token?: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { headers: authHeader(token ?? sessionToken) });
  if (!res.ok) throw new Error(`GET ${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

async function post<T>(path: string, body: unknown, token?: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader(token ?? sessionToken) },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

export interface ApiCategory {
  id: string;
  label: string;
  icon: string;
  tone: 'rose' | 'gold';
}

export interface ApiProfessional {
  id: string;
  name: string;
  specialty: string;
  rating: number;
  reviewCount: number;
  friends?: number;
  priceFrom: number;
  image: string;
  badge: 'campaign' | 'verified' | 'today';
}

export interface AuthUser {
  id: string;
  name: string;
  email?: string;
  city?: string;
  role: string;
  avatarUrl?: string | null; // profil foto (data URL) — hesapla gezer
  cutoutUrl?: string | null; // kesik portre — girişte geri gelir (kredi yakmadan)
  phone: string;
  phoneVerified?: boolean;
  gender?: string;
  // §3/§6.1 — uzman/salon bağı: bağlı olduğu salon adı (yoksa Bireysel Uzman)
  businessName?: string;
  womenVerified?: boolean;
  // §12.3 — admin ceza takip: kısıtlı mod (yeni talep oluşturamaz)
  restricted?: boolean;
  restrictedDaysLeft?: number; // 7 gün penceresinde kalan gün
  // §11 — üyelik katmanı (admin onayıyla aktif): free | premium | platinum
  membershipTier?: string;
  membershipUntil?: string | null;
}

// §11 — üyelik aboneliği (Premium/Platinum satın alma + dekont)
export interface Subscription {
  id: string;
  tier: string;
  amount: number;
  status: string; // pending | active | rejected | expired
  receiptUri?: string | null;
  periodEnd?: string | null;
}
export interface MySubscription {
  tier: string;
  until: string | null;
  latest: Subscription | null;
}

// §profil-onay — salon/uzman profil değişiklik talebi
export interface ProfileChangeReq {
  id: string;
  status: string; // pending | approved | rejected
  changes: Record<string, unknown>;
  createdAt: string;
}

export interface RegisterInput {
  photoDataUrl?: string;
  birthDateMs?: number;
  name: string;
  phone: string;
  password: string;
  email?: string;
  city?: string;
  gender?: 'female' | 'unspecified';
}

export interface AuthSession {
  token: string;
  user: AuthUser;
}

export interface RegisterBusinessInput {
  name: string;
  ownerName: string;
  phone: string;
  password: string;
  email?: string;
  sector: string;
  categories: string[];
  city: string;
  district: string;
  address: string;
  workingHours?: string;
  taxId?: string;
}

export interface BusinessSummary {
  id: string;
  name: string;
  status: string;
  city: string;
}

export interface SearchableBusiness {
  id: string;
  name: string;
  city: string;
  sector: string;
}

export interface RegisterSpecialistInput {
  photoDataUrl?: string;
  birthDateMs?: number;
  sector?: string;
  name: string;
  phone: string;
  password: string;
  email?: string;
  city?: string;
  kind: 'salon_bound' | 'independent';
  bio?: string;
  businessId?: string;
  code?: string;
  certificates?: string[];
  deviceFp?: string; // §4.4 — cihaz parmak izi (kalıcı engel 2. katman)
}

export interface ApiQuote {
  id: string;
  proId: string;
  name: string;
  image: string;
  rating: number;
  reviewCount: number;
  friends?: number;
  price: number;
  etaMin: number;
}

export const api = {
  categories: () => get<ApiCategory[]>('/categories'),
  // §12 — kampanyalar (keşif vitrini)
  campaigns: () => get<Campaign[]>(`/campaigns${localeQuery()}`),
  // Reklam banner'ları (keşif ekranı sponsorlu şerit)
  ads: () => get<AdBanner[]>(`/ads${localeQuery()}`),
  // Backend artık sector/kind/district/experienceYears döndürür → mobil Professional ile uyumlu
  professionals: () => get<Professional[]>('/professionals'),
  professional: (id: string) => get<ProfessionalDetail>(`/professionals/${id}`),
  quotes: () => get<ApiQuote[]>('/quotes'),

  // Randevular (yazma yolu) — id mobilde üretilir, API upsert ile idempotent
  bookings: () => get<Appointment[]>('/bookings'),
  // §5.6 önkoşulu — yalnızca giriş yapan kullanıcının randevuları
  myBookings: (token: string) => get<Appointment[]>('/bookings/mine', token),
  // §5 — CRM özet istatistiği (doluluk/gelir/no-show)
  bookingStats: () => get<BookingStats>('/bookings/stats'),
  // token verilirse randevu sahibine bağlanır (offline seller girişinde verilmez)
  createBooking: (b: Appointment, token?: string) => post<Appointment>('/bookings', b, token),
  cancelBooking: (id: string, reason?: string) =>
    post<Appointment>(`/bookings/${id}/cancel`, reason ? { reason } : {}),
  // Onay/alternatif pazarlık döngüsü (§1.6)
  approveBooking: (id: string) => post<Appointment>(`/bookings/${id}/approve`, {}),
  proposeBooking: (id: string, proposedStartMs: number) =>
    post<Appointment>(`/bookings/${id}/propose`, { proposedStartMs }),
  acceptBooking: (id: string) => post<Appointment>(`/bookings/${id}/accept`, {}),
  // §4.2/§4.4 — depozito/iade döngüsü (backend'e taşındı)
  submitDepositReceipt: (id: string, receiptUri: string) =>
    post<Appointment>(`/bookings/${id}/deposit-receipt`, { receiptUri }),
  confirmDepositReceipt: (id: string) => post<Appointment>(`/bookings/${id}/confirm-receipt`, {}),
  freeCancelBooking: (id: string, reason?: string) =>
    post<Appointment>(`/bookings/${id}/free-cancel`, reason ? { reason } : {}),
  uploadRefundReceiptApi: (id: string, receiptUri: string) =>
    post<Appointment>(`/bookings/${id}/refund-receipt`, { receiptUri }),
  confirmRefundApi: (id: string) => post<Appointment>(`/bookings/${id}/confirm-refund`, {}),
  disputeBookingApi: (id: string) => post<Appointment>(`/bookings/${id}/dispute`, {}),
  // §4.4-b — uzman gelmedi: iade + uzman komisyon borcu (backend)
  providerNoShowApi: (id: string) => post<Appointment>(`/bookings/${id}/provider-no-show`, {}),
  noShowApi: (id: string) => post<Appointment>(`/bookings/${id}/no-show`, {}),
  // §4.1.7 — uzman hizmeti tamamladı (backend'e taşındı)
  completeBookingApi: (id: string) => post<Appointment>(`/bookings/${id}/complete`, {}),

  // Salon sahibi/uzman kendi işletmesi (mobil yönetim) — hepsi sahibe-kapılı
  myBusinesses: (token: string) => get<SellerBusiness[]>('/businesses/mine', token),
  // Faz C — salonun gerçek kadrosu (davet koduyla bağlı uzmanlar)
  businessStaff: (token: string, businessId: string) =>
    get<{ id: string; name: string; bio: string; kind: string }[]>(
      `/businesses/${businessId}/staff`,
      token,
    ),
  inviteCodes: (token: string, businessId: string) =>
    get<SellerInviteCode[]>(`/businesses/${businessId}/invite-codes`, token),
  createInviteCode: (token: string, businessId: string) =>
    post<SellerInviteCode>(`/businesses/${businessId}/invite-codes`, {}, token),
  revokeInviteCode: (token: string, businessId: string, codeId: string) =>
    post<{ ok: boolean }>(`/businesses/${businessId}/invite-codes/${codeId}/revoke`, {}, token),
  businessReviews: (token: string, businessId: string) =>
    get<SellerReviews>(`/businesses/${businessId}/reviews`, token),
  replyBusinessReview: (token: string, businessId: string, ratingId: string, reply: string) =>
    post<{ id: string; reply: string }>(
      `/businesses/${businessId}/reviews/${ratingId}/reply`,
      { reply },
      token,
    ),
  // §7 — bağımsız uzman: kendi işlerine yazılan yorumlar + tek yanıt hakkı
  mySpecialistReviews: (token: string) => get<SellerReviews>('/specialists/me/reviews', token),
  replySpecialistReview: (token: string, ratingId: string, reply: string) =>
    post<{ id: string; reply: string }>(
      `/specialists/me/reviews/${ratingId}/reply`,
      { reply },
      token,
    ),
  // §7.2 — uzman kendi yorumuna itiraz eder (admin kuyruğuna düşer; yorum görünür kalır)
  disputeSpecialistReview: (token: string, ratingId: string, reason: string) =>
    post<{ id: string; disputed: boolean }>(
      `/specialists/me/reviews/${ratingId}/dispute`,
      { reason },
      token,
    ),

  // §5.2 Faz A — reverse marketplace GERÇEK akış (talep→teklif→seçim buluttan)
  createQuoteRequest: (
    token: string,
    input: {
      category: string;
      mode: DemandMode;
      note?: string;
      photoDataUrl?: string;
      budget?: number;
      collectMin: number;
      serviceId?: string;
      preferredSlots?: number[];
    },
  ) => post<DemandRequest>('/quote-requests', input, token),
  openQuoteRequests: (token: string) =>
    get<(DemandRequest & { myQuoteId: string | null })[]>('/quote-requests/open', token),
  myQuoteRequests: (token: string) => get<DemandRequest[]>('/quote-requests/mine', token),
  submitQuote: (
    token: string,
    requestId: string,
    input: { price: number; etaMin: number; note?: string; slots: number[] },
  ) => post<{ id: string; ok: boolean }>(`/quote-requests/${requestId}/quotes`, input, token),
  selectQuote: (token: string, requestId: string, input: { quoteId: string; slotMs: number }) =>
    post<{ bookingId: string; ok: boolean }>(`/quote-requests/${requestId}/select`, input, token),

  // Auth (parola tabanlı; telefon sunucuda şifreli saklanır)
  register: (input: RegisterInput) => post<AuthSession>('/auth/register', input),
  login: (input: { identifier: string; password: string }) =>
    post<AuthSession>('/auth/login', input),

  // §4.6 — OTP telefon doğrulama (mock SMS; devCode yalnızca mock'ta döner)
  otpRequest: (phone: string) =>
    post<{ sent: boolean; expiresInSec: number; devCode?: string }>('/auth/otp/request', { phone }),
  otpVerify: (phone: string, code: string) =>
    post<{ verified: boolean; phoneVerified: boolean }>('/auth/otp/verify', { phone, code }),
  // §3.3 — Şifre sıfırlama: kayıtlı telefona OTP → yeni şifre
  resetPassword: (input: { phone: string; code: string; newPassword: string }) =>
    post<{ ok: boolean }>('/auth/reset-password', input),

  // İşletme & uzman kaydı (Build Brief §3)
  registerBusiness: (input: RegisterBusinessInput) =>
    post<{ business: BusinessSummary }>('/businesses', input),
  searchableBusinesses: () => get<SearchableBusiness[]>('/businesses/searchable'),
  registerSpecialist: (input: RegisterSpecialistInput) =>
    post<{
      token: string;
      specialist: { id: string; kind: string; businessId?: string; bio: string; featured: boolean };
    }>('/specialists', input),

  // Ortalama piyasa fiyatı + %40 alt sınır (Build Brief §1.3)
  marketAverage: (category: string, city: string) =>
    get<{ category: string; average: number; floor: number; currency: string; source: string }>(
      `/market/average?category=${encodeURIComponent(category)}&city=${encodeURIComponent(city)}`,
    ),

  // Puanlama (§1.8 çift-kör + §6.D yanıt/kalıcılık)
  // Gizlilik: authorLabel kimlik değildir; Rating'de kullanıcı kimliği tutulmaz
  // Doğrulanmış yorum — giriş (token) zorunlu; sunucu randevu sahipliğini denetler
  submitRating: (
    token: string,
    input: {
      bookingId: string;
      raterRole: 'user' | 'specialist';
      score: number;
      comment?: string;
      serviceTag?: string;
      authorLabel?: string;
      photos?: string[]; // EK Z.10 — öncesi/sonrası galeri
    },
  ) => post<{ id: string; visible: boolean; bothRated: boolean }>('/ratings', input, token),
  ratingSummary: (subjectId: string) =>
    get<RatingSummary>(`/ratings/summary?subjectId=${encodeURIComponent(subjectId)}`),
  // Uzman/işletme görünür yoruma yanıt verir (silemez) — giriş gerekli
  replyToRating: (token: string, ratingId: string, reply: string) =>
    post<{ id: string; reply: string; repliedAt: string | null }>(
      `/ratings/${ratingId}/reply`,
      { reply },
      token,
    ),

  // AI (§13.5) — anahtar backend'de; premium + ortak aylık kota sunucuda doğrulanır
  aiQuota: (token: string) => get<AiQuota>('/ai/quota', token),
  aiBoni: (token: string, question: string) =>
    post<{ answer: string; remaining: number }>('/ai/boni', { question }, token),
  // Dev/demo: premium aç/kapat (üretimde ödeme akışı yönetir)
  aiSetPremium: (token: string, value: boolean) =>
    post<{ premium: boolean }>('/ai/dev/premium', { value }, token),

  // Sadakat (kullanıcıya bağlı; bakiye sunucuda defterden türetilir)
  loyalty: (token: string) => get<LoyaltySummary>('/loyalty', token),
  earnPoints: (token: string, points: number, reason: string, detail?: string) =>
    post<LoyaltySummary>('/loyalty/earn', { points, reason, detail }, token),
  redeemReward: (token: string, rewardId: string) =>
    post<LoyaltySummary>('/loyalty/redeem', { rewardId }, token),

  // §12.6 İçerik — admin'in yayınladığı blog + haftalık tema
  contentArticles: () => get<ApiArticle[]>(`/content/articles${localeQuery()}`),
  contentTheme: () => get<ApiWeeklyTheme | null>(`/content/theme${localeQuery()}`),
  submitBlog: (token: string, input: BlogSubmission) =>
    post<{ id: string; status: string }>('/content/applications', input, token),
  // §12.10 — kullanıcının segmentine uyan toplu duyurular
  // §14.5 — locale ile: başlık/gövde kullanıcının dilinde (kk/ru override, yoksa tr)
  announcements: (token: string, locale?: string) =>
    get<ApiAnnouncement[]>(`/content/announcements${locale ? `?locale=${locale}` : ''}`, token),
  // §12.9 — parametrik oranlar + aktif şehirler + özellik erişimi (gizli anahtar sızmaz)
  appConfig: () => get<AppConfig>('/config'),
  // §5.1.1 — remove.bg cut-out: yerel foto base64 → şeffaf PNG (data URL). Premium/uzman foto.
  cutout: (token: string, source: { imageUrl?: string; imageB64?: string }) =>
    post<{ dataUrl: string }>('/cutout', source, token),
  // §12.3 — güncel kullanıcı (kısıt durumu tazelemek için)
  me: (token: string) => get<AuthUser>('/auth/me', token),
  setAvatar: (token: string, photoDataUrl: string | null) =>
    post<AuthUser>('/auth/me/avatar', { photoDataUrl }, token),
  myServices: () =>
    get<{ services: { id: string; name: string; price: number; durationMin: number }[] }>(
      '/specialists/me/services',
    ),
  setMyServices: (services: { id: string; name: string; price: number; durationMin: number }[]) =>
    post<unknown>('/specialists/me/services', { services }),
  setMyCertificates: (certificates: string[]) =>
    post<{ certificates: string[] }>('/specialists/me/certificates', { certificates }),
  myClosedDays: () => get<{ days: number[] }>('/specialists/me/closed-days'),
  setMyClosedDays: (days: number[]) => post<unknown>('/specialists/me/closed-days', { days }),
  myHours: () => get<{ hours: import('./ui/WorkingHours').DayHours[] }>('/specialists/me/hours'),
  setMyHours: (hours: import('./ui/WorkingHours').DayHours[]) =>
    post<unknown>('/specialists/me/hours', { hours }),
  myPromotions: (token: string) =>
    get<{ promotions: import('./data').Promotion[] }>('/specialists/me/promotions', token),
  setMyPromotions: (token: string, promotions: import('./data').Promotion[]) =>
    post<{ promotions: import('./data').Promotion[] }>(
      '/specialists/me/promotions',
      { promotions },
      token,
    ),
  myPortfolio: (token: string) => get<{ photos: string[] }>('/specialists/me/portfolio', token),
  setMyPortfolio: (token: string, photos: string[]) =>
    post<{ photos: string[] }>('/specialists/me/portfolio', { photos }, token),
  sellerBirthdays: (token: string) =>
    get<{ id: string; name: string }[]>('/specialists/me/birthdays', token),
  celebrateBirthday: (token: string, userId: string) =>
    post<{ ok: boolean }>(`/specialists/me/birthdays/${userId}/celebrate`, {}, token),
  setPrefs: (prefs: { favorites?: string[]; addresses?: unknown[] }) =>
    post<unknown>('/auth/me/prefs', prefs),
  setCutoutRemote: (token: string, cutoutDataUrl: string | null) =>
    post<AuthUser>('/auth/me/cutout', { cutoutDataUrl }, token),
  // §11 — üyelik aboneliği: talep oluştur, dekont yükle, güncel katmanı oku
  createSubscription: (tier: 'premium' | 'platinum', token: string) =>
    post<Subscription>('/subscriptions', { tier }, token),
  uploadSubReceipt: (id: string, receiptUri: string, token: string) =>
    post<Subscription>(`/subscriptions/${id}/receipt`, { receiptUri }, token),
  mySubscription: (token: string) => get<MySubscription>('/subscriptions/mine', token),
  // §profil-onay — salon/uzman profil değişiklik talebi + son talep durumu
  submitProfileChange: (changes: Record<string, unknown>, token: string) =>
    post<ProfileChangeReq>('/profile-changes', { changes }, token),
  myProfileChange: (token: string) => get<ProfileChangeReq | null>('/profile-changes/mine', token),
  // §12.8 — pro'nun komisyon faturaları + dekont yükleme
  myCommissions: (token: string) => get<CommissionInvoice[]>('/commissions/mine', token),
  uploadCommissionReceipt: (token: string, id: string, receiptUri: string) =>
    post<CommissionInvoice>(`/commissions/${id}/receipt`, { receiptUri }, token),
  // §12.4 — depozito itirazı / iade dekontunu admin kuyruğuna bildir
  fileDispute: (token: string, input: DisputeInput) =>
    post<{ id: string; status: string }>('/disputes', input, token),
  // §5.5 — W2W topluluk (moderasyon backend'de)
  circlePosts: () => get<ApiCirclePost[]>('/circle/posts'),
  circleFollow: (targetUserId: string, on: boolean) =>
    post<{ following: boolean }>('/circle/follow', { targetUserId, on }),
  myFollows: () =>
    get<{
      following: { userId: string; name: string }[];
      followers: { userId: string; name: string }[];
    }>('/circle/follows'),
  circleHelpful: (postId: string, on: boolean) =>
    post<{ helpful: number }>(`/circle/posts/${postId}/helpful`, { on }),
  circleComment: (postId: string, text: string, anonymous: boolean) =>
    post<unknown>(`/circle/posts/${postId}/comments`, { text, anonymous }),
  createCirclePost: (
    token: string,
    input: { category: string; text: string; anonymous?: boolean },
  ) =>
    post<{ id: string; status: string; moderationReason: string }>('/circle/posts', input, token),
  reportCirclePost: (token: string, id: string, reason?: string) =>
    post<{ reports: number; hidden: boolean }>(`/circle/posts/${id}/report`, { reason }, token),
  // EK Z.1 — DM mesajlaşma (müşteri ↔ uzman/salon; moderasyon + numara maskeleme backend'de)
  conversations: (token: string) => get<ConversationSummary[]>('/messaging/conversations', token),
  startConversation: (
    token: string,
    targetUserId: string,
    ctx?: { bookingId?: string; requestId?: string },
  ) => post<{ id: string }>('/messaging/conversations', { targetUserId, ...(ctx ?? {}) }, token),
  chatMessages: (token: string, id: string) =>
    get<ChatMessage[]>(`/messaging/conversations/${id}/messages`, token),
  sendChatMessage: (token: string, id: string, body: string) =>
    post<ChatMessage>(`/messaging/conversations/${id}/messages`, { body }, token),
  blockedUsers: (token: string) => get<BlockedUser[]>('/messaging/blocks', token),
  blockUser: (token: string, targetUserId: string) =>
    post<{ ok: boolean }>('/messaging/blocks', { targetUserId }, token),
  unblockUser: (token: string, targetUserId: string) =>
    post<{ ok: boolean }>(`/messaging/blocks/${targetUserId}/remove`, {}, token),
  // EK Z.2 — randevu güvenlik katmanı (güvenilen kişi + SOS + canlı konum oturumu)
  safetyContacts: (token: string) => get<TrustedContact[]>('/safety/contacts', token),
  addTrustedContact: (token: string, input: { name: string; phone: string; relation?: string }) =>
    post<TrustedContact>('/safety/contacts', input, token),
  removeTrustedContact: (token: string, id: string) =>
    post<{ ok: boolean }>(`/safety/contacts/${id}/remove`, {}, token),
  safetySession: (token: string) => get<SafetySession | null>('/safety/session', token),
  startSafetySession: (token: string, bookingId?: string) =>
    post<SafetySession>('/safety/session', bookingId ? { bookingId } : {}, token),
  sendSafetyLocation: (token: string, id: string, lat: number, lng: number) =>
    post<SafetySession>(`/safety/session/${id}/location`, { lat, lng }, token),
  safetyCheckIn: (token: string, id: string) =>
    post<SafetySession>(`/safety/session/${id}/checkin`, {}, token),
  safetySos: (token: string, id?: string) =>
    post<SafetySession & { notifiedContacts: number }>(
      id ? `/safety/session/${id}/sos` : '/safety/sos',
      {},
      token,
    ),
  // EK Z.3 — uzman/salon KYC belge doğrulaması
  myKyc: (token: string) => get<MyKyc>('/kyc/mine', token),
  submitKyc: (token: string, input: { docType: KycDocType; documents: string[] }) =>
    post<KycVerification>('/kyc', input, token),
  // EK Z.5 — uzaktan push token kaydı/silme
  registerPushToken: (token: string, expoToken: string, platform: string) =>
    post<{ ok: boolean }>('/push/tokens', { token: expoToken, platform }, token),
  removePushToken: (token: string, expoToken: string) =>
    post<{ ok: boolean }>('/push/tokens/remove', { token: expoToken }, token),
  // EK Z.6 — müşteri referans programı
  referralMine: (token: string) => get<MyReferral>('/referral/mine', token),
  redeemReferral: (token: string, code: string) =>
    post<{ ok: boolean; pointsAwarded: number; referrerName: string }>(
      '/referral/redeem',
      { code },
      token,
    ),
  // EK Z.8 — in-app Kaspi ödeme (simülasyon)
  paymentFor: (token: string, bookingId: string) =>
    get<PaymentIntent | null>(`/payment/mine?bookingId=${encodeURIComponent(bookingId)}`, token),
  createPayment: (token: string, bookingId: string, pointsRequested: number) =>
    post<PaymentIntent>('/payment', { bookingId, pointsRequested }, token),
  confirmPayment: (token: string, id: string) =>
    post<PaymentIntent>(`/payment/${id}/confirm`, {}, token),
};

// EK Z.8 — ödeme tipi
export interface PaymentIntent {
  id: string;
  bookingId: string;
  amount: number;
  pointsUsed: number;
  cashAmount: number;
  method: string;
  status: 'pending' | 'paid' | 'failed' | 'refunded';
  providerRef: string | null;
  paidAt: string | null;
}

// EK Z.6 — referans tipi
export interface MyReferral {
  code: string;
  invited: number;
  pointsEarned: number;
  rewardPoints: number;
}

// EK Z.3 — KYC tipleri
export type KycDocType = 'id_card' | 'passport' | 'certificate';
export type KycStatus = 'none' | 'pending' | 'approved' | 'rejected';
export interface KycVerification {
  id: string;
  docType: KycDocType;
  documents: string[];
  status: KycStatus;
  note: string;
  submittedAt: string;
  reviewedAt: string | null;
}
export interface MyKyc {
  status: KycStatus;
  verifiedAt: string | null;
  latest: KycVerification | null;
}

// EK Z.2 — güvenlik tipleri
export interface TrustedContact {
  id: string;
  name: string;
  phone: string;
  relation: string;
}
export interface SafetySession {
  id: string;
  bookingId: string | null;
  status: 'active' | 'sos' | 'ended';
  hasLocation: boolean;
  lastLocationAt: string | null;
  sosAt: string | null;
  startedAt: string;
  endedAt: string | null;
}

// EK Z.1 — DM mesajlaşma tipleri
export interface ConversationSummary {
  id: string;
  otherId: string;
  otherName: string;
  lastBody: string;
  lastAt: string;
  unread: number;
}
export interface ChatMessage {
  id: string;
  senderId: string;
  mine: boolean;
  body: string;
  hidden: boolean;
  readAt: string | null;
  createdAt: string;
}
export interface BlockedUser {
  id: string;
  name: string;
  since: string;
}

export interface ApiCirclePost {
  authorUserId?: string | null;
  id: string;
  category: string;
  text: string;
  anonymous: boolean;
  authorLabel: string;
  helpful: number;
  comments: number;
  createdAt: string;
}

export interface DisputeInput {
  bookingRef: string;
  proName: string;
  service?: string;
  kind: 'deposit' | 'refund';
  amount?: number;
  receiptUri?: string;
  note?: string;
}

export interface CommissionInvoice {
  id: string;
  proId: string;
  proName: string;
  periodStart: string;
  periodEnd: string;
  bookingsCount: number;
  grossRevenue: number;
  commissionAmount: number;
  dueDate: string;
  status: 'pending' | 'collected' | 'overdue';
  receiptUri: string | null;
  receiptAt: string | null;
  collectedAt: string | null;
  overdueDays: number;
  currency: string;
}

export interface AppConfig {
  rates: {
    commissionPct: number;
    depositKzt: number;
    cancelWindowH: number;
    lateCancelPct: number;
    pointsCapPct: number;
    premiumUserKzt: number;
    premiumSalonKzt: number;
    raffleCost: number;
  };
  cities: { active: string[]; soon: string[] };
  features: { removebg: boolean; openai: boolean; sms: boolean };
  // §12.9 — kategori bakım periyodu (gün) + hizmet süresi (dk)
  categories?: Record<string, { maintenanceDays: number; serviceMin: number }>;
}

export interface ApiAnnouncement {
  id: string;
  title: string;
  body: string;
  segment: string;
  city: string | null;
  recipientCount: number;
  createdAt: string;
}

export interface ApiArticle {
  id: string;
  title: string;
  tag: string;
  categoryCode: string | null;
  readMin: number;
  image: string;
  excerpt: string;
  body: string[];
}

export interface ApiWeeklyTheme {
  id: string;
  title: string;
  prompt: string;
  weekStart: string;
  active: boolean;
}

export interface BlogSubmission {
  authorName: string;
  title: string;
  excerpt?: string;
  body: string[];
  tag?: string;
}
