-- Brief §4.6 — erteleme artık tek taraflı değil, karşı tarafa Kabul/Red önerisi.
-- Öneren kendi önerisini onaylayamasın diye öneren taraf saklanıyor.
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "proposed_by" TEXT;
