-- Business → Professional köprüsü (salon panelinde randevu/yorum kapsamı)
ALTER TABLE "businesses" ADD COLUMN IF NOT EXISTS "professional_id" TEXT;
