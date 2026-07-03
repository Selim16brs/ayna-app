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
};

export type AnnouncementSegment = 'all' | 'premium' | 'professionals' | 'salons' | 'city';

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
  createdAt: string;
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
