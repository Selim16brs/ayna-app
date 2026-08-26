-- §7.3 — uzmanın müşteri hakkındaki GİZLİ sinyali.
-- Üretim `prisma db push` ile çalışır; bu dosya TEMİZ KURULUM içindir.
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "provider_signal" TEXT;
