/**
 * ÜYELİK PAKETİ — saf mantık.
 *
 * React Native'e bağlı `ui/PlanBadge.tsx` içinde duruyordu ve Node test
 * koşucusu o dosyayı derleyemediği için davranışı hiç test edilemiyordu.
 * Kademe seçimi paranın karşılığını belirliyor; test edilebilir olmalı.
 */

/** Satın alınan paket. Puanla kazanılan sadakat SEVİYESİ (bronz/gümüş/altın) ayrı şeydir. */
export type PlanTier = 'free' | 'premium' | 'platinum';

export const PLAN_TIERS: readonly PlanTier[] = ['free', 'premium', 'platinum'];

/**
 * Sunucudan gelen serbest metni kademeye çevirir.
 *
 * `membershipTier` tel üzerinde `string`. Tipi zorla birleşime daraltmak
 * DERLEYİCİYE yalan söylemek olurdu: sunucu yarın başka bir değer eklerse
 * kod onu geçerli sanır, `META[tier]` undefined döner ve ekran patlar.
 * Bilinmeyen değer sessizce `free`'ye düşüyor — yanlış rozet göstermektense
 * hiç göstermemek doğru.
 */
export function asPlanTier(v: string | null | undefined): PlanTier {
  return v === 'premium' || v === 'platinum' ? v : 'free';
}
