-- ÖDENEN TUTAR — müşterinin salonda ödediğini beyan ettiği gerçek tutar.
--
-- Kurucu (05.09.2026): "eğer kuaförde ilk rezervasyondaki fiyat değişmemişse
-- direkt ödeme yaptım basabilir, eğer değişiklik olduysa ona göre tutarı girer
-- ve ona göre ayna para kazanır."
--
-- `price` ÜZERİNE YAZILMIYOR: depozito onun %10'u olarak alındı ve admin
-- dekont kuyruğu ödenen depozitoyu o fiyatla karşılaştırıyor. Fiyatı
-- değiştirmek, geçmişte doğru ödenmiş dekontları "eksik" gösterirdi.
--
-- Railway `prisma db push` çalıştırıyor; bu dosya onun öncesinde idempotent
-- olarak koşuyor. IF NOT EXISTS: ikinci koşuda hiçbir şey yapmaz.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bookings') THEN
    RETURN;
  END IF;

  ALTER TABLE bookings ADD COLUMN IF NOT EXISTS final_price NUMERIC(12,2);
END $$;
