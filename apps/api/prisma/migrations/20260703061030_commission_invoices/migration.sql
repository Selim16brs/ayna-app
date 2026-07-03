-- CreateTable
CREATE TABLE "commission_invoices" (
    "id" UUID NOT NULL,
    "pro_id" TEXT NOT NULL,
    "pro_name" TEXT NOT NULL,
    "owner_user_id" UUID,
    "period_start" TIMESTAMPTZ(6) NOT NULL,
    "period_end" TIMESTAMPTZ(6) NOT NULL,
    "bookings_count" INTEGER NOT NULL DEFAULT 0,
    "gross_revenue" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "commission_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "due_date" TIMESTAMPTZ(6) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "receipt_uri" TEXT,
    "receipt_at" TIMESTAMPTZ(6),
    "collected_at" TIMESTAMPTZ(6),
    "restricted_applied" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "commission_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "commission_invoices_pro_id_idx" ON "commission_invoices"("pro_id");

-- CreateIndex
CREATE INDEX "commission_invoices_status_idx" ON "commission_invoices"("status");

-- CreateIndex
CREATE INDEX "commission_invoices_owner_user_id_idx" ON "commission_invoices"("owner_user_id");
