import { z } from 'zod';

/**
 * AYNA ortam değişkeni şeması (ticket 1.3).
 * Boot anında doğrulanır; eksik/yanlış değerde uygulama BAŞLAMAZ (fail-fast).
 * Bkz. docs/planning/06-coding-standards.md, docs/security/03-data-classification.md
 */
export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  API_PORT: z.coerce.number().int().positive().default(3000),
  API_GLOBAL_PREFIX: z.string().default('api/v1'),

  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),

  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_ACCESS_TTL: z.coerce.number().int().positive().default(2592000), // 30 gün — mobilde refresh akışı yok, kısa TTL 15dk sonra UNAUTHENTICATED veriyordu
  JWT_REFRESH_TTL: z.coerce.number().int().positive().default(2_592_000),

  FIELD_ENCRYPTION_KEY: z.string().min(16),

  PAYMENT_PROVIDER: z.enum(['mock']).default('mock'),
  SMS_PROVIDER: z.enum(['mock']).default('mock'),
  MAP_PROVIDER: z.enum(['mock']).default('mock'),
  STORAGE_PROVIDER: z.enum(['mock']).default('mock'),

  // AI (§13.5) — anahtar yalnızca backend'de; yoksa güvenli mock kullanılır
  OPENAI_API_KEY: z.string().optional(),
  AI_MONTHLY_QUOTA: z.coerce.number().int().positive().default(5),
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
