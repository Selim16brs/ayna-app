import Constants from 'expo-constants';

// API taban adresi: Expo dev host IP'sinden türetilir (simülatör + cihaz uyumlu).
const hostUri = Constants.expoConfig?.hostUri ?? '';
const host = hostUri.split(':')[0] || 'localhost';
export const API_BASE = `http://${host}:3000/api/v1`;

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`GET ${path} → ${res.status}`);
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
  professionals: () => get<ApiProfessional[]>('/professionals'),
  quotes: () => get<ApiQuote[]>('/quotes'),
  createQuoteRequest: async (input: { categoryId: string; note?: string; photoUrl?: string }) => {
    const res = await fetch(`${API_BASE}/quote-requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!res.ok) throw new Error(`POST /quote-requests → ${res.status}`);
    return res.json() as Promise<{ id: string; status: string }>;
  },
};
