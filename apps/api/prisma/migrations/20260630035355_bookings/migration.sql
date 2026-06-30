-- CreateEnum
CREATE TYPE "BookingSource" AS ENUM ('direct', 'photo_quote', 'demand');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('confirmed', 'pending', 'completed', 'cancelled');

-- CreateTable
CREATE TABLE "bookings" (
    "id" TEXT NOT NULL,
    "source" "BookingSource" NOT NULL,
    "service" TEXT NOT NULL,
    "pro_id" TEXT,
    "pro_name" TEXT NOT NULL,
    "pro_image" TEXT NOT NULL,
    "uzman_name" TEXT,
    "date_label" TEXT NOT NULL,
    "in_days" INTEGER NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'confirmed',
    "reviewed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bookings_status_idx" ON "bookings"("status");
