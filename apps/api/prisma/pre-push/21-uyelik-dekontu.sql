-- ÜYELİK DEKONTU TEKİL — aynı dekont ikinci kez kullanılamaz.
--
-- Randevu depozitosunda bu koruma vardı (`bookings.receipt_hash` benzersiz),
-- üyelikte yoktu: kullanıcı geçen ayın Kaspi dekontunu her ay yeniden
-- yükleyebiliyor, yönetici geçerli görünen dekontu onaylıyordu.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'subscriptions') THEN
    RETURN;
  END IF;

  ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS receipt_hash TEXT;

  -- Benzersizlik: mevcut kayıtlarda hash yok (hepsi NULL) ve Postgres
  -- NULL'ları birbirinden farklı sayıyor — geçmiş veriyi bozmadan eklenir.
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
     WHERE tablename = 'subscriptions' AND indexname = 'subscriptions_receipt_hash_key'
  ) THEN
    CREATE UNIQUE INDEX subscriptions_receipt_hash_key ON subscriptions (receipt_hash);
  END IF;
END $$;
