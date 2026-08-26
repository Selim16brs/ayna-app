-- EK Z.1 — mesaj fotoğrafı.
-- Üretim `prisma db push` ile çalışır; bu dosya TEMİZ KURULUM içindir.
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "image_url" TEXT;
