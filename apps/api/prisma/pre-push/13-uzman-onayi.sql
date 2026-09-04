-- UZMAN ONAY KAPISI — mevcut kayıtlar ONAYLI başlıyor.
--
-- Yeni `status` kolonunun varsayılanı `pending`. Kolon eklendiğinde
-- CANLIDAKİ TÜM UZMANLAR bir anda "onay bekliyor" olur: katalogdan
-- düşerler, randevu alamazlar ve bunu kimse istemedi. Kurucunun isteği
-- BUNDAN SONRAKİ kayıtlar için bir kapı.
--
-- Bu yüzden kolon eklendiği anda var olan satırlar `approved` yapılıyor.
-- Guard'lı: kolon yoksa ya da zaten doldurulmuşsa hiçbir şey yapmıyor.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'specialists' AND column_name = 'status'
  ) THEN
    -- Yalnız BU GEÇİŞ anında var olanlar. `created_at` eşiği yok: kolon
    -- eklendikten sonra açılan kayıtlar zaten `pending` gelir ve bu blok
    -- bir daha çalıştığında onları da onaylamaması gerekir.
    UPDATE specialists
    SET status = 'approved'
    WHERE status = 'pending'
      AND created_at < (
        SELECT COALESCE(MAX(created_at), now()) FROM specialists WHERE status <> 'pending'
      );

    -- İlk çalıştırmada hiç onaylı satır yoksa yukarıdaki koşul kimseyi
    -- yakalamaz; o durumda geçiş anından ÖNCEKİ her şey onaylanıyor.
    IF NOT EXISTS (SELECT 1 FROM specialists WHERE status = 'approved') THEN
      UPDATE specialists SET status = 'approved';
    END IF;
  END IF;
END $$;
