-- Brief §4.4/§5 — depozitoda kullanılan puan randevuda saklanıyor.
-- Admin dekont kuyruğu beklenen nakit tutarı buradan hesaplıyor.
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "points_used" INTEGER NOT NULL DEFAULT 0;
