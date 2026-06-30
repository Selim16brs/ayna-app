-- Sadakat defteri (append-only; bakiye toplamdan türetilir)
CREATE TYPE "LoyaltyKind" AS ENUM ('earn', 'spend');

CREATE TABLE "loyalty_entries" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "kind" "LoyaltyKind" NOT NULL,
    "reason" TEXT NOT NULL,
    "detail" TEXT NOT NULL DEFAULT '',
    "points" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "loyalty_entries_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "loyalty_entries_user_id_idx" ON "loyalty_entries"("user_id");
