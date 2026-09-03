import { z } from 'zod';

/**
 * AYNA ortam değişkeni şeması (ticket 1.3).
 * Boot anında doğrulanır; eksik/yanlış değerde uygulama BAŞLAMAZ (fail-fast).
 * Bkz. docs/planning/06-coding-standards.md, docs/security/03-data-classification.md
 */
export const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

    API_PORT: z.coerce.number().int().positive().default(3000),
    API_GLOBAL_PREFIX: z.string().default('api/v1'),

    DATABASE_URL: z.string().url(),
    REDIS_URL: z.string().url().optional(), // kullanılmıyor — zorunlu değil (kurtarma yüzeyini küçültür)

    JWT_ACCESS_SECRET: z.string().min(16),
    JWT_REFRESH_SECRET: z.string().min(16),
    JWT_ACCESS_TTL: z.coerce.number().int().positive().default(2592000), // 30 gün — mobilde refresh akışı yok, kısa TTL 15dk sonra UNAUTHENTICATED veriyordu
    JWT_REFRESH_TTL: z.coerce.number().int().positive().default(2_592_000),

    FIELD_ENCRYPTION_KEY: z.string().min(16),
    /**
     * Yönetici şifresi KURTARMA yolu.
     *
     * Panel girişi kilitlendiğinde (şifre kayboldu/bozuldu) yönetici hesabını
     * yeniden kurmanın tek yolu veritabanına doğrudan erişimdi. Bu değişken
     * ayarlıysa API açılışta `admin@ayna.kz` hesabını bu şifreyle kurar/günceller.
     *
     * GÜVENLİK: yalnız ortam değişkenini ayarlayabilen (yani zaten sunucuya sahip
     * olan) biri kullanabilir; dışarıya AÇILAN BİR UÇ YOK. En az 12 karakter.
     * İş bitince değişkeni SİL — bırakılırsa her dağıtımda şifre bu değere döner.
     */
    ADMIN_BOOTSTRAP_PASSWORD: z.string().min(12).optional(),

    PAYMENT_PROVIDER: z.enum(['mock']).default('mock'),
    /**
     * SMS sağlayıcısı.
     *
     * `mock` — hiçbir yere gitmez, kod konsola yazılır (yalnız yerel).
     * `smsc` — SMSC.kz üzerinden GERÇEK SMS. Kazakistan'da dört operatöre de
     *          (Kcell, Beeline, Tele2, Altel) yerel tarifeden ulaşıyor.
     */
    SMS_PROVIDER: z.enum(['mock', 'smsc']).default('mock'),
    SMSC_LOGIN: z.string().optional(),
    SMSC_PASSWORD: z.string().optional(),
    /**
     * Telefonda görünen gönderen adı ("AYNA").
     *
     * İsteğe bağlı: SMSC kayıtsız hesaplara ortak ad (SMSC.KZ) veriyor, o da
     * çalışır. Kendi adımız operatör başına aylık ücretli ve SMSC panelinden
     * kaydediliyor — kaydedilmemiş bir ad GÖNDERİMİ REDDETTİRİR, o yüzden
     * ancak kayıt onaylandıktan sonra doldurulmalı.
     */
    SMSC_SENDER: z.string().optional(),
    // GÜVENLİK (P0): OTP kodunun API yanıtında dönmesi YALNIZ bu bayrak açıkken olur.
    // Varsayılan KAPALI — üretimde kod asla sızmaz (hesap ele geçirme açığı kapatıldı).
    // Yerel geliştirmede apps/api/.env içine OTP_DEBUG_CODES=true yazılır.
    OTP_DEBUG_CODES: z
      .string()
      .optional()
      .transform((v) => v === 'true'),
    MAP_PROVIDER: z.enum(['mock']).default('mock'),
    STORAGE_PROVIDER: z.enum(['mock']).default('mock'),
    // §medya — Cloudflare R2 (S3 uyumlu). Hepsi doluysa foto R2'ye yüklenir; boşsa data URL kalır.
    R2_ACCOUNT_ID: z.string().optional(),
    R2_ACCESS_KEY_ID: z.string().optional(),
    R2_SECRET_ACCESS_KEY: z.string().optional(),
    R2_BUCKET: z.string().optional(),
    R2_PUBLIC_URL: z.string().optional(),

    // AI (§13.5) — anahtar yalnızca backend'de; yoksa güvenli mock kullanılır
    OPENAI_API_KEY: z.string().optional(),
    AI_MONTHLY_QUOTA: z.coerce.number().int().positive().default(5),
  })
  /**
   * SMSC seçiliyse kimlik ZORUNLU — eksikse API hiç açılmaz.
   *
   * Alternatifi sessiz felaketti: sağlayıcı `smsc` ama şifre boş → her OTP
   * isteği sunucuda patlar, kullanıcı sebebini bilmeden kayıt olamaz. Açılışta
   * durmak, üretimde saatlerce kod göndermemekten iyidir.
   */
  .superRefine((env, ctx) => {
    if (env.SMS_PROVIDER !== 'smsc') return;
    for (const alan of ['SMSC_LOGIN', 'SMSC_PASSWORD'] as const) {
      if (!env[alan]) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [alan],
          message: `SMS_PROVIDER=smsc iken ${alan} zorunlu`,
        });
      }
    }
  });

export type Env = z.infer<typeof envSchema>;

/**
 * Verilen kaynaktan (varsayılan process.env) ortamı doğrular.
 * Hata durumunda okunaklı bir mesajla fırlatır — gizli değer basmadan.
 */
export function loadEnv(source: Record<string, string | undefined> = process.env): Env {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Geçersiz ortam değişkenleri:\n${issues}`);
  }
  return parsed.data;
}
