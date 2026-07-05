import Constants from 'expo-constants';
import type {
  AdBanner,
  Appointment,
  Campaign,
  LedgerEntry,
  Professional,
  ProfessionalDetail,
} from './data';

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

// API taban adresi: Expo dev host IP'sinden türetilir (simülatör + cihaz uyumlu).
const hostUri = Constants.expoConfig?.hostUri ?? '';
const host = hostUri.split(':')[0] || 'localhost';
export const API_BASE = `http://${host}:3000/api/v1`;

function authHeader(token?: string): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function get<T>(path: string, token?: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { headers: authHeader(token) });
  if (!res.ok) throw new Error(`GET ${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

async function post<T>(path: string, body: unknown, token?: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader(token) },
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

export interface RegisterInput {
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
  campaigns: () => get<Campaign[]>('/campaigns'),
  // Reklam banner'ları (keşif ekranı sponsorlu şerit)
  ads: () => get<AdBanner[]>('/ads'),
  // Backend artık sector/kind/district/experienceYears döndürür → mobil Professional ile uyumlu
  professionals: () => get<Professional[]>('/professionals'),
  professional: (id: string) => get<ProfessionalDetail>(`/professionals/${id}`),
  quotes: () => get<ApiQuote[]>('/quotes'),
  createQuoteRequest: (input: { categoryId: string; note?: string; photoUrl?: string }) =>
    post<{ id: string; status: string }>('/quote-requests', input),

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
  // §4.1.7 — uzman hizmeti tamamladı (backend'e taşındı)
  completeBookingApi: (id: string) => post<Appointment>(`/bookings/${id}/complete`, {}),

  // Salon sahibi/uzman kendi işletmesi (mobil yönetim) — hepsi sahibe-kapılı
  myBusinesses: (token: string) => get<SellerBusiness[]>('/businesses/mine', token),
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
  contentArticles: () => get<ApiArticle[]>('/content/articles'),
  contentTheme: () => get<ApiWeeklyTheme | null>('/content/theme'),
  submitBlog: (token: string, input: BlogSubmission) =>
    post<{ id: string; status: string }>('/content/applications', input, token),
  // §12.10 — kullanıcının segmentine uyan toplu duyurular
  announcements: (token: string) => get<ApiAnnouncement[]>('/content/announcements', token),
  // §12.9 — parametrik oranlar + aktif şehirler + özellik erişimi (gizli anahtar sızmaz)
  appConfig: () => get<AppConfig>('/config'),
  // §12.3 — güncel kullanıcı (kısıt durumu tazelemek için)
  me: (token: string) => get<AuthUser>('/auth/me', token),
  // §11 — üyelik aboneliği: talep oluştur, dekont yükle, güncel katmanı oku
  createSubscription: (tier: 'premium' | 'platinum', token: string) =>
    post<Subscription>('/subscriptions', { tier }, token),
  uploadSubReceipt: (id: string, receiptUri: string, token: string) =>
    post<Subscription>(`/subscriptions/${id}/receipt`, { receiptUri }, token),
  mySubscription: (token: string) => get<MySubscription>('/subscriptions/mine', token),
  // §12.8 — pro'nun komisyon faturaları + dekont yükleme
  myCommissions: (token: string) => get<CommissionInvoice[]>('/commissions/mine', token),
  uploadCommissionReceipt: (token: string, id: string, receiptUri: string) =>
    post<CommissionInvoice>(`/commissions/${id}/receipt`, { receiptUri }, token),
  // §12.4 — depozito itirazı / iade dekontunu admin kuyruğuna bildir
  fileDispute: (token: string, input: DisputeInput) =>
    post<{ id: string; status: string }>('/disputes', input, token),
  // §5.5 — W2W topluluk (moderasyon backend'de)
  circlePosts: () => get<ApiCirclePost[]>('/circle/posts'),
  createCirclePost: (token: string, input: { category: string; text: string; anonymous?: boolean }) =>
    post<{ id: string; status: string; moderationReason: string }>('/circle/posts', input, token),
  reportCirclePost: (token: string, id: string, reason?: string) =>
    post<{ reports: number; hidden: boolean }>(`/circle/posts/${id}/report`, { reason }, token),
};

export interface ApiCirclePost {
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
