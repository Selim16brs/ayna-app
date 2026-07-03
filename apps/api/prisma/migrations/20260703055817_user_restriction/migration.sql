-- AlterTable
ALTER TABLE "users" ADD COLUMN     "restrict_reason" TEXT,
ADD COLUMN     "restricted_at" TIMESTAMPTZ(6);
