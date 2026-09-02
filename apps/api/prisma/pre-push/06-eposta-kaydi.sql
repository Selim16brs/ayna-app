-- E-posta kaydı tablosu.
--
-- Railway `prisma db push` çalıştırıyor, `migrate deploy` DEĞİL; migrations/
-- üretimde hiç koşmuyor. Tablo burada, db push'tan ÖNCE ve KORUMALI açılıyor.
CREATE TABLE IF NOT EXISTS "email_log" (
  "id"                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"             UUID,
  "email"               TEXT NOT NULL,
  "template"            TEXT NOT NULL,
  "dedupe_key"          TEXT NOT NULL,
  "locale"              TEXT NOT NULL DEFAULT 'tr',
  "status"              TEXT NOT NULL DEFAULT 'QUEUED',
  "provider_message_id" TEXT,
  "error"               TEXT,
  "sent_at"             TIMESTAMPTZ(6),
  "created_at"          TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);

-- Tekilleştirme ANAHTAR üzerinden: bir kez gidecekler düz şablon adı, olay
-- başına gidecekler "sablon:olayId". Yalnız şablona bakmak iki yönlü yanlıştı:
-- ikinci randevunun onayı susuyordu, teklif postası ise gevşetilse taşardı.
-- Kısıt veritabanında: uygulama katmanında "önce oku sonra yaz" iki eşzamanlı
-- koşuda ikisini de geçirir.
CREATE UNIQUE INDEX IF NOT EXISTS "email_log_user_dedupe_key"
  ON "email_log" ("user_id", "dedupe_key");

CREATE INDEX IF NOT EXISTS "email_log_email_idx"    ON "email_log" ("email");
CREATE INDEX IF NOT EXISTS "email_log_status_idx"   ON "email_log" ("status");
CREATE INDEX IF NOT EXISTS "email_log_template_idx" ON "email_log" ("template");
