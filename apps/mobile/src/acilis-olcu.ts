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
 * Ölçek yazı tipiyle birlikte AYARLANDI. El yazısından uygulamanın kendi
 * yazı tipine geçilince en uzun Kazakça kelime ("қайталанбассың!") 34
 * puntoda 278px oluyor ve en dar ekranın 256px'lik satırına sığmıyordu —
 * satır sarma kelimeyi bölmediği için ekrandan taşardı. Üst uç 30.
 *
 * Sayılar tahmin değil: `acilis-sigma.test.ts` fontun kendi glif
 * genişliklerini okuyup her mesajı ölçüyor. Alt sınır 24:
 * altına inince açılış ekranının vurgusu kayboluyor, sıradan bir yazıya
 * dönüyor.
 */
export function mesajPuntosu(metin: string): number {
  if (metin.length <= 32) return 30;
  if (metin.length <= 52) return 28;
  if (metin.length <= 76) return 26;
  return 24;
}
