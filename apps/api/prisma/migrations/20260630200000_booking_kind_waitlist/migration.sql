-- Faz 3: grup/express randevu + bekleme listesi
ALTER TYPE "BookingStatus" ADD VALUE IF NOT EXISTS 'waitlist';
ALTER TABLE "bookings" ADD COLUMN "booking_kind" TEXT NOT NULL DEFAULT 'normal';
ALTER TABLE "bookings" ADD COLUMN "group_size" INTEGER;
