-- Reklam siparişi tablosu (ücretli vitrin satın alma kaydı).
--
-- Railway `prisma db push` çalıştırıyor, `migrate deploy` DEĞİL; migrations/
-- üretimde hiç koşmuyor. Tablo burada, db push'tan ÖNCE ve KORUMALI açılıyor.
CREATE TABLE IF NOT EXISTS "ad_orders" (
  "id"           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"      UUID NOT NULL,
  "pro_id"       TEXT NOT NULL,
  "pro_name"     TEXT NOT NULL,
  "placement"    TEXT NOT NULL,
  "months"       INTEGER NOT NULL DEFAULT 1,
  "amount"       DECIMAL(12,2) NOT NULL,
  "title"        TEXT NOT NULL,
  "subtitle"     TEXT NOT NULL DEFAULT '',
  "image"        TEXT NOT NULL,
  "status"       TEXT NOT NULL DEFAULT 'bekliyor',
  "receipt_uri"  TEXT,
  "receipt_at"   TIMESTAMPTZ(6),
  "receipt_hash" TEXT,
  "banner_id"    UUID,
  "period_start" TIMESTAMPTZ(6),
  "period_end"   TIMESTAMPTZ(6),
  "reviewed_at"  TIMESTAMPTZ(6),
  "created_at"   TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);
-- Aynı dekontu iki siparişte kullanmayı ENGELLE (depozitodaki kuralın aynısı).
CREATE UNIQUE INDEX IF NOT EXISTS "ad_orders_receipt_hash_key" ON "ad_orders"("receipt_hash");
CREATE INDEX IF NOT EXISTS "ad_orders_status_created_at_idx" ON "ad_orders"("status","created_at");
CREATE INDEX IF NOT EXISTS "ad_orders_user_id_idx" ON "ad_orders"("user_id");
