-- Reklam vitrini: yayın bölümü + yayın penceresi.
--
-- Railway `prisma db push` çalıştırıyor, `migrate deploy` DEĞİL; bu yüzden
-- migrations/ klasörü üretimde hiç koşmuyor. Sütunlar burada, db push'tan
-- ÖNCE ve KORUMALI şekilde açılıyor.
--
-- Neden gerekli: reklam ücretli. Yalnız `active` bayrağı varken süresi biten
-- reklam, admin elle kapatana kadar yayında kalıyordu.
ALTER TABLE "ad_banners" ADD COLUMN IF NOT EXISTS "placement" TEXT NOT NULL DEFAULT 'one_cikanlar';
ALTER TABLE "ad_banners" ADD COLUMN IF NOT EXISTS "starts_at" TIMESTAMPTZ(6);
ALTER TABLE "ad_banners" ADD COLUMN IF NOT EXISTS "ends_at" TIMESTAMPTZ(6);
