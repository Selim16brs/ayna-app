/**
 * AÇILIŞ MESAJI — ÖLÇÜLER (süre ve punto).
 *
 * Bunlar `AcilisMesaji.tsx` içindeydi. Ayrı dosyaya alındılar çünkü o
 * dosya React Native'i içeri çekiyor ve test koşucusu RN'i dönüştüremiyor:
 * ölçüler orada kalsaydı SINANAMAZDI. Saf aritmetik oldukları için burada
 * durmaları zaten daha doğru.
 */

/** Brief §6.1 — 1,2 sn taban + karakter başına 40 ms; sınırlar 1,8–3,5 sn. */
export function okumaSuresi(metin: string): number {
  return Math.min(3500, Math.max(1800, 1200 + metin.length * 40));
}

/**
 * Metin uzunluğuna göre punto.
 *
 * Brief §5.2: "En uzun mesajlar (genelde KK) tek ekranda, kırpılmadan ve
 * küçülmeden sığmalıdır… mesaj bazında otomatik küçültme kabul edilebilir
 * (alt sınır belirlenir)."
 *
 * Pacifico dolgun bir yazı; uzun Kazakça cümleler 34 puntoda taşıyor.
 * Alt sınır 24: altına inince el yazısı karakterini kaybediyor.
 */
export function mesajPuntosu(metin: string): number {
  if (metin.length <= 32) return 34;
  if (metin.length <= 52) return 30;
  if (metin.length <= 76) return 27;
  return 24;
}
