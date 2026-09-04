-- HER UZMANIN KEŞİF KARTI — salona bağlı olanlar için geriye dönük.
--
-- Kart yalnız BAĞIMSIZ uzmana açılıyordu; salona bağlananın `pro_id`si
-- null kalıyordu. Sonucu zincirleme: hizmetleri hiçbir yere yazılmıyor
-- (uçtaki `setMyServices` sessizce boş dönüyordu), profili açılmıyor,
-- haritada görünmüyor, yorumları ve başarı yüzdesi bağlanamıyordu.
--
-- Bu blok MEVCUT kartsız uzmanlara kart açıyor. Yeni kayıtlar zaten
-- uygulama tarafından açılıyor; burası yalnız geçmiş için ve guard'lı:
-- kartı olan uzmana dokunmuyor.
DO $$
DECLARE
  r RECORD;
  yeni_id text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'specialists') THEN
    RETURN;
  END IF;

  FOR r IN
    SELECT s.id AS sp_id, s.user_id, s.bio, u.name, u.city
    FROM specialists s
    JOIN users u ON u.id = s.user_id
    WHERE s.pro_id IS NULL
  LOOP
    yeni_id := gen_random_uuid()::text;
    INSERT INTO professionals (
      id, name, specialty, sector, sectors, kind, city, district,
      about, rating, review_count, experience_years, price_from,
      image_url, portfolio, promo_json, services_json, hours_json,
      closed_days_json, badge, created_at
    ) VALUES (
      yeni_id::uuid,
      COALESCE(NULLIF(r.name, ''), 'Uzman'),
      COALESCE(NULLIF(LEFT(r.bio, 60), ''), COALESCE(NULLIF(r.name, ''), 'Uzman')),
      'hair', ARRAY['hair'], 'independent',
      COALESCE(r.city, ''), COALESCE(r.city, ''),
      '', 0, 0, 0, 0,
      '', ARRAY[]::text[], '[]', '[]', '[]',
      '[]', 'verified', now()
    );
    UPDATE specialists SET pro_id = yeni_id WHERE id = r.sp_id;
  END LOOP;
END $$;
