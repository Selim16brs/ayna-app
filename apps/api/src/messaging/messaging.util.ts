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

// Kurucu izin modeli — SAF karar (DB'siz, test edilebilir):
//  • Karşılıklı takip → her zaman serbest.
//  • Kullanıcı → uzman/salon: uzman yanıtladıysa serbest; yanıtlamadıysa TEK açılış mesajı.
//  • Uzman/salon → kullanıcı: kullanıcı yazdıysa yanıtlanır; yazmadıysa yalnız uzman kullanıcıyı
//    takip ediyorsa ilk mesaj atılabilir (uygulama-dışı reklam/spam engeli).
export type SendDecision = { ok: true } | { ok: false; code: 'AWAIT_REPLY' | 'FOLLOW_REQUIRED' };
export function canSendDecision(input: {
  senderIsCustomer: boolean;
  meFollowsOther: boolean; // gönderen karşı tarafı takip ediyor mu
  otherFollowsMe: boolean; // karşı taraf göndereni takip ediyor mu
  custMsgs: number; // sohbette müşterinin mevcut mesaj sayısı (yeni mesaj hariç)
  proMsgs: number; // sohbette uzman/salonun mevcut mesaj sayısı
}): SendDecision {
  if (input.meFollowsOther && input.otherFollowsMe) return { ok: true }; // karşılıklı takip
  if (input.senderIsCustomer) {
    if (input.proMsgs > 0) return { ok: true }; // uzman yanıtladı → sohbet açık
    if (input.custMsgs === 0) return { ok: true }; // ilk (ve tek) açılış mesajı
    return { ok: false, code: 'AWAIT_REPLY' };
  }
  if (input.custMsgs > 0) return { ok: true }; // kullanıcı önce yazdı → uzman yanıtlar
  if (input.meFollowsOther) return { ok: true }; // uzman kullanıcıyı takip ediyor → ilk mesaj
  return { ok: false, code: 'FOLLOW_REQUIRED' };
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
