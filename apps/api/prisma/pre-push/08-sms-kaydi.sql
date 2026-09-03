-- SMS gönderim kaydı.
--
-- Railway `prisma db push` çalıştırıyor, `migrate deploy` DEĞİL. 06 ve
-- 07'deki ders: KORUMALI CREATE TABLE tek başına yetmez, sonradan eklenen
-- her sütunun kendi ALTER'ı olmak zorunda. Tablo yeni olduğu için şimdilik
-- ALTER gerekmiyor; İLERİDE sütun eklenirse buraya kendi ALTER'ı yazılacak.
CREATE TABLE IF NOT EXISTS "sms_log" (
  "id"                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "phone_masked"        TEXT NOT NULL,
  "provider"            TEXT NOT NULL,
  "status"              TEXT NOT NULL DEFAULT 'QUEUED',
  "provider_message_id" TEXT,
  "segments"            INTEGER NOT NULL DEFAULT 0,
  "error_code"          INTEGER,
  "error"               TEXT,
  "created_at"          TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "sms_log_created_at_idx" ON "sms_log" ("created_at");
CREATE INDEX IF NOT EXISTS "sms_log_status_idx" ON "sms_log" ("status");
