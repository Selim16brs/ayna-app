-- İADE KAYDI HİÇ AÇILAMIYORDU — sütun tipi düzeltiliyor.
--
-- `refund_requests.booking_id` ve `reconciliations.booking_id` UUID tipindeydi
-- ama `bookings.id` DÜZ METİN: uygulama `bk-m2x8k9ab1`, sunucu `bk_q_1a2b3c4d`
-- üretiyor. Postgres "invalid UUID" diyor, kayıt hiç yazılamıyordu.
--
-- Görünen sonucu daha da kötüydü: koddaki `catch` her hatayı "Bu randevu için
-- iade talebi zaten açık" diye raporluyordu. Müşteri var olmayan bir talebi
-- bekliyor, depozitosunu hiç geri alamıyordu. Uzman gelmediğinde açılması
-- gereken telafi kaydı da aynı sebeple yazılamıyordu.
--
-- Uçtan uca canlı denemede bulundu (06.09.2026).
--
-- Guard: sütun ZATEN metin ise dokunulmuyor (idempotent).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_name = 'refund_requests' AND column_name = 'booking_id'
       AND data_type = 'uuid'
  ) THEN
    ALTER TABLE refund_requests ALTER COLUMN booking_id TYPE TEXT USING booking_id::text;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_name = 'reconciliations' AND column_name = 'booking_id'
       AND data_type = 'uuid'
  ) THEN
    ALTER TABLE reconciliations ALTER COLUMN booking_id TYPE TEXT USING booking_id::text;
  END IF;
END $$;
