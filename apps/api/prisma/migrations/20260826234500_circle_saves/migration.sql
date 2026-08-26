-- §14 — W2W kaydetme (kanvas "Kaydedilenler" sekmesi).
--
-- Üretim `prisma db push` ile çalıştığı için bu dosya TEMİZ VERİTABANI
-- kurulumu içindir; ikisinin şeması ayrışmasın diye ekleniyor.
CREATE TABLE IF NOT EXISTS "circle_saves" (
  "id"         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"    UUID NOT NULL,
  "post_id"    UUID NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);

-- Aynı gönderi iki kez kaydedilemez: idempotent yazım tekilliğe DAYANIR,
-- uygulama tarafındaki "önce oku sonra yaz" yarışa açıktır.
CREATE UNIQUE INDEX IF NOT EXISTS "circle_saves_user_id_post_id_key"
  ON "circle_saves" ("user_id", "post_id");
CREATE INDEX IF NOT EXISTS "circle_saves_user_id_idx" ON "circle_saves" ("user_id");
