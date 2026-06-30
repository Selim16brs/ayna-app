-- AI (§13.5): premium + ortak aylık kota sayacı
ALTER TABLE "users" ADD COLUMN "is_premium" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN "ai_used" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "users" ADD COLUMN "ai_period" TEXT NOT NULL DEFAULT '';
