-- CreateEnum
CREATE TYPE "ProviderKind" AS ENUM ('salon', 'independent');

-- AlterTable
ALTER TABLE "professionals" ADD COLUMN     "kind" "ProviderKind" NOT NULL DEFAULT 'salon',
ADD COLUMN     "sector" TEXT NOT NULL DEFAULT 'hair';
