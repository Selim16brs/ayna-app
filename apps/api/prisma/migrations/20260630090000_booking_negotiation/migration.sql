-- Randevu onay/alternatif pazarlık döngüsü (Build Brief §1.6)
ALTER TYPE "BookingStatus" ADD VALUE IF NOT EXISTS 'awaiting_provider';
ALTER TYPE "BookingStatus" ADD VALUE IF NOT EXISTS 'alternative_proposed';
ALTER TABLE "bookings" ADD COLUMN "proposed_date_label" TEXT;
