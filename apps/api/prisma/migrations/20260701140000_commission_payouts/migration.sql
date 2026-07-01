-- Komisyon tahsilat defteri (append-only ledger)
CREATE TABLE IF NOT EXISTS "commission_payouts" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "pro_id" TEXT NOT NULL,
  "pro_name" TEXT NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "note" TEXT NOT NULL DEFAULT '',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "commission_payouts_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "commission_payouts_pro_id_idx" ON "commission_payouts" ("pro_id");
