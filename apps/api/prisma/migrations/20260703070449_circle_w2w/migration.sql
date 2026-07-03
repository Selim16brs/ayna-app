-- CreateTable
CREATE TABLE "circle_posts" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "category" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "anonymous" BOOLEAN NOT NULL DEFAULT false,
    "author_label" TEXT NOT NULL DEFAULT 'AYNA Üyesi',
    "helpful" INTEGER NOT NULL DEFAULT 0,
    "reports" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'published',
    "moderation_reason" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "circle_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "circle_comments" (
    "id" UUID NOT NULL,
    "post_id" UUID NOT NULL,
    "user_id" UUID,
    "author_label" TEXT NOT NULL DEFAULT 'AYNA Üyesi',
    "text" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "circle_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "circle_reports" (
    "id" UUID NOT NULL,
    "post_id" UUID NOT NULL,
    "user_id" UUID,
    "reason" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "circle_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "circle_posts_status_idx" ON "circle_posts"("status");

-- CreateIndex
CREATE INDEX "circle_comments_post_id_idx" ON "circle_comments"("post_id");

-- CreateIndex
CREATE INDEX "circle_reports_post_id_idx" ON "circle_reports"("post_id");
