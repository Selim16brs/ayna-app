// §12.8 — komisyon saf matematiği (test edilebilir; para = tam sayı kuruş mantığı)
export const DAY_MS = 24 * 60 * 60 * 1000;

// Ciro (KZT) × oran(%) → komisyon (2 hane). round(gross*rate)/100 kuruş yuvarlaması.
export function commissionFor(grossKzt: number, ratePct: number): number {
  return Math.round(grossKzt * ratePct) / 100;
}

// Vade geçmiş gün sayısı (negatif olmaz). collected ise 0 verilmeli (çağıran karar verir).
export function overdueDaysBetween(dueDate: Date, now: Date): number {
  return Math.max(0, Math.floor((now.getTime() - dueDate.getTime()) / DAY_MS));
}
