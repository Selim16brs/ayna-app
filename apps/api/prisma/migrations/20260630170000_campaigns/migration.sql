-- §12: kampanya / promosyon
CREATE TABLE "campaigns" (
  "id" UUID NOT NULL,
  "title" TEXT NOT NULL,
  "subtitle" TEXT NOT NULL DEFAULT '',
  "badge" TEXT NOT NULL DEFAULT '',
  "category" TEXT,
  "image" TEXT NOT NULL,
  "tone" TEXT NOT NULL DEFAULT 'rose',
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "campaigns_active_sort_order_idx" ON "campaigns" ("active", "sort_order");
