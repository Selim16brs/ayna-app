/**
 * §8.5 — AYNA'nın finanse ettiği puan indiriminin komisyondan mahsubu.
 *
 * SORUN: müşteri randevunun bir kısmını puanla ödeyince uzmanın eline geçen
 * nakit azalıyordu (`cashAmount = amount - pointsUsed`), ama komisyon TAM fiyat
 * üzerinden kesiliyordu. Yani AYNA'nın dağıttığı puanı sessizce uzman
 * finanse ediyordu ve bundan haberi yoktu. Şartname bunu açıkça yasaklıyor:
 * "AYNA tarafından finanse edilen reward uzman alacağını düşürmez; komisyon
 * faturasından kontrollü subsidy/credit olarak mahsup edilir."
 *
 * ÇÖZÜM: AYNA finanse ettiyse, uzmanın eksik aldığı tutar kadar komisyondan
 * indirim yapılır. Sınırsız değil — şartname §8.4 sübvansiyonu net komisyonun
 * belirli bir oranıyla sınırlıyor ki AYNA'nın maruziyeti öngörülebilir kalsın.
 *
 * Matrah DEĞİŞMEZ (§7: matrah nihai hizmet bedelidir). Değişen, faturadan
 * düşülen kredi satırıdır — böylece hem muhasebe doğru kalır hem uzman mağdur
 * olmaz.
 */

/** Uzmanın alacağını düşürmeyen, komisyondan mahsup edilecek kaynaklar. */
const AYNA_FUNDED = new Set(['AYNA_COMMISSION', 'CAMPAIGN_BUDGET', 'PARTNER_FUNDED']);

export interface DiscountRow {
  /** Bu ödemede puanla karşılanan tutar (₸; 1 puan = 1 ₸). */
  pointsUsed: number;
  /** AYNA_COMMISSION | EXPERT_FUNDED | CAMPAIGN_BUDGET | PARTNER_FUNDED */
  fundingSource: string;
}

/** Uzmanın kendi finanse ettiği indirim mahsup edilmez — zaten onun kararı. */
export function aynaFundedDiscount(rows: DiscountRow[]): number {
  return rows.reduce(
    (sum, r) => (AYNA_FUNDED.has(r.fundingSource) ? sum + Math.max(0, r.pointsUsed) : sum),
    0,
  );
}

/**
 * Komisyondan düşülecek kredi.
 * @param commissionNet Brüt net komisyon (matrah × oran)
 * @param aynaFunded    AYNA'nın finanse ettiği toplam indirim
 * @param capRate       Sübvansiyon tavanı (net komisyonun oranı, §8.4)
 */
export function rewardSubsidyCredit(
  commissionNet: number,
  aynaFunded: number,
  capRate: number,
): number {
  if (commissionNet <= 0 || aynaFunded <= 0) return 0;
  const cap = commissionNet * Math.max(0, Math.min(1, capRate));
  // Kredi hiçbir zaman komisyonu negatife düşürmez: AYNA uzmana para ödemez,
  // yalnız kendi alacağından vazgeçer.
  return Math.round(Math.min(aynaFunded, cap, commissionNet) * 100) / 100;
}
