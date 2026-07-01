// AYNA Pro — API istemcisi (salon/uzman token'ı localStorage'da)
export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:3000/api/v1';

const TOKEN_KEY = 'ayna_pro_token';

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
  myBusinesses: () => req<Business[]>('/businesses/mine'),
  inviteCodes: (businessId: string) =>
    req<InviteCode[]>(`/businesses/${businessId}/invite-codes`),
  createInviteCode: (businessId: string) =>
    req<InviteCode>(`/businesses/${businessId}/invite-codes`, { method: 'POST' }),
  revokeInviteCode: (businessId: string, codeId: string) =>
    req<{ ok: boolean }>(`/businesses/${businessId}/invite-codes/${codeId}/revoke`, {
      method: 'POST',
    }),
  myBookings: (businessId: string) =>
    req<BookingsResp>(`/businesses/${businessId}/bookings`),
  myReviews: (businessId: string) => req<ReviewsResp>(`/businesses/${businessId}/reviews`),
  replyReview: (businessId: string, ratingId: string, reply: string) =>
    req<{ id: string; reply: string }>(
      `/businesses/${businessId}/reviews/${ratingId}/reply`,
      { method: 'POST', body: JSON.stringify({ reply }) },
    ),
};

export interface Business {
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
export interface InviteCode {
  id: string;
  code: string;
  status: string;
  attempts?: number;
}
export interface ProBooking {
  id: string;
  service: string;
  customerName: string;
  dateLabel: string;
  price: number;
  status: string;
  bookingKind: string;
  source: string;
}
export interface BookingsResp {
  linked: boolean;
  bookings: ProBooking[];
}
export interface ProReview {
  id: string;
  score: number;
  comment: string;
  serviceTag: string;
  authorLabel: string;
  reply: string;
  createdAt: string;
}
export interface ReviewsResp {
  linked: boolean;
  average: number | null;
  count: number;
  reviews: ProReview[];
}
