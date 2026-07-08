// EK Z.1 — DM mesajlaşma saf yardımcıları (test edilebilir; DB/Nest bağımlılığı yok).
import { keywordModeration, type ModerationVerdict } from '../circle/circle.moderation';

export type UserSide = 'customer' | 'pro';

// Rol → sohbet tarafı. Müşteri = user; uzman/salon = pro. Diğer roller sohbet edemez.
export function sideOf(role: string): UserSide | null {
  if (role === 'user') return 'customer';
  if (role === 'professional' || role === 'salon') return 'pro';
  return null; // admin/moderator DM'e katılmaz
}

// (me, target) rollerinden (customerId, proUserId) çöz. Aynı taraf ise null (sohbet açılamaz).
export function resolvePair(
  meId: string,
  meRole: string,
  targetId: string,
  targetRole: string,
): { customerId: string; proUserId: string } | null {
  const a = sideOf(meRole);
  const b = sideOf(targetRole);
  if (!a || !b || a === b) return null; // müşteri↔müşteri / uzman↔uzman / geçersiz rol yasak
  return a === 'customer'
    ? { customerId: meId, proUserId: targetId }
    : { customerId: targetId, proUserId: meId };
}

// Telefon numarası sızdırma koruması — 7+ rakam içeren dizi (arada boşluk/tire/parantez) maskelenir.
export function maskContact(text: string): string {
  return text.replace(/(?:\d[\s().-]?){7,}/g, '•••');
}

// Mesaj işleme: önce numara maskele, sonra keyword moderasyon.
export function processMessage(raw: string): { body: string; verdict: ModerationVerdict } {
  const body = maskContact(raw).trim();
  return { body, verdict: keywordModeration(body) };
}
