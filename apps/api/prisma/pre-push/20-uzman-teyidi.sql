-- UZMANIN "ÖDEMEYİ ALDIM" TEYİDİ — ayrı damga.
--
-- Kurucu (05.09.2026): "uzman tarafında ödemeyi yaptım değil ödemeyi aldım
-- yazmalı." El sıkışma iki taraflı ve SIRA ÖNEMSİZ: kim önce basarsa bassın,
-- randevu ancak iki damga da varken kapanıyor.
--
-- Eskiden uzmanın teyidi ayrı bir alan değil, doğrudan tamamlanma geçişiydi.
-- O yüzden uzman önce basarsa beyanı olmayan randevu kapanıyor ve müşteri
-- puanını hiç alamıyordu.
--
-- Railway `prisma db push` çalıştırıyor; bu dosya onun öncesinde idempotent
-- olarak koşuyor.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bookings') THEN
    RETURN;
  END IF;

  ALTER TABLE bookings ADD COLUMN IF NOT EXISTS balance_received_at TIMESTAMPTZ(6);

  -- GEÇMİŞ KAYITLAR: tamamlanmış randevularda uzman teyidi ZATEN verilmişti
  -- (tamamlanma o teyitle oluyordu). Damgayı tamamlanma anıyla dolduruyoruz,
  -- yoksa panel bu randevularda "uzman aldı ○" gösterirdi.
  UPDATE bookings
     SET balance_received_at = completed_at
   WHERE status = 'tamamlandi'
     AND completed_at IS NOT NULL
     AND balance_received_at IS NULL;
END $$;
