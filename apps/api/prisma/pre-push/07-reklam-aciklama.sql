-- Reklam açıklaması.
--
-- Railway `prisma db push` çalıştırıyor, `migrate deploy` DEĞİL. 06'daki
-- dersin aynısı: KORUMALI CREATE TABLE tek başına yetmiyor, sonradan
-- eklenen her sütunun kendi ALTER'ı olmak zorunda.
ALTER TABLE "ad_orders" ADD COLUMN IF NOT EXISTS "description" TEXT NOT NULL DEFAULT '';

-- ── BOZUK KAYIT ONARIMI ─────────────────────────────────────────────────
--
-- `pro_id` alanına UZMAN kimliği değil KULLANICI kimliği yazılmış (istemci
-- `currentUser.id` gönderiyordu, sunucu doğrulamadan kaydediyordu).
-- Sonuç: ana sayfadaki "Senin İçin Seçtiklerimiz" kartına dokununca
-- olmayan bir uzmana gidiliyor ve ekran sonsuza kadar "Yükleniyor"da
-- kalıyordu.
--
-- Sunucu artık kimliği kendi türetiyor; burada GEÇMİŞ kayıtlar onarılıyor.
-- Uzman kaydı Specialist ya da Business üzerinden bulunuyor; bulunamayan
-- kayıt DOKUNULMADAN bırakılıyor (yanlış uzmana bağlamaktansa öyle kalsın).
UPDATE "ad_orders" a
SET "pro_id" = s."pro_id"::text
FROM "specialists" s
-- `ad_orders.pro_id` TEXT, kimlik sütunları UUID — açık dönüşüm şart.
WHERE s."user_id"::text = a."pro_id"
  AND s."pro_id" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "professionals" p WHERE p."id"::text = a."pro_id");

UPDATE "ad_orders" a
SET "pro_id" = b."professional_id"::text
FROM "businesses" b
WHERE b."owner_user_id"::text = a."pro_id"
  AND b."professional_id" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "professionals" p WHERE p."id"::text = a."pro_id");

-- Yayınlanan banner da açıklamayı taşımalı: kart tıklanınca açılan sayfa
-- onu gösteriyor.
ALTER TABLE "ad_banners" ADD COLUMN IF NOT EXISTS "description" TEXT NOT NULL DEFAULT '';
