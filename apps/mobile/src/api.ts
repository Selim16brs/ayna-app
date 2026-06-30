import Constants from 'expo-constants';
import type { Appointment, LedgerEntry, Professional, ProfessionalDetail } from './data';

export interface LoyaltySummary {
  points: number;
  raffleEntries: number;
  ledger: LedgerEntry[];
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
}

export interface AuthSession {
  token: string;
  user: AuthUser;
}

export interface RegisterInput {
  name: string;
  phone: string;
  password: string;
  email?: string;
  city?: string;
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
  // Backend artık sector/kind/district/experienceYears döndürür → mobil Professional ile uyumlu
  professionals: () => get<Professional[]>('/professionals'),
  professional: (id: string) => get<ProfessionalDetail>(`/professionals/${id}`),
  quotes: () => get<ApiQuote[]>('/quotes'),
  createQuoteRequest: (input: { categoryId: string; note?: string; photoUrl?: string }) =>
    post<{ id: string; status: string }>('/quote-requests', input),

  // Randevular (yazma yolu) — id mobilde üretilir, API upsert ile idempotent
  bookings: () => get<Appointment[]>('/bookings'),
  createBooking: (b: Appointment) => post<Appointment>('/bookings', b),
  cancelBooking: (id: string) => post<Appointment>(`/bookings/${id}/cancel`, {}),

  // Auth (parola tabanlı; telefon sunucuda şifreli saklanır)
  register: (input: RegisterInput) => post<AuthSession>('/auth/register', input),
  login: (input: { identifier: string; password: string }) =>
    post<AuthSession>('/auth/login', input),

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

  // Sadakat (kullanıcıya bağlı; bakiye sunucuda defterden türetilir)
  loyalty: (token: string) => get<LoyaltySummary>('/loyalty', token),
  earnPoints: (token: string, points: number, reason: string, detail?: string) =>
    post<LoyaltySummary>('/loyalty/earn', { points, reason, detail }, token),
  redeemReward: (token: string, rewardId: string) =>
    post<LoyaltySummary>('/loyalty/redeem', { rewardId }, token),
};
