-- BAŞKASININ FOTOĞRAFI — geriye dönük temizlik.
--
-- Admin onayında, fotoğraf yüklememiş işletmenin kartına stok bir Unsplash
-- salon fotoğrafı konuyordu. Müşteri, o işletmeye ait OLMAYAN bir mekânın
-- fotoğrafını onun mekânı sanıyordu. Kod tarafı düzeltildi ama MEVCUT
-- kayıtlarda fotoğraf duruyor; onu da silmek gerekiyor.
--
-- Guard: yalnız o TEK adres siliniyor. Kullanıcının kendi yüklediği bir
-- görsele (Unsplash'ten bile olsa) dokunulmuyor.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'professionals') THEN
    RETURN;
  END IF;

  UPDATE professionals
     SET image_url = ''
   WHERE image_url =
     'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=600&q=70';
END $$;
