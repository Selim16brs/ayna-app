// AYNA Admin — API istemcisi (admin token localStorage'da)
export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:3000/api/v1';

const TOKEN_KEY = 'ayna_admin_token';

export const getToken = () =>
  typeof window === 'undefined' ? null : window.localStorage.getItem(TOKEN_KEY);
export const setToken = (t: string) => window.localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => window.localStorage.removeItem(TOKEN_KEY);

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    let code = String(res.status);
    try {
      const body = await res.json();
      code = body?.error?.code ?? code;
    } catch {
      /* yoksay */
    }
    // §admin — geçersiz/eski oturum: token varken 401 → otomatik çıkış + giriş ekranı
    // (login uçları hariç). Böylece hiçbir sekme sonsuz "Yükleniyor"da kalmaz.
    if (res.status === 401 && !path.startsWith('/auth/') && getToken()) {
      clearToken();
      if (typeof window !== 'undefined') window.location.reload();
    }
    throw new Error(code);
  }
  return res.json() as Promise<T>;
}

export const api = {
  login: (identifier: string, password: string) =>
    req<{ token: string; user: { role: string; name: string } }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password }),
    }),
  overview: () => req<Overview>('/admin/overview'),
  stats: (days: number) => req<Stats>(`/admin/stats?days=${days}`),
  commissions: () => req<Commissions>('/admin/commissions'),
  setCommissionRate: (value: number) =>
    req<{ rate: number }>('/admin/settings/commission-rate', {
      method: 'POST',
      body: JSON.stringify({ value }),
    }),
  addPayout: (p: { proId: string; proName: string; amount: number; note?: string }) =>
    req<{ id: string }>('/admin/commissions/payouts', {
      method: 'POST',
      body: JSON.stringify(p),
    }),
  // §12.8 Komisyon tahsilat döngüsü
  commissionInvoices: () => req<CommissionInvoice[]>('/admin/commissions/invoices'),
  closePeriod: (periodStart: string, periodEnd: string, dueDate?: string) =>
    req<{ created: number; dueDate: string; rate: number }>('/admin/commissions/close-period', {
      method: 'POST',
      body: JSON.stringify({ periodStart, periodEnd, ...(dueDate ? { dueDate } : {}) }),
    }),
  collectInvoice: (id: string) =>
    req<CommissionInvoice>(`/admin/commissions/invoices/${id}/collect`, { method: 'POST' }),
  runOverdue: () =>
    req<{ markedOverdue: number; restricted: number }>('/admin/commissions/run-overdue', {
      method: 'POST',
    }),
  // §11 — üyelik abonelikleri (Premium/Platinum dekont onayı)
  subscriptions: (status?: string) =>
    req<Subscription[]>(`/admin/subscriptions${status ? `?status=${status}` : ''}`),
  approveSubscription: (id: string, months = 1) =>
    req<Subscription>(`/admin/subscriptions/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ months }),
    }),
  rejectSubscription: (id: string) =>
    req<Subscription>(`/admin/subscriptions/${id}/reject`, { method: 'POST' }),
  runSubExpire: () => req<{ expired: number }>('/admin/subscriptions/run-expire', { method: 'POST' }),
  businesses: (status?: string) =>
    req<Business[]>(`/admin/businesses${status ? `?status=${status}` : ''}`),
  businessDetail: (id: string) => req<BusinessDetail>(`/admin/businesses/${id}`),
  reviews: () => req<AdminReview[]>('/admin/reviews'),
  hideReview: (id: string) => req(`/admin/reviews/${id}/hide`, { method: 'POST' }),
  approveBusiness: (id: string) => req(`/admin/businesses/${id}/approve`, { method: 'POST' }),
  rejectBusiness: (id: string, reason: string) =>
    req(`/admin/businesses/${id}/reject`, { method: 'POST', body: JSON.stringify({ reason }) }),
  users: () => req<AdminUser[]>('/admin/users'),
  setUserRole: (id: string, role: string) =>
    req(`/admin/users/${id}/role`, { method: 'POST', body: JSON.stringify({ role }) }),
  setUserStatus: (id: string, status: string) =>
    req(`/admin/users/${id}/status`, { method: 'POST', body: JSON.stringify({ status }) }),
  setUserPremium: (id: string, isPremium: boolean) =>
    req(`/admin/users/${id}/premium`, { method: 'POST', body: JSON.stringify({ isPremium }) }),
  // §11 — manuel üyelik katmanı (free | premium | platinum)
  setUserTier: (id: string, tier: 'free' | 'premium' | 'platinum') =>
    req(`/admin/users/${id}/tier`, { method: 'POST', body: JSON.stringify({ tier }) }),
  // §12.3 Ceza takip
  penalties: () => req<Penalty[]>('/admin/penalties'),
  restrictUser: (id: string, reason: string) =>
    req(`/admin/users/${id}/restrict`, { method: 'POST', body: JSON.stringify({ reason }) }),
  unrestrictUser: (id: string) =>
    req(`/admin/users/${id}/unrestrict`, { method: 'POST' }),
  bookings: (status?: string) =>
    req<AdminBooking[]>(`/admin/bookings${status && status !== 'all' ? `?status=${status}` : ''}`),
  quoteRequests: () => req<QuoteReq[]>('/admin/quote-requests'),
  loyalty: () => req<Loyalty>('/admin/loyalty'),
  featureFlags: () => req<FeatureFlag[]>('/admin/feature-flags'),
  setFeatureFlag: (key: string, enabled: boolean, description?: string) =>
    req<FeatureFlag>('/admin/feature-flags', {
      method: 'POST',
      body: JSON.stringify(description !== undefined ? { key, enabled, description } : { key, enabled }),
    }),
  auditLogs: () => req<AuditEntry[]>('/admin/audit-logs'),
  campaigns: () => req<Campaign[]>('/admin/campaigns'),
  createCampaign: (c: NewCampaign) =>
    req<Campaign>('/admin/campaigns', { method: 'POST', body: JSON.stringify(c) }),
  setCampaignActive: (id: string, active: boolean) =>
    req(`/admin/campaigns/${id}/active`, { method: 'POST', body: JSON.stringify({ active }) }),
  deleteCampaign: (id: string) => req(`/admin/campaigns/${id}`, { method: 'DELETE' }),
  ads: () => req<AdBanner[]>('/admin/ads'),
  createAd: (a: NewAd) => req<AdBanner>('/admin/ads', { method: 'POST', body: JSON.stringify(a) }),
  setAdActive: (id: string, active: boolean) =>
    req(`/admin/ads/${id}/active`, { method: 'POST', body: JSON.stringify({ active }) }),
  deleteAd: (id: string) => req(`/admin/ads/${id}`, { method: 'DELETE' }),
  professionals: () => req<Pro[]>('/admin/professionals'),
  createProfessional: (p: ProInput) =>
    req<Pro>('/admin/professionals', { method: 'POST', body: JSON.stringify(p) }),
  updateProfessional: (id: string, p: Partial<ProInput>) =>
    req<Pro>(`/admin/professionals/${id}`, { method: 'PATCH', body: JSON.stringify(p) }),
  deleteProfessional: (id: string) =>
    req(`/admin/professionals/${id}`, { method: 'DELETE' }),
  setFeatured: (id: string, featured: boolean) =>
    req(`/admin/professionals/${id}/feature`, {
      method: 'POST',
      body: JSON.stringify({ featured }),
    }),
  categories: () => req<Category[]>('/admin/categories'),
  createCategory: (c: CategoryInput) =>
    req<Category>('/admin/categories', { method: 'POST', body: JSON.stringify(c) }),
  updateCategory: (id: string, c: Partial<Omit<CategoryInput, 'code'>>) =>
    req<Category>(`/admin/categories/${id}`, { method: 'PATCH', body: JSON.stringify(c) }),
  deleteCategory: (id: string) => req(`/admin/categories/${id}`, { method: 'DELETE' }),
  marketPrices: () => req<MarketPrice[]>('/admin/market-prices'),
  setMarketPrice: (m: { category: string; city?: string; basePrice: number }) =>
    req<MarketPrice>('/admin/market-prices', { method: 'POST', body: JSON.stringify(m) }),

  // §12.6 İçerik Yönetimi — Blog
  blogArticles: () => req<BlogArticle[]>('/admin/content/articles'),
  createArticle: (a: ArticleInput) =>
    req<BlogArticle>('/admin/content/articles', { method: 'POST', body: JSON.stringify(a) }),
  updateArticle: (id: string, a: Partial<ArticleInput>) =>
    req<BlogArticle>(`/admin/content/articles/${id}`, { method: 'PATCH', body: JSON.stringify(a) }),
  deleteArticle: (id: string) =>
    req(`/admin/content/articles/${id}`, { method: 'DELETE' }),
  blogApplications: () => req<BlogApplication[]>('/admin/content/applications'),
  reviewApplication: (id: string, body: ReviewApplication) =>
    req(`/admin/content/applications/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  themes: () => req<WeeklyTheme[]>('/admin/content/themes'),
  createTheme: (t: { title: string; prompt: string; weekStart: string }) =>
    req<WeeklyTheme>('/admin/content/themes', { method: 'POST', body: JSON.stringify(t) }),
  activateTheme: (id: string) =>
    req<WeeklyTheme>(`/admin/content/themes/${id}/activate`, { method: 'POST' }),

  // §12.10 Bildirim Merkezi
  announcements: () => req<Announcement[]>('/admin/content/announcements'),
  sendAnnouncement: (a: AnnouncementInput) =>
    req<Announcement>('/admin/content/announcements', { method: 'POST', body: JSON.stringify(a) }),

  // §12.5 W2W moderasyon kuyruğu
  circleQueue: () => req<CirclePost[]>('/admin/circle/queue'),
  moderateCircle: (id: string, decision: 'approve' | 'hide') =>
    req(`/admin/circle/posts/${id}/moderate`, { method: 'POST', body: JSON.stringify({ decision }) }),
  // §12.4 Anlaşmazlık kuyruğu (depozito/iade dekontları)
  disputes: () => req<Dispute[]>('/admin/disputes'),
  resolveDispute: (id: string, decision: 'approve' | 'reject', resolution?: string) =>
    req<Dispute>(`/admin/disputes/${id}/resolve`, {
      method: 'POST',
      body: JSON.stringify({ decision, ...(resolution ? { resolution } : {}) }),
    }),
  // §7.2 Yorum itiraz kuyruğu (uzman/işletme itirazı; yorum İNCELEME BOYUNCA görünür kalır)
  reviewDisputes: () => req<ReviewDispute[]>('/admin/reviews/disputes'),
  resolveReviewDispute: (id: string, action: 'keep' | 'remove') =>
    req<{ id: string; visible: boolean; action: string }>(`/admin/reviews/${id}/resolve`, {
      method: 'POST',
      body: JSON.stringify({ action }),
    }),
  // §12.9 Sistem Ayarları
  systemSettings: () => req<SystemSettings>('/admin/system'),
  setRate: (key: string, value: number) =>
    req<RateSetting[]>('/admin/system/rate', { method: 'POST', body: JSON.stringify({ key, value }) }),
  setApiKey: (provider: string, value: string) =>
    req<ApiKeyStatus[]>('/admin/system/api-key', {
      method: 'POST',
      body: JSON.stringify({ provider, value }),
    }),
  testApiKey: (provider: string) =>
    req<{ ok: boolean; message: string }>(`/admin/system/api-key/${provider}/test`, {
      method: 'POST',
    }),
  setCities: (active: string[], soon: string[]) =>
    req<Cities>('/admin/system/cities', { method: 'POST', body: JSON.stringify({ active, soon }) }),
  // §12.9 — kategori bakım periyodu + hizmet süresi
  categoryConfig: () => req<CategoryConfig>('/admin/system/categories'),
  setCategoryConfig: (config: CategoryConfig) =>
    req<CategoryConfig>('/admin/system/categories', { method: 'POST', body: JSON.stringify(config) }),
};

export type CategoryConfig = Record<string, { maintenanceDays: number; serviceMin: number }>;

export interface RateSetting {
  key: string;
  label: string;
  suffix: string;
  value: number;
}

export interface ApiKeyStatus {
  provider: string;
  label: string;
  masked: string;
  configured: boolean;
}

export interface Cities {
  active: string[];
  soon: string[];
}

export interface SystemSettings {
  rates: RateSetting[];
  apiKeys: ApiKeyStatus[];
  cities: Cities;
}

export type AnnouncementSegment = 'all' | 'premium' | 'platinum' | 'professionals' | 'salons' | 'city';

export interface Announcement {
  id: string;
  title: string;
  body: string;
  segment: AnnouncementSegment;
  city: string | null;
  recipientCount: number;
  createdAt: string;
}

export interface AnnouncementInput {
  title: string;
  body: string;
  segment: AnnouncementSegment;
  city?: string;
}

export interface BlogArticle {
  id: string;
  title: string;
  tag: string;
  categoryCode: string | null;
  readMin: number;
  image: string;
  excerpt: string;
  body: string[];
  published: boolean;
  publishedAt: string | null;
  createdAt: string;
}

export interface ArticleInput {
  title: string;
  tag: string;
  categoryCode?: string | null;
  readMin?: number;
  image?: string;
  excerpt: string;
  body: string[];
  published?: boolean;
}

export interface BlogApplication {
  id: string;
  userId: string | null;
  authorName: string;
  title: string;
  excerpt: string;
  body: string[];
  tag: string;
  status: 'pending' | 'approved' | 'rejected';
  points: number;
  note: string;
  createdAt: string;
  reviewedAt: string | null;
}

export interface ReviewApplication {
  decision: 'approve' | 'reject';
  note?: string;
  categoryCode?: string;
  image?: string;
  points?: number;
}

export interface WeeklyTheme {
  id: string;
  title: string;
  prompt: string;
  weekStart: string;
  active: boolean;
  createdAt: string;
}

export interface Overview {
  users: number;
  professionals: number;
  activeCampaigns: number;
  businesses: { pending: number; approved: number; rejected: number };
  bookings: {
    total: number;
    completed: number;
    cancelled: number;
    noShow: number;
    noShowRate: number;
    upcoming: number;
    revenue: number;
    currency: string;
  };
}
export interface CirclePost {
  id: string;
  category: string;
  text: string;
  authorLabel: string;
  status: 'pending' | 'hidden' | 'published';
  reports: number;
  moderationReason: string;
  createdAt: string;
}
export interface Dispute {
  id: string;
  bookingRef: string;
  proName: string;
  service: string;
  kind: 'deposit' | 'refund';
  amount: number;
  receiptUri: string | null;
  note: string;
  status: 'open' | 'approved' | 'rejected';
  resolution: string;
  createdAt: string;
  resolvedAt: string | null;
}
// §7.2 — yorum itirazı (uzman/işletme itiraz etti; yorum görünür kalır, admin karar verir)
export interface ReviewDispute {
  id: string;
  subjectId: string;
  score: number;
  comment: string;
  authorLabel: string;
  reply: string;
  disputeReason: string;
  disputedAt: string | null;
  visible: boolean;
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
// §11 — üyelik aboneliği (Premium/Platinum)
export interface Subscription {
  id: string;
  userId: string;
  userName: string;
  tier: 'premium' | 'platinum';
  amount: number;
  status: 'pending' | 'active' | 'rejected' | 'expired';
  receiptUri: string | null;
  receiptAt: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  createdAt: string;
}
export interface Commissions {
  rate: number;
  currency: string;
  totals: {
    count: number;
    gmv: number;
    earned: number;
    pending: number;
    collected: number;
    outstanding: number;
  };
  salons: {
    proId: string;
    proName: string;
    count: number;
    gmv: number;
    earned: number;
    pending: number;
    collected: number;
    outstanding: number;
  }[];
  payouts: {
    id: string;
    proId: string;
    proName: string;
    amount: number;
    note: string;
    createdAt: string;
  }[];
  items: {
    id: string;
    proName: string;
    service: string;
    dateLabel: string;
    price: number;
    commission: number;
    status: string;
    state: 'earned' | 'pending' | 'void';
  }[];
}
export interface StatPoint {
  date: string;
  fullDate: string;
  users: number;
  bookings: number;
  revenue: number;
}
export interface Stats {
  range: number;
  timezone: string;
  series: StatPoint[];
  totals: { users: number; bookings: number; revenue: number };
  categories: { sector: string; count: number }[];
}
export interface Business {
  id: string;
  name: string;
  ownerName: string;
  sector: string;
  city: string;
  district: string;
  phone: string;
  email: string;
  taxId: string;
  status: string;
  rejectReason?: string;
  createdAt: string;
}
export interface BusinessDetail extends Business {
  about: string;
  address: string;
  workingHours: string;
  categories: string[];
  docUrl?: string;
  specialistCount: number;
  inviteCodes: { code: string; status: string; attempts: number }[];
}
export interface AdminReview {
  id: string;
  subjectId: string;
  score: number;
  comment: string;
  serviceTag: string;
  authorLabel: string;
  reply: string;
  createdAt: string;
}
export interface AdminUser {
  id: string;
  name: string;
  email?: string;
  city?: string;
  role: string;
  status: string;
  gender: string;
  phoneVerified: boolean;
  isPremium: boolean;
  membershipTier?: 'free' | 'premium' | 'platinum';
  membershipUntil?: string | null;
  createdAt: string;
}
export interface Penalty {
  id: string;
  name: string;
  role: string;
  city: string | null;
  status: string;
  restrictedAt: string | null;
  restrictReason: string;
  daysElapsed: number;
  daysRemaining: number;
  banEligible: boolean;
}
export interface AdminBooking {
  id: string;
  service: string;
  proName: string;
  customerName: string;
  dateLabel: string;
  price: number;
  status: string;
  source: string;
  online: boolean;
  createdAt: string;
}
export interface QuoteReq {
  id: string;
  category: string;
  note: string;
  hasPhoto: boolean;
  status: string;
  quoteCount: number;
  bestPrice: number | null;
  createdAt: string;
}
export interface Loyalty {
  totals: { earned: number; spent: number; balance: number };
  entries: {
    id: string;
    userName: string;
    kind: string;
    reason: string;
    detail: string;
    points: number;
    createdAt: string;
  }[];
}
export interface FeatureFlag {
  key: string;
  enabled: boolean;
  description?: string | null;
  updatedAt: string;
}
export interface AuditEntry {
  id: string;
  action: string;
  resourceType: string;
  resourceId: string;
  actorRole: string;
  requestId: string;
  createdAt: string;
}
export interface Campaign {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  category?: string | null;
  image: string;
  tone: string;
  sortOrder: number;
  active: boolean;
}
export type NewCampaign = {
  title: string;
  subtitle?: string;
  badge?: string;
  category?: string;
  image: string;
  tone?: string;
  sortOrder?: number;
};
export interface AdBanner {
  id: string;
  proId: string;
  title: string;
  subtitle: string;
  image: string;
  sortOrder: number;
  active: boolean;
}
export type NewAd = {
  proId: string;
  title: string;
  subtitle?: string;
  image: string;
  sortOrder?: number;
};
export interface Pro {
  id: string;
  name: string;
  specialty: string;
  sector: string;
  kind: string;
  district: string;
  about: string;
  rating: number;
  reviewCount: number;
  experienceYears: number;
  priceFrom: number;
  imageUrl: string;
  badge: string;
  featured: boolean;
}
export type ProInput = {
  name: string;
  sector: string;
  specialty?: string;
  kind?: string;
  district?: string;
  about?: string;
  experienceYears?: number;
  priceFrom?: number;
  imageUrl?: string;
  badge?: string;
};
export interface Category {
  id: string;
  code: string;
  nameTr: string;
  icon: string;
  tone: string;
  sortOrder: number;
}
export type CategoryInput = {
  code: string;
  nameTr: string;
  icon: string;
  tone: string;
  sortOrder?: number;
};
export interface MarketPrice {
  id: string;
  category: string;
  city: string;
  basePrice: number;
}
