/**
 * Sadakat puanı ledger mantığı — docs/planning/03-erd-draft.md §7
 * Bakiye ASLA saklanmaz; ledger toplamından türetilir (risk R5, EK E loyalty_ledger).
 */
export type LoyaltyTransactionType = 'earn' | 'spend' | 'expire' | 'reversal';

export interface LoyaltyEntry {
  readonly transactionType: LoyaltyTransactionType;
  /** İşaretli tamsayı: earn pozitif, spend/expire negatif, reversal ters kayıt */
  readonly amount: number;
  readonly expiresAt?: Date | null;
}

export class InsufficientBalanceError extends Error {
  readonly code = 'LOYALTY_INSUFFICIENT_BALANCE';
  constructor(
    readonly balance: number,
    readonly requested: number,
  ) {
    super(`Yetersiz puan bakiyesi: mevcut ${balance}, istenen ${requested}`);
    this.name = 'InsufficientBalanceError';
  }
}

/** Bakiye = tüm ledger kayıtlarının toplamı. */
export function computeBalance(entries: readonly LoyaltyEntry[]): number {
  return entries.reduce((sum, e) => sum + e.amount, 0);
}

/** `at` anında süresi dolmamış kayıtları sayarak kullanılabilir bakiyeyi hesaplar. */
export function computeAvailableBalance(entries: readonly LoyaltyEntry[], at: Date): number {
  return entries.reduce((sum, e) => {
    if (e.expiresAt && e.expiresAt.getTime() <= at.getTime()) return sum;
    return sum + e.amount;
  }, 0);
}

/**
 * Harcama kaydı üretir; yetersiz bakiyede InsufficientBalanceError fırlatır.
 * Saf fonksiyon — kalıcılık çağıran katmanda (tek transaction + audit).
 */
export function buildSpendEntry(
  entries: readonly LoyaltyEntry[],
  amount: number,
  at: Date,
): LoyaltyEntry {
  if (amount <= 0) throw new Error('Harcama tutarı pozitif olmalı');
  const available = computeAvailableBalance(entries, at);
  if (amount > available) throw new InsufficientBalanceError(available, amount);
  return { transactionType: 'spend', amount: -amount };
}
