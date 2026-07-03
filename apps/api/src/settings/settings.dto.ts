import { z } from 'zod';

// §12.9 — parametrik oranlar (hepsi tam sayı; ₸/%/saat/puan)
export const RATE_DEFS = [
  { key: 'commission.rate', label: 'Komisyon oranı', suffix: '%', default: 10 },
  { key: 'rate.deposit_kzt', label: 'Depozito tutarı', suffix: '₸', default: 1000 },
  { key: 'rate.cancel_window_h', label: 'Ücretsiz iptal penceresi', suffix: 'saat', default: 3 },
  { key: 'rate.late_cancel_pct', label: 'Geç iptal / no-show cezası', suffix: '%', default: 3 },
  { key: 'rate.points_cap_pct', label: 'Puan harcama tavanı', suffix: '%', default: 50 },
  { key: 'rate.premium_user_kzt', label: 'Premium üyelik (aylık)', suffix: '₸', default: 999 },
  { key: 'rate.premium_salon_kzt', label: 'Salon premium (aylık)', suffix: '₸', default: 4990 },
  { key: 'rate.raffle_cost', label: 'Çekiliş bileti', suffix: 'puan', default: 500 },
] as const;

export const RATE_KEYS = RATE_DEFS.map((r) => r.key);

// §12.9 — dış servis API anahtarları
export const API_KEY_DEFS = [
  { provider: 'removebg', label: 'remove.bg (§5.1.1 arka plan kesimi)', key: 'apikey.removebg' },
  { provider: 'openai', label: 'OpenAI (Boni AI asistanı)', key: 'apikey.openai' },
  { provider: 'sms', label: 'SMS sağlayıcısı (OTP)', key: 'apikey.sms' },
] as const;

export const API_PROVIDERS = API_KEY_DEFS.map((k) => k.provider);

export const rateSchema = z.object({
  key: z.enum(RATE_KEYS as [string, ...string[]]),
  value: z.number().int().min(0).max(10_000_000),
});
export type RateInput = z.infer<typeof rateSchema>;

export const apiKeySchema = z.object({
  provider: z.enum(API_PROVIDERS as [string, ...string[]]),
  value: z.string().max(400), // boş → anahtarı temizler
});
export type ApiKeyInput = z.infer<typeof apiKeySchema>;

export const citiesSchema = z.object({
  active: z.array(z.string().min(1)).max(200),
  soon: z.array(z.string().min(1)).max(200),
});
export type CitiesInput = z.infer<typeof citiesSchema>;

// §12.9 — kategori başına bakım periyodu (gün) + hizmet süresi (dk)
export const categoryConfigSchema = z.record(
  z.string(),
  z.object({
    maintenanceDays: z.number().int().min(0).max(365),
    serviceMin: z.number().int().min(0).max(1440),
  }),
);
export type CategoryConfigInput = z.infer<typeof categoryConfigSchema>;
