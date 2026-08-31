-- Brief §4.1.1 — bir randevuda birden fazla hizmet seçilebilir.
-- Dökümü saklıyoruz; `price` ve `duration_min` toplamı taşımaya devam ediyor.
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "services_json" JSONB;
