// §12.8 — komisyon saf matematiği.
//
// PARA FLOAT'TA TOPLANMAZ (CLAUDE.md: "Para: NUMERIC(12,2), KZT, asla float").
// Ölçüldü: fiyatları `Number(price)` olarak toplayıp komisyon hesaplamak, 4000
// dönemin 150'sinde (%3,75) farklı bir tutar üretiyordu — float toplamı
// yuvarlama sınırının hemen altına düşüyor (1360443.4499999993 ≠ 1360443.45) ve
// Math.round aşağı yuvarlıyor. Sapma 1 tiyn, ama asıl sorun faturanın
// YENİDEN HESAPLANAMAMASI: aynı randevulardan aynı sayı çıkmıyor.
//
// Çözüm: toplama TAM SAYI KURUŞ (tiyn) üzerinden yapılır, tek seferde ₸'ye
// dönülür.

export const DAY_MS = 24 * 60 * 60 * 1000;

/** ₸ → tiyn (tam sayı). Kayan nokta artığı burada bir kez temizlenir. */
export function toMinor(kzt: number): number {
  return Number.isFinite(kzt) ? Math.round(kzt * 100) : 0;
}

/** tiyn → ₸ (2 hane). */
export function fromMinor(minor: number): number {
  return Math.round(minor) / 100;
}

/** Tutar listesini tiyn cinsinden toplar — ara toplamda float birikmez. */
export function sumMinor(values: readonly number[]): number {
  return values.reduce<number>((acc, v) => acc + toMinor(v), 0);
}

/**
 * Komisyon — ciro TİYN cinsinden verilir. Faturalama yolu bunu kullanır.
 * Sonuç ₸ (2 hane).
 */
export function commissionFromMinor(grossMinor: number, ratePct: number): number {
  if (!Number.isFinite(grossMinor) || !Number.isFinite(ratePct)) return 0;
  return Math.round((grossMinor * ratePct) / 100) / 100;
}

/**
 * Komisyon — ciro ₸ cinsinden. TEK bir tutar için güvenli (tek değerde float
 * artığı oluşmaz). ÇOK tutarın toplamı için `sumMinor` + `commissionFromMinor`
 * kullan; bu fonksiyona toplam geçmek yukarıdaki sapmayı geri getirir.
 */
export function commissionFor(grossKzt: number, ratePct: number): number {
  return commissionFromMinor(toMinor(grossKzt), ratePct);
}

// Vade geçmiş gün sayısı (negatif olmaz). collected ise 0 verilmeli (çağıran karar verir).
export function overdueDaysBetween(dueDate: Date, now: Date): number {
  return Math.max(0, Math.floor((now.getTime() - dueDate.getTime()) / DAY_MS));
}
