-- Çift-kör + eşikli puanlama (Build Brief §1.8)
CREATE TABLE "ratings" (
    "id" UUID NOT NULL,
    "booking_id" TEXT NOT NULL,
    "rater_role" TEXT NOT NULL,
    "subject_id" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "comment" TEXT NOT NULL DEFAULT '',
    "visible" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ratings_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ratings_subject_id_visible_idx" ON "ratings"("subject_id", "visible");
CREATE INDEX "ratings_booking_id_idx" ON "ratings"("booking_id");

CREATE TABLE "settings" (
    "key" TEXT NOT NULL,
    "int_value" INTEGER NOT NULL,
    CONSTRAINT "settings_pkey" PRIMARY KEY ("key")
);
