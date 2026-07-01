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
  setFeatured: (id: string, featured: boolean) =>
    req(`/admin/professionals/${id}/feature`, {
      method: 'POST',
      body: JSON.stringify({ featured }),
    }),
};

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
  gender: string;
  phoneVerified: boolean;
  isPremium: boolean;
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
  sector: string;
  district: string;
  rating: number;
  reviewCount: number;
  badge: string;
  featured: boolean;
}
