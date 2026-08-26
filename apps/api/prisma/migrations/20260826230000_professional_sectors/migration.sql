-- §5.1.4 — uzmanın hizmet verdiği TÜM alanlar.
--
-- Tek `sector` sütunu çok alanlı uzmanı gizliyordu: saç + tırnak yapan biri
-- yalnız saç aramasında çıkıyordu. Alan seti hizmet listesinden türetilir.
--
-- Üretim `prisma db push` ile çalıştığı için bu dosya TEMİZ VERİTABANI
-- kurulumu içindir; ikisinin şeması ayrışmasın diye ekleniyor.
ALTER TABLE "professionals" ADD COLUMN IF NOT EXISTS "sectors" TEXT[] NOT NULL DEFAULT '{}';

-- Mevcut kayıtlar keşiften kaybolmasın: ana alanlarıyla doldurulur.
UPDATE "professionals" SET "sectors" = ARRAY["sector"] WHERE cardinality("sectors") = 0;
