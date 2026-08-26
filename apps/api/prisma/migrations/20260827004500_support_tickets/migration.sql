-- §destek — kullanıcı destek talepleri.
-- Üretim `prisma db push` ile çalışır; bu dosya TEMİZ KURULUM içindir.
CREATE TABLE IF NOT EXISTS "support_tickets" (
  "id"         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"    UUID NOT NULL,
  "topic"      TEXT NOT NULL DEFAULT 'other',
  "body"       TEXT NOT NULL,
  "status"     TEXT NOT NULL DEFAULT 'open',
  "reply"      TEXT,
  "replied_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "support_tickets_status_idx" ON "support_tickets" ("status");
CREATE INDEX IF NOT EXISTS "support_tickets_user_id_idx" ON "support_tickets" ("user_id");
