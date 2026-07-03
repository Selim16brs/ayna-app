-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "duration_min" INTEGER,
ADD COLUMN     "start_at" TIMESTAMPTZ(6);
