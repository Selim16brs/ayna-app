-- DropIndex
DROP INDEX "bookings_user_id_idx";

-- AlterTable
ALTER TABLE "ad_banners" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "commission_payouts" ALTER COLUMN "id" DROP DEFAULT;

-- CreateTable
CREATE TABLE "blog_articles" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "category_code" TEXT,
    "read_min" INTEGER NOT NULL DEFAULT 3,
    "image" TEXT NOT NULL DEFAULT '',
    "excerpt" TEXT NOT NULL,
    "body" TEXT[],
    "published" BOOLEAN NOT NULL DEFAULT false,
    "published_at" TIMESTAMPTZ(6),
    "application_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "blog_articles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blog_applications" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "author_name" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "excerpt" TEXT NOT NULL DEFAULT '',
    "body" TEXT[],
    "tag" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "points" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_at" TIMESTAMPTZ(6),

    CONSTRAINT "blog_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weekly_themes" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "week_start" TIMESTAMPTZ(6) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "weekly_themes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "blog_articles_application_id_key" ON "blog_articles"("application_id");

-- CreateIndex
CREATE INDEX "blog_articles_published_idx" ON "blog_articles"("published");

-- CreateIndex
CREATE INDEX "blog_applications_status_idx" ON "blog_applications"("status");
