-- Güven ve mahremiyet: şikâyet, passport, W2W öneri doğrulaması.
-- Tümü EKLEMELİ: mevcut satırlar bozulmaz, geri alınabilir.

-- §21 Kullanıcı şikâyeti (şikâyet edilen ASLA görmez — okuma ucu yalnız gönderende)
CREATE TABLE "user_reports" (
    "id" UUID NOT NULL,
    "reporter_id" UUID NOT NULL,
    "target_id" UUID NOT NULL,
    "reason" TEXT NOT NULL DEFAULT 'other',
    "note" TEXT NOT NULL DEFAULT '',
    "thread_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_reports_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "user_reports_target_id_created_at_idx" ON "user_reports"("target_id", "created_at");
CREATE INDEX "user_reports_status_created_at_idx" ON "user_reports"("status", "created_at");

-- §19 AYNA Passport: alerjiler + tercihler
CREATE TABLE "user_passports" (
    "user_id" UUID NOT NULL,
    "allergies" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "quiet_visit" BOOLEAN NOT NULL DEFAULT false,
    "no_photos" BOOLEAN NOT NULL DEFAULT false,
    "notify_late" BOOLEAN NOT NULL DEFAULT true,
    "women_only" BOOLEAN NOT NULL DEFAULT false,
    "traits_json" TEXT NOT NULL DEFAULT '{}',
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "user_passports_pkey" PRIMARY KEY ("user_id")
);

-- §19 Passport erişim kaydı — kaydı kullanıcı da görür, 24 saatte kendiliğinden kapanır
CREATE TABLE "passport_access" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "pro_id" TEXT NOT NULL,
    "booking_id" TEXT,
    "granted_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "revoked_at" TIMESTAMPTZ(6),
    "last_view_at" TIMESTAMPTZ(6),
    CONSTRAINT "passport_access_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "passport_access_user_id_granted_at_idx" ON "passport_access"("user_id", "granted_at");
CREATE INDEX "passport_access_pro_id_expires_at_idx" ON "passport_access"("pro_id", "expires_at");

-- §14/§15 W2W: öneri hangi uzmana + öneren gerçekten gitmiş miydi
ALTER TABLE "circle_comments" ADD COLUMN     "pro_id" TEXT;
ALTER TABLE "circle_comments" ADD COLUMN     "pro_verified" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX "circle_comments_pro_id_idx" ON "circle_comments"("pro_id");

-- ─────────────────────────────────────────────────────────────────────────────
-- NOT (önemli): Bu depodaki migrations klasörü ile schema.prisma ARASINDA
-- ÖNCEDEN VAR OLAN bir sapma bulunuyor — schema.prisma'da olup migration'larda
-- karşılığı olmayan sütunlar var (users.prefs_json, users.referral_code,
-- users.referred_by, weekly_themes.i18n). Bu, üretimin `prisma db push`
-- (şema-öncelikli) ile dağıtıldığını gösteriyor; `migrate deploy` kullanılsaydı
-- o sütunlar üretimde hiç oluşmazdı.
--
-- Bu dosya yine de yazıldı ki her iki yol da çalışsın: `db push` şemadan
-- türetir, `migrate deploy` bu SQL'i uygular. İkisi de aynı sonucu verir —
-- bu migration boş bir veritabanında sınandı ve schema.prisma ile
-- `migrate diff` farkı SIFIR çıktı.
--
-- Sapmanın kendisi ayrı bir iş: migrations klasörü ya şemaya göre yeniden
-- temellendirilmeli ya da tamamen bırakılıp `db push` tek yol yapılmalı.
