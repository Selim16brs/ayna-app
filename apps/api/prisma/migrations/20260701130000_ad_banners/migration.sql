-- Reklam banner'ları — keşif ekranı sponsorlu şerit (admin yönetimli)
CREATE TABLE IF NOT EXISTS "ad_banners" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "pro_id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "subtitle" TEXT NOT NULL DEFAULT '',
  "image" TEXT NOT NULL,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ad_banners_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ad_banners_active_sort_order_idx" ON "ad_banners" ("active", "sort_order");
