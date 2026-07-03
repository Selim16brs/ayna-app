-- CreateTable
CREATE TABLE "disputes" (
    "id" UUID NOT NULL,
    "booking_ref" TEXT NOT NULL,
    "user_id" UUID,
    "pro_name" TEXT NOT NULL,
    "service" TEXT NOT NULL DEFAULT '',
    "kind" TEXT NOT NULL DEFAULT 'deposit',
    "amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "receipt_uri" TEXT,
    "note" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'open',
    "resolution" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMPTZ(6),

    CONSTRAINT "disputes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "disputes_status_idx" ON "disputes"("status");
