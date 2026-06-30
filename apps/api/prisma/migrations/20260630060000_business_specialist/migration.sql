-- İşletme & uzman kaydı (Build Brief §3)
CREATE TYPE "BusinessStatus" AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE "SpecialistKind" AS ENUM ('salon_bound', 'independent');
CREATE TYPE "InviteCodeStatus" AS ENUM ('active', 'used', 'revoked');

CREATE TABLE "businesses" (
    "id" UUID NOT NULL,
    "owner_user_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "owner_name" TEXT NOT NULL DEFAULT '',
    "sector" TEXT NOT NULL DEFAULT '',
    "about" TEXT NOT NULL DEFAULT '',
    "city" TEXT NOT NULL DEFAULT '',
    "district" TEXT NOT NULL DEFAULT '',
    "address" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "working_hours" TEXT NOT NULL DEFAULT '',
    "tax_id" TEXT NOT NULL DEFAULT '',
    "categories" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "photos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "doc_url" TEXT,
    "status" "BusinessStatus" NOT NULL DEFAULT 'pending',
    "reject_reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "businesses_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "businesses_status_idx" ON "businesses"("status");
CREATE INDEX "businesses_owner_user_id_idx" ON "businesses"("owner_user_id");

CREATE TABLE "specialists" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "business_id" UUID,
    "kind" "SpecialistKind" NOT NULL DEFAULT 'independent',
    "bio" TEXT NOT NULL DEFAULT '',
    "certificates" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "specialists_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "specialists_user_id_key" ON "specialists"("user_id");
CREATE INDEX "specialists_business_id_idx" ON "specialists"("business_id");

CREATE TABLE "business_invite_codes" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "status" "InviteCodeStatus" NOT NULL DEFAULT 'active',
    "used_by_user_id" UUID,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "business_invite_codes_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "business_invite_codes_code_key" ON "business_invite_codes"("code");
CREATE INDEX "business_invite_codes_business_id_idx" ON "business_invite_codes"("business_id");
