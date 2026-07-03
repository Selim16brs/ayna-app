-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "BookingStatus" ADD VALUE 'deposit_pending';
ALTER TYPE "BookingStatus" ADD VALUE 'deposit_submitted';
ALTER TYPE "BookingStatus" ADD VALUE 'refund_pending';
ALTER TYPE "BookingStatus" ADD VALUE 'refund_submitted';
ALTER TYPE "BookingStatus" ADD VALUE 'disputed';
ALTER TYPE "BookingStatus" ADD VALUE 'reassigned_pending';

-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "deposit_amount" INTEGER,
ADD COLUMN     "deposit_deadline" TIMESTAMPTZ(6),
ADD COLUMN     "deposit_forfeited" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "deposit_receipt_uri" TEXT,
ADD COLUMN     "provider_no_show" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "refund_receipt_uri" TEXT;
