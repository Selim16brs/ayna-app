// EK Z.8 — Ödeme sağlayıcı adaptörü. Gerçek Kaspi merchant erişimi gelince
// KaspiLiveAdapter yazılıp PAYMENT_PROVIDER token'ı ona bağlanır; servis değişmez.

export interface ChargeRequest {
  paymentId: string;
  amount: number; // Kaspi ile ödenecek nakit (KZT)
  currency: 'KZT';
}
export interface ChargeResult {
  ok: boolean;
  providerRef: string;
}
export interface PaymentProvider {
  readonly kind: string;
  charge(req: ChargeRequest): Promise<ChargeResult>;
}

// Nest DI token — gerçek adaptöre geçişte tek değişecek yer.
export const PAYMENT_PROVIDER = Symbol('PAYMENT_PROVIDER');

// Simülasyon adaptörü: gerçek para hareketi YOK. Her tahsilatı başarı döner,
// izlenebilir sahte referans üretir. (Gerçek Kaspi Pay/QR akışı buraya girecek.)
export class KaspiSimAdapter implements PaymentProvider {
  readonly kind = 'kaspi-sim';
  async charge(req: ChargeRequest): Promise<ChargeResult> {
    return { ok: true, providerRef: `KASPI-SIM-${req.paymentId.slice(0, 8).toUpperCase()}` };
  }
}
