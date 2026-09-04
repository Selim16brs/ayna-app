// Randevuda GERÇEKTEN ödenen tutar — tek doğruluk kaynağı.
//
// Kurucu (05.09.2026): "eğer kuaförde ilk rezervasyondaki fiyat değişmemişse
// direkt ödeme yaptım basabilir, eğer değişiklik olduysa ona göre tutarı girer
// ve ona göre ayna para kazanır."
//
// Yani randevunun İKİ tutarı var ve ikisi de saklanmak zorunda:
//   · `price`      — rezervasyon anında anlaşılan fiyat. Depozito bunun %10'u
//                    olarak alındı; dekont doğrulaması buna bakıyor. Üzerine
//                    yazılırsa admin kuyruğu ödenmiş depozitoyu "eksik" sanır.
//   · `finalPrice` — müşterinin salonda ödediğini BEYAN ettiği tutar. Yalnız
//                    değiştiyse dolar; puan ve komisyon bundan doğar.
//
// Tek satırlık bir `??` gibi görünüyor ama üç ayrı yerde (puan, komisyon,
// panel) tekrarlanınca biri unutulduğunda müşteri eski fiyattan puan alıp
// AYNA yeni fiyattan komisyon isteyebiliyordu.

export type TutarliRandevu = {
  price: unknown;
  finalPrice?: unknown;
};

/** Beyan edilebilir en yüksek tutar — Decimal(12,2) sütununun sığdırdığı. */
export const AZAMI_TUTAR = 9_999_999_99 / 100;

/**
 * Randevunun PARA HESABINA giren tutarı.
 *
 * Beyan yoksa rezervasyon fiyatı. Beyan varsa beyan — çünkü kasada ödenen
 * odur; komisyon da geri kazanım da gerçekten el değiştiren paradan doğar.
 */
export function odenenTutar(b: TutarliRandevu): number {
  const beyan = Number(b.finalPrice);
  if (Number.isFinite(beyan) && beyan > 0) return beyan;
  const fiyat = Number(b.price);
  return Number.isFinite(fiyat) && fiyat > 0 ? fiyat : 0;
}

/**
 * Müşterinin girdiği tutar kabul edilebilir mi?
 *
 * Sıfır ve negatif reddedilir (hizmet bedava olamaz; iptal ayrı bir akış),
 * kuruştan ince tutar reddedilir (₸ para birimi iki hane), sütunun taşırdığı
 * tutar reddedilir — yoksa veritabanı hatası kullanıcıya 500 olarak döner.
 */
export function beyanEdilenTutarGecerli(v: unknown): v is number {
  if (typeof v !== 'number' || !Number.isFinite(v)) return false;
  if (v <= 0 || v > AZAMI_TUTAR) return false;
  return Math.round(v * 100) === v * 100;
}

/**
 * Uzmanın AYNA'ya CARİ borcu — kurucu: "uzmanda aynaya cari olarak depozito
 * dışında kalan tutarı alması gerekir."
 *
 * AYNA'nın geliri komisyondur ve depozitoyu müşteriden ZATEN tahsil etmiştir.
 * Fiyat değişmediyse komisyon = depozito → borç 0. Fiyat yükseldiyse aradaki
 * fark uzmanın cari hesabına yazılır; düştüyse borç doğmaz (fazla tahsilat 0
 * sayılır, tıpkı panelin diğer alacak hesaplarında olduğu gibi).
 */
export function uzmanCariBorcu(komisyon: number, tahsilEdilenDepozito: number): number {
  const k = Number.isFinite(komisyon) ? komisyon : 0;
  const d = Number.isFinite(tahsilEdilenDepozito) ? tahsilEdilenDepozito : 0;
  return Math.max(0, Math.round((k - d) * 100) / 100);
}
