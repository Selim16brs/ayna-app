-- §4.6 — salon devretmesinde önceki uzmanın adı.
-- Üretim `prisma db push` ile çalışır; bu dosya TEMİZ KURULUM içindir.
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "reassigned_from" TEXT;
