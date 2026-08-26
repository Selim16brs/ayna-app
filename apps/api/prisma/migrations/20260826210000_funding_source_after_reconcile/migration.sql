-- payments.funding_source — TEMİZ VERİTABANI DÜZELTMESİ
--
-- PR #20 bu kolonu `ALTER TABLE IF EXISTS "payments"` ile eklemişti. O
-- migration, uzlaştırma migration'ından (20260826120000) ÖNCE çalışıyor ve o
-- anda temiz bir veritabanında `payments` tablosu henüz YOK — dolayısıyla
-- IF EXISTS sessizce atlıyor, kolon hiç oluşmuyordu.
--
-- Üretimde sorun görünmüyordu çünkü orada tablo `db push` ile zaten vardı.
-- Ama temiz kurulumda (CI, yeni geliştirici, test) şema ile veritabanı
-- ayrışıyordu: Prisma istemcisi kolonu bekliyor, tablo taşımıyor.
--
-- Yıkıcı değil ve idempotent: kolon varsa dokunulmaz.
ALTER TABLE "payments"
  ADD COLUMN IF NOT EXISTS "funding_source" TEXT NOT NULL DEFAULT 'AYNA_COMMISSION';
