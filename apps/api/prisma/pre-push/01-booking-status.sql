-- DAĞITIM ÖNCESİ: randevu durumu sözlüğünün eskiden yeniye taşınması.
--
-- NEDEN BURADA, migrations/ ALTINDA DEĞİL: üretim `prisma migrate deploy`
-- değil `prisma db push` çalıştırıyor (Dockerfile). `db push` migration
-- dosyalarını HİÇ okumaz — enum'u kendi başına değiştirmeye kalkar ve eski
-- değerli satırlarda ya çuvallar (API açılmaz) ya da `--accept-data-loss` ile
-- kolonu düşürür (her randevunun durumu gider). Bu dosya `db push`tan ÖNCE
-- çalışıp eşlemeyi elle yapıyor; sonra `db push` şemayı zaten uyumlu buluyor.
--
-- İKİ KEZ ÇALIŞMAYA DAYANIKLI: her koşul önce kontrol edilir, ikinci
-- çalıştırmada hiçbir şey yapmaz. Her açılışta çalışacağı için şart.

DO $$
BEGIN
  -- Tablo henüz yoksa (ilk kurulum) yapılacak bir şey yok: `db push` sıfırdan
  -- doğru şemayı kuracak.
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bookings') THEN
    RETURN;
  END IF;

  -- Eski sözlük yürürlükte mi? 'confirmed' eski makinenin imzası; yoksa geçiş
  -- zaten yapılmış demektir.
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE t.typname = 'BookingStatus' AND e.enumlabel = 'confirmed'
  ) THEN
    RETURN;
  END IF;

  CREATE TYPE "BookingStatus_yeni" AS ENUM (
    'taslak', 'onay_bekliyor', 'degisiklik_onerildi', 'karsi_oneri',
    'depozito_bekliyor', 'kesinlesti', 'erteleme_onerildi', 'hizmet_gunu',
    'odeme_bekliyor', 'tamamlandi', 'degerlendirme', 'kapandi',
    'iptal_musteri', 'iptal_uzman', 'otomatik_dustu',
    'no_show_musteri', 'no_show_uzman', 'uyusmazlik'
  );

  ALTER TABLE "bookings" ALTER COLUMN "status" DROP DEFAULT;
  ALTER TABLE "bookings" ALTER COLUMN "status" TYPE "BookingStatus_yeni"
    USING (CASE "status"::text
      WHEN 'pending'              THEN 'onay_bekliyor'
      WHEN 'awaiting_provider'    THEN 'onay_bekliyor'
      WHEN 'alternative_proposed' THEN 'degisiklik_onerildi'
      WHEN 'deposit_pending'      THEN 'depozito_bekliyor'
      WHEN 'deposit_submitted'    THEN 'kesinlesti'
      WHEN 'confirmed'            THEN 'kesinlesti'
      WHEN 'completed_pending'    THEN 'odeme_bekliyor'
      WHEN 'balance_pending'      THEN 'odeme_bekliyor'
      WHEN 'balance_submitted'    THEN 'odeme_bekliyor'
      WHEN 'completed'            THEN 'tamamlandi'
      WHEN 'no_show'              THEN 'no_show_musteri'
      WHEN 'disputed'             THEN 'uyusmazlik'
      WHEN 'expired'              THEN 'otomatik_dustu'
      WHEN 'cancelled'            THEN 'iptal_musteri'
      -- Brief'te karşılığı olmayanlar kapanmış sayılıyor.
      WHEN 'waitlist'             THEN 'otomatik_dustu'
      WHEN 'refund_pending'       THEN 'iptal_musteri'
      WHEN 'refund_submitted'     THEN 'iptal_musteri'
      WHEN 'reassigned_pending'   THEN 'iptal_musteri'
      ELSE 'onay_bekliyor'
    END)::"BookingStatus_yeni";

  DROP TYPE "BookingStatus";
  ALTER TYPE "BookingStatus_yeni" RENAME TO "BookingStatus";
  ALTER TABLE "bookings" ALTER COLUMN "status" SET DEFAULT 'onay_bekliyor';

  RAISE NOTICE 'randevu durumları brief §3 sözlüğüne taşındı';
END $$;
