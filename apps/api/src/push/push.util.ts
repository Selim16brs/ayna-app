// EK Z.5 — Uzaktan push saf yardımcıları (test edilebilir; ağ/DB bağımlılığı yok).

export interface PushPayload {
  title: string;
  body: string;
  // DEEP-LINK kuralı (MD_000 satır 266): her bildirim ilgili şeyin doğrudan kendisine gider.
  data?: Record<string, unknown>;
}

// Expo push token biçimi doğrulaması (ExponentPushToken[...] / ExpoPushToken[...])
export function isValidExpoToken(t: string): boolean {
  return /^Expo(nent)?PushToken\[.+\]$/.test(t);
}

// Token listesi + payload → Expo push mesaj gövdeleri (geçersiz token'lar elenir).
export function buildExpoMessages(tokens: string[], p: PushPayload) {
  return tokens.filter(isValidExpoToken).map((to) => ({
    to,
    title: p.title,
    body: p.body,
    sound: 'default' as const,
    data: p.data ?? {},
  }));
}
