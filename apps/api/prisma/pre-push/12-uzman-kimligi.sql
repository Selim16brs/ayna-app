-- RANDEVUYA UZMAN KİMLİĞİ — ad ile eşleştirme sona eriyor.
--
-- Randevu yalnız uzmanın ADINI tutuyordu. Kadro işlemleri o adla
-- eşleştiği için aynı salonda iki aynı adlı uzman birbirinin
-- randevularını etkiliyordu.
--
-- Kolon `db push` ile geliyor; buradaki iş GEÇMİŞİ DOLDURMAK: adı o
-- salonda TEK olan randevular güvenle kimliğe bağlanabilir. Adı birden
-- çok kişide geçenler BİLEREK boş bırakılıyor — yanlış kişiye bağlamak,
-- düzeltmeye çalıştığımız hatanın ta kendisi olurdu.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'uzman_id'
  ) THEN
    UPDATE bookings b
    SET uzman_id = t.specialist_id
    FROM (
      SELECT s.pro_id, u.name AS uzman_name, MIN(s.id::text) AS specialist_id
      FROM specialists s
      JOIN users u ON u.id = s.user_id
      WHERE s.pro_id IS NOT NULL
      GROUP BY s.pro_id, u.name
      HAVING COUNT(*) = 1
    ) t
    WHERE b.uzman_id IS NULL
      AND b.uzman_name IS NOT NULL
      AND b.uzman_name = t.uzman_name
      AND b.pro_id = t.pro_id;
  END IF;
END $$;
