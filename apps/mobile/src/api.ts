import Constants from 'expo-constants';
import type { Appointment, Professional, ProfessionalDetail } from './data';

// API taban adresi: Expo dev host IP'sinden türetilir (simülatör + cihaz uyumlu).
const hostUri = Constants.expoConfig?.hostUri ?? '';
const host = hostUri.split(':')[0] || 'localhost';
export const API_BASE = `http://${host}:3000/api/v1`;

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`GET ${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
};
