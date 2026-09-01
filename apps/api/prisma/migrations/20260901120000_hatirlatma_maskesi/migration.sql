-- Brief §4.5 — bekleme dönemi hatırlatmalarının bit maskesi.
-- Zamanlayıcı 5 dakikada bir döndüğü için hangi hatırlatmanın gittiği
-- saklanmazsa aynı push her turda tekrar gider.
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "gun_hatirlatmalari" INTEGER NOT NULL DEFAULT 0;
