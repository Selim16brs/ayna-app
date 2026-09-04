import { z } from 'zod';

// §12.9 — parametrik oranlar (hepsi tam sayı; ₸/%/saat/puan)
export const RATE_DEFS = [
  { key: 'commission.rate', label: 'Komisyon oranı', suffix: '%', default: 10 },
  // K1 — kapora oranlı: clamp(round100(fiyat × pct), min, max). Üç anahtar da
  // koda gömülü DEĞİL; hesap `@ayna/domain` → `depositFor` içinde tek yerde.
  // Bu anahtarlar kodda zaten okunuyordu ama panelde YOKTU — yani yönetilebilir
  // görünen bir değer aslında hiç değiştirilemiyordu. Artık panelde de var.
  { key: 'rate.deposit_pct', label: 'Depozito oranı', suffix: '%', default: 10 },
  // K2 — alt sınır fiyatın kendisini aşabiliyordu: 1.000 ₸ hizmette depozito
  // ücretin TAMAMI oluyordu. Depozito bir ön ödemedir; kalanı hizmetten sonra
  // ödenir, yani her zaman bir kalan olmalı. Bu tavan onu garanti eder.
  // Eski düz tutar. Hesapta artık yalnız alt sınır yedeği; yeni kurulumda
  // `rate.deposit_min` bunu ezer. Panelde kalıyor ki eski değer görünür olsun.
  { key: 'rate.cancel_window_h', label: 'Ücretsiz iptal penceresi', suffix: 'saat', default: 3 },
  // §7.8 — aynı randevuda ücretsiz erteleme hakkı (0 = kapalı)
  { key: 'policy.free_reschedules', label: 'Ücretsiz erteleme hakkı', suffix: 'adet', default: 1 },
  // K5 — komisyon vadesinden sonra kısıtlamaya kadar tanınan süre
  {
    key: 'rate.commission_due_minutes',
    label: 'Komisyon ödeme süresi (para alındıktan sonra)',
    suffix: 'dk',
    default: 45,
  },
  {
    key: 'rate.commission_grace_minutes',
    label: 'Komisyon gecikme payı',
    suffix: 'dk',
    default: 45,
  },
  // §5.3 — hold ve yanıt pencereleri (slotu doğrudan etkiler)
  { key: 'policy.hold_minutes', label: 'Depozito ödeme süresi', suffix: 'dk', default: 10 },
  { key: 'policy.response_hours', label: 'Uzman yanıt süresi', suffix: 'saat', default: 3 },
  { key: 'rate.late_cancel_pct', label: 'Geç iptal / no-show cezası', suffix: '%', default: 3 },
  // K4 — para puan modeli
  { key: 'rate.points_cap_pct', label: 'Puan harcama tavanı', suffix: '%', default: 25 },
  { key: 'rate.points_unlock_kzt', label: 'Puan kullanım eşiği', suffix: '₸', default: 5000 },
  { key: 'rate.points_expiry_days', label: 'Puan ömrü', suffix: 'gün', default: 365 },
  { key: 'rate.points_earn_pct', label: 'Hizmetten geri kazanım', suffix: '%', default: 1 },
  { key: 'rate.premium_user_kzt', label: 'Premium üyelik (aylık)', suffix: '₸', default: 999 },
  /*
   * Platinum fiyatı SUNUCUDA olmalıydı ve değildi: uygulama onu koda
   * gömülü bir sabitten okuyor, o tutarı dekont ekranına ÖDENECEK TUTAR
   * olarak geçiriyordu. Fiyat değiştiğinde kullanıcı eskisini ödemeye
   * yönlendirilirdi.
   */
  { key: 'rate.platinum_user_kzt', label: 'Platinum üyelik (aylık)', suffix: '₸', default: 1999 },
  { key: 'rate.premium_salon_kzt', label: 'Salon premium (aylık)', suffix: '₸', default: 4990 },
  // §reklam — vitrin aylık ücreti. KODA GÖMÜLMÜYOR: fiyat değişince
  // yeni sürüm çıkarmak gerekmesin diye panelden yönetiliyor.
  { key: 'rate.ad_monthly_kzt', label: 'Reklam aylık ücreti', suffix: '₸', default: 200000 },
  { key: 'rate.raffle_cost', label: 'Çekiliş bileti', suffix: 'puan', default: 500 },
  /*
   * W2W ÖN MODERASYON — 0 kapalı, 1 açık.
   *
   * Kurucu: "w2w'de yorum yaptım ama yorum onayı admine düşmedi."
   * Sistem hatalı değildi, bilerek böyleydi: yalnız ŞÜPHELİ gönderi
   * kuyruğa düşüyor, temiz olan doğrudan yayınlanıyor.
   *
   * Ama bu bir ürün kararı ve tek doğrusu yok — hepsini onaya almak
   * hiçbir şeyi kaçırmaz ama her gönderi admini bekler. Karar artık
   * panelden veriliyor; VARSAYILAN 0, yani davranış değişmiyor.
   *
   * Sayı alanında duruyor çünkü `Setting` yalnız int/str taşıyor.
   */
  {
    key: 'policy.circle_premoderate',
    label: 'W2W: her gönderi onaya düşsün (0 kapalı / 1 açık)',
    suffix: '0-1',
    default: 0,
  },
] as const;

export const RATE_KEYS = RATE_DEFS.map((r) => r.key);

// §12.9 — dış servis API anahtarları
export const API_KEY_DEFS = [
  { provider: 'removebg', label: 'remove.bg (§5.1.1 arka plan kesimi)', key: 'apikey.removebg' },
  {
    provider: 'anthropic',
    label: 'Claude / Anthropic (Boni AI — ÖNERİLEN)',
    key: 'apikey.anthropic',
  },
  { provider: 'openai', label: 'OpenAI (Boni AI — alternatif)', key: 'apikey.openai' },
  { provider: 'sms', label: 'SMS sağlayıcısı (OTP)', key: 'apikey.sms' },
] as const;

export const API_PROVIDERS = API_KEY_DEFS.map((k) => k.provider);

/**
 * §4.4 — KASPİ ÖDEME BAĞLANTISI.
 *
 * SES INVEST TOO'nun Kaspi QR kodunun İÇERİĞİ (QR bir URL taşır). Uygulama bu
 * adresi açar; Kaspi uygulaması alıcıyı hazır getirir, müşteri hiçbir şey
 * yazmaz.
 *
 * Değer koda gömülmüyor, admin ayarı: QR yenilendiğinde ya da hesap
 * değiştiğinde uygulama sürümü çıkmak gerekmesin.
 *
 * `{tutar}` ve `{ref}` yer tutucuları — bağlantı bunları destekliyorsa tutar ve
 * randevu referansı da hazır gelir. Desteklemiyorsa yer tutucu KOYULMAZ; sabit
 * QR açılır ve tutarı ekranda gösterip kopyalatırız. Hangi biçimin çalıştığı
 * TELEFONDA denenerek doğrulanır — tahminle yazılan bir şema gerçek cihazda
 * sessizce açılmaz ve müşteri parayı gönderemez.
 */
export const KASPI_PAYMENT_KEY = 'kaspi.payment_url';

export const kaspiLinkSchema = z.object({
  // Boş değer = özelliği KAPAT (düğme hiç görünmez). Yarım yapılandırma yok.
  url: z
    .string()
    .trim()
    .max(500)
    .refine((v) => v === '' || /^https?:\/\/|^kaspi:\/\//i.test(v), {
      message: 'Bağlantı http(s):// ya da kaspi:// ile başlamalı',
    }),
});
export type KaspiLinkInput = z.infer<typeof kaspiLinkSchema>;

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
