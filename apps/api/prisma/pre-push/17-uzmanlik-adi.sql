-- UZMANLIK ALANI OLARAK KENDİ ADI — geriye dönük temizlik.
--
-- Kayıt akışı, biyografi yazmamış uzmanın `specialty` alanına ADINI
-- yazıyordu. Canlıda görülen: "Darina Serbu" adlı uzmanın uzmanlık alanı da
-- "Darina Serbu" — kartta ad iki kez, üstelik biri uzmanlık diye.
--
-- Kod tarafı düzeltildi ama MEVCUT kayıtlarda ad duruyor.
--
-- Guard: yalnız `specialty` ile `name` BİREBİR aynıysa siliniyor. Adını
-- gerçekten uzmanlık olarak yazmış (ör. marka adı) bir kayda dokunulmuyor —
-- öyle bir kayıt varsa da zaten aynı bilgiyi iki kez göstermek istemeyiz,
-- ama karar kullanıcınındır: boş kalan alanı kendi doldurabilir.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'professionals') THEN
    RETURN;
  END IF;

  UPDATE professionals
     SET specialty = ''
   WHERE specialty = name;
END $$;
