-- Uzman takvimi: müsaitlik + bloklar (Build Brief §1.5 / §2.2 / §3.6)
CREATE TYPE "BlockKind" AS ENUM ('offline', 'booking');

CREATE TABLE "specialist_availability" (
    "specialist_id" UUID NOT NULL,
    "weekly_hours" JSONB NOT NULL,
    "slot_minutes" INTEGER NOT NULL DEFAULT 60,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "specialist_availability_pkey" PRIMARY KEY ("specialist_id")
);

CREATE TABLE "specialist_blocks" (
    "id" UUID NOT NULL,
    "specialist_id" UUID NOT NULL,
    "start_at" TIMESTAMPTZ(6) NOT NULL,
    "end_at" TIMESTAMPTZ(6) NOT NULL,
    "kind" "BlockKind" NOT NULL DEFAULT 'offline',
    "label" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "specialist_blocks_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "specialist_blocks_specialist_id_start_at_idx" ON "specialist_blocks"("specialist_id", "start_at");
