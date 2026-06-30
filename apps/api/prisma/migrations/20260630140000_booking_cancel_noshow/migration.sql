-- §6.C: iptal sebebi + no-show durumu
ALTER TYPE "BookingStatus" ADD VALUE IF NOT EXISTS 'no_show';
ALTER TABLE "bookings" ADD COLUMN "cancel_reason" TEXT;
