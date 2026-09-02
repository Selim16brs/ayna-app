-- E-posta kaydı tablosu.
--
-- Railway `prisma db push` çalıştırıyor, `migrate deploy` DEĞİL; migrations/
-- üretimde hiç koşmuyor. Tablo burada, db push'tan ÖNCE ve KORUMALI açılıyor.
CREATE TABLE IF NOT EXISTS "email_log" (
  "id"                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"             UUID,
  "email"               TEXT NOT NULL,
  "template"            TEXT NOT NULL,
  "locale"              TEXT NOT NULL DEFAULT 'tr',
  "status"              TEXT NOT NULL DEFAULT 'QUEUED',
  "provider_message_id" TEXT,
  "error"               TEXT,
  "sent_at"             TIMESTAMPTZ(6),
  "created_at"          TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);

-- AYNI kullanıcıya AYNI şablon bir kez. Uygulama katmanında "önce oku sonra
-- yaz" yetmez: zamanlayıcının iki eşzamanlı koşusu ikisini de geçirebilir ve
-- kullanıcı aynı postayı iki kez alır. Kısıt veritabanında.
CREATE UNIQUE INDEX IF NOT EXISTS "email_log_user_template_key"
  ON "email_log" ("user_id", "template");

CREATE INDEX IF NOT EXISTS "email_log_email_idx"    ON "email_log" ("email");
CREATE INDEX IF NOT EXISTS "email_log_status_idx"   ON "email_log" ("status");
CREATE INDEX IF NOT EXISTS "email_log_template_idx" ON "email_log" ("template");
