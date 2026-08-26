-- K7 — MIGRATION SAPMASINI UZLAŞTIRMA
--
-- Üretim `prisma db push` ile dağıtılıyor (Dockerfile:32), bu yüzden bu klasör
-- üretimde HİÇ çalışmadı ve zamanla şemadan koptu: `prisma migrate deploy` ile
-- kurulan boş bir veritabanında 13 tablo, 3 enum ve 82 kolon eksikti.
--
-- Şartname yasakları gereği geçmiş migration dosyalarına DOKUNULMADI
-- ("Mevcut migration dosyalarını değiştirme veya silme"); fark bu YENİ dosyada
-- kapatılıyor. İçerik `prisma migrate diff` ile üretildi, sonra idempotent hâle
-- getirildi: her komut IF NOT EXISTS / IF EXISTS ya da duplicate_object yakalayan
-- bir DO bloğu içinde. Böylece dosya hem boş veritabanında hem `db push` ile
-- kurulmuş bir veritabanında hatasız çalışır.
--
-- Yıkıcı komut yok. Tek DROP bir yabancı anahtar KISITI (veri değil):
-- quotes_professional_id_fkey — şemada bu ilişki artık zorunlu değil.

-- CreateEnum
DO $do$ BEGIN
  CREATE TYPE "CalendarPermission" AS ENUM ('view_availability_only', 'create_requires_approval', 'manage_calendar');
EXCEPTION WHEN duplicate_object THEN NULL;
END $do$;

-- CreateEnum
DO $do$ BEGIN
  CREATE TYPE "BusinessEntityType" AS ENUM ('llp', 'ip', 'freelance', 'branch');
EXCEPTION WHEN duplicate_object THEN NULL;
END $do$;

-- CreateEnum
DO $do$ BEGIN
  CREATE TYPE "OfferStatus" AS ENUM ('draft', 'active', 'paused', 'expired', 'removed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $do$;

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "BookingStatus" ADD VALUE IF NOT EXISTS 'expired';
ALTER TYPE "BookingStatus" ADD VALUE IF NOT EXISTS 'completed_pending';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "BusinessStatus" ADD VALUE IF NOT EXISTS 'needs_docs';
ALTER TYPE "BusinessStatus" ADD VALUE IF NOT EXISTS 'under_review';

-- DropForeignKey
ALTER TABLE "quotes" DROP CONSTRAINT IF EXISTS "quotes_professional_id_fkey";

-- AlterTable
ALTER TABLE "ad_banners" ADD COLUMN IF NOT EXISTS "i18n" JSONB;

-- AlterTable
ALTER TABLE "announcements" ADD COLUMN IF NOT EXISTS "i18n" JSONB;

-- AlterTable
ALTER TABLE "blog_articles" ADD COLUMN IF NOT EXISTS "content_type" TEXT NOT NULL DEFAULT 'guide',
ADD COLUMN IF NOT EXISTS "i18n" JSONB;

-- AlterTable
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "by_salon" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "customer_phone" TEXT,
ADD COLUMN IF NOT EXISTS "finalize_deadline" TIMESTAMPTZ(6),
ADD COLUMN IF NOT EXISTS "offer_id" UUID,
ADD COLUMN IF NOT EXISTS "receipt_hash" TEXT,
ADD COLUMN IF NOT EXISTS "refund_receipt_hash" TEXT,
ADD COLUMN IF NOT EXISTS "responded_at" TIMESTAMPTZ(6),
ADD COLUMN IF NOT EXISTS "response_deadline" TIMESTAMPTZ(6),
ADD COLUMN IF NOT EXISTS "slot_key" TEXT;

-- AlterTable
ALTER TABLE "businesses" ADD COLUMN IF NOT EXISTS "address_verified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "bin" TEXT NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS "bin_verified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "business_verified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "doc_type" TEXT NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS "entity_type" "BusinessEntityType",
ADD COLUMN IF NOT EXISTS "founded_year" INTEGER,
ADD COLUMN IF NOT EXISTS "identity_verified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "lat" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "legal_name" TEXT NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS "lng" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "manager_name" TEXT NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS "oked" TEXT NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS "review_note" TEXT,
ADD COLUMN IF NOT EXISTS "social_instagram" TEXT NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS "social_tiktok" TEXT NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS "social_verified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "social_verify_code" TEXT NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS "vat_payer" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "women_only" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "campaigns" ADD COLUMN IF NOT EXISTS "i18n" JSONB;

-- AlterTable
ALTER TABLE "professionals" ADD COLUMN IF NOT EXISTS "city" TEXT NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS "closed_days_json" TEXT NOT NULL DEFAULT '[]',
ADD COLUMN IF NOT EXISTS "hours_json" TEXT NOT NULL DEFAULT '[]',
ADD COLUMN IF NOT EXISTS "lat" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "lng" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "portfolio" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS "promo_json" TEXT NOT NULL DEFAULT '[]',
ADD COLUMN IF NOT EXISTS "services_json" TEXT NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "quote_requests" ADD COLUMN IF NOT EXISTS "booking_id" TEXT,
ADD COLUMN IF NOT EXISTS "budget" DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS "city" TEXT NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS "collect_min" INTEGER NOT NULL DEFAULT 180,
ADD COLUMN IF NOT EXISTS "expires_at" TIMESTAMPTZ(6),
ADD COLUMN IF NOT EXISTS "mode" TEXT NOT NULL DEFAULT 'photo',
ADD COLUMN IF NOT EXISTS "notify_wave" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "preferred_slots_json" TEXT NOT NULL DEFAULT '[]',
ADD COLUMN IF NOT EXISTS "selected_quote_id" TEXT,
ADD COLUMN IF NOT EXISTS "service_id" TEXT,
ADD COLUMN IF NOT EXISTS "wave_at" TIMESTAMPTZ(6);

-- AlterTable
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "discount_percent" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "discount_reason" TEXT NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS "note" TEXT,
ADD COLUMN IF NOT EXISTS "slots_json" TEXT NOT NULL DEFAULT '[]',
ADD COLUMN IF NOT EXISTS "user_id" UUID,
ALTER COLUMN "professional_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "ratings" ADD COLUMN IF NOT EXISTS "dispute_reason" TEXT,
ADD COLUMN IF NOT EXISTS "disputed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "disputed_at" TIMESTAMPTZ(6),
ADD COLUMN IF NOT EXISTS "photos" JSONB;

-- AlterTable
ALTER TABLE "specialists" ADD COLUMN IF NOT EXISTS "calendar_permission" "CalendarPermission" NOT NULL DEFAULT 'create_requires_approval',
ADD COLUMN IF NOT EXISTS "cert_verified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "entity_type" TEXT NOT NULL DEFAULT 'freelance',
ADD COLUMN IF NOT EXISTS "iin" TEXT NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS "pro_id" TEXT,
ADD COLUMN IF NOT EXISTS "social_instagram" TEXT NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS "social_verified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "social_verify_code" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatar_url" TEXT,
ADD COLUMN IF NOT EXISTS "birth_date" TIMESTAMPTZ(6),
ADD COLUMN IF NOT EXISTS "cutout_url" TEXT,
ADD COLUMN IF NOT EXISTS "device_hash" TEXT,
ADD COLUMN IF NOT EXISTS "kyc_status" TEXT NOT NULL DEFAULT 'none',
ADD COLUMN IF NOT EXISTS "kyc_verified_at" TIMESTAMPTZ(6),
ADD COLUMN IF NOT EXISTS "membership_tier" TEXT NOT NULL DEFAULT 'free',
ADD COLUMN IF NOT EXISTS "membership_until" TIMESTAMPTZ(6),
ADD COLUMN IF NOT EXISTS "prefs_json" TEXT NOT NULL DEFAULT '{}',
ADD COLUMN IF NOT EXISTS "referral_code" TEXT,
ADD COLUMN IF NOT EXISTS "referred_by" UUID;

-- AlterTable
ALTER TABLE "weekly_themes" ADD COLUMN IF NOT EXISTS "i18n" JSONB;

-- CreateTable
CREATE TABLE IF NOT EXISTS "circle_follows" (
    "id" UUID NOT NULL,
    "follower_id" UUID NOT NULL,
    "target_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "circle_follows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "subscriptions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "user_name" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "receipt_uri" TEXT,
    "receipt_at" TIMESTAMPTZ(6),
    "period_start" TIMESTAMPTZ(6),
    "period_end" TIMESTAMPTZ(6),
    "reviewed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "profile_change_requests" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "user_name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "changes" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "profile_change_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "conversations" (
    "id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "pro_user_id" UUID NOT NULL,
    "booking_id" TEXT,
    "request_id" UUID,
    "last_message_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "messages" (
    "id" UUID NOT NULL,
    "conversation_id" UUID NOT NULL,
    "sender_id" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "moderation" TEXT NOT NULL DEFAULT 'ok',
    "read_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "payments" (
    "id" UUID NOT NULL,
    "booking_id" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "points_used" INTEGER NOT NULL DEFAULT 0,
    "cash_amount" DECIMAL(12,2) NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'kaspi',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "provider_ref" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paid_at" TIMESTAMPTZ(6),

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "push_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "platform" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "push_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "kyc_verifications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "doc_type" TEXT NOT NULL,
    "documents" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "note" TEXT NOT NULL DEFAULT '',
    "submitted_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_at" TIMESTAMPTZ(6),

    CONSTRAINT "kyc_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "trusted_contacts" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "relation" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trusted_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "safety_sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "booking_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "last_lat" DOUBLE PRECISION,
    "last_lng" DOUBLE PRECISION,
    "last_location_at" TIMESTAMPTZ(6),
    "sos_at" TIMESTAMPTZ(6),
    "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMPTZ(6),

    CONSTRAINT "safety_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "user_blocks" (
    "id" UUID NOT NULL,
    "blocker_id" UUID NOT NULL,
    "blocked_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "offers" (
    "id" UUID NOT NULL,
    "owner_type" TEXT NOT NULL,
    "owner_user_id" UUID NOT NULL,
    "pro_id" TEXT NOT NULL,
    "status" "OfferStatus" NOT NULL DEFAULT 'active',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "i18n" JSONB,
    "sector" TEXT NOT NULL DEFAULT 'hair',
    "discount_type" TEXT NOT NULL DEFAULT 'percent',
    "discount_value" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "base_price" DECIMAL(12,2) NOT NULL,
    "final_price" DECIMAL(12,2) NOT NULL,
    "valid_days" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "time_from" TEXT NOT NULL DEFAULT '',
    "time_to" TEXT NOT NULL DEFAULT '',
    "starts_at" TIMESTAMPTZ(6) NOT NULL,
    "ends_at" TIMESTAMPTZ(6) NOT NULL,
    "slot_quota" INTEGER,
    "used_count" INTEGER NOT NULL DEFAULT 0,
    "image_url" TEXT NOT NULL DEFAULT '',
    "city" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "collections" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT NOT NULL DEFAULT '',
    "i18n" JSONB,
    "occasion" TEXT NOT NULL DEFAULT 'custom',
    "hero_image" TEXT NOT NULL DEFAULT '',
    "tone" TEXT NOT NULL DEFAULT 'rose',
    "starts_at" TIMESTAMPTZ(6) NOT NULL,
    "ends_at" TIMESTAMPTZ(6) NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "items_json" TEXT NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "collections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "circle_follows_target_id_idx" ON "circle_follows"("target_id");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "circle_follows_follower_id_target_id_key" ON "circle_follows"("follower_id", "target_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "subscriptions_user_id_idx" ON "subscriptions"("user_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "subscriptions_status_idx" ON "subscriptions"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "profile_change_requests_user_id_idx" ON "profile_change_requests"("user_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "profile_change_requests_status_idx" ON "profile_change_requests"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "conversations_customer_id_idx" ON "conversations"("customer_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "conversations_pro_user_id_idx" ON "conversations"("pro_user_id");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "conversations_customer_id_pro_user_id_key" ON "conversations"("customer_id", "pro_user_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "messages_conversation_id_idx" ON "messages"("conversation_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "payments_user_id_idx" ON "payments"("user_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "payments_booking_id_idx" ON "payments"("booking_id");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "push_tokens_token_key" ON "push_tokens"("token");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "push_tokens_user_id_idx" ON "push_tokens"("user_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "kyc_verifications_user_id_idx" ON "kyc_verifications"("user_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "kyc_verifications_status_idx" ON "kyc_verifications"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "trusted_contacts_user_id_idx" ON "trusted_contacts"("user_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "safety_sessions_user_id_idx" ON "safety_sessions"("user_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "user_blocks_blocked_id_idx" ON "user_blocks"("blocked_id");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "user_blocks_blocker_id_blocked_id_key" ON "user_blocks"("blocker_id", "blocked_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "offers_status_ends_at_idx" ON "offers"("status", "ends_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "offers_owner_user_id_idx" ON "offers"("owner_user_id");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "collections_slug_key" ON "collections"("slug");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "collections_starts_at_ends_at_idx" ON "collections"("starts_at", "ends_at");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "bookings_slot_key_key" ON "bookings"("slot_key");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "bookings_receipt_hash_key" ON "bookings"("receipt_hash");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "bookings_refund_receipt_hash_key" ON "bookings"("refund_receipt_hash");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "businesses_bin_idx" ON "businesses"("bin");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "quote_requests_city_status_idx" ON "quote_requests"("city", "status");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "quotes_request_id_user_id_key" ON "quotes"("request_id", "user_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ratings_disputed_idx" ON "ratings"("disputed");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "users_referral_code_key" ON "users"("referral_code");

-- AddForeignKey
DO $do$ BEGIN
  ALTER TABLE "quotes" ADD CONSTRAINT "quotes_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "professionals"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $do$;

-- AddForeignKey
DO $do$ BEGIN
  ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $do$;

