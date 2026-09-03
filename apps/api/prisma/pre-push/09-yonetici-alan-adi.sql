-- Yönetici hesabı gerçek alan adına taşınıyor.
--
-- Kurucu: "bizim ayna.kz diye bir domainimiz yok. mail adresimiz
-- info@ayna.salon ve websitemiz www.ayna.salon."
--
-- `admin@ayna.kz` OLMAYAN bir alan adıydı. Giriş için sorun değildi (adres
-- yalnız kimlik olarak kullanılıyor) ama şifre sıfırlama ya da bildirim
-- gerektiğinde hiçbir yere ulaşmayacaktı.
--
-- SIRA ÖNEMLİ: pre-push `db push`tan ve uygulamadan ÖNCE çalışıyor. Kod
-- artık `admin@ayna.salon` arıyor; bu satır çalışmasaydı hesabı bulamaz ve
-- YENİ bir yönetici oluşturmaya çalışırdı (phone_hash çakışması).
--
-- KORUMALI: hedef adres zaten varsa dokunulmuyor — iki kaydı çakıştırmak
-- `email` tekil kısıtına takılır ve dağıtımı yarıda bırakırdı.
UPDATE "users"
SET "email" = 'admin@ayna.salon'
WHERE "email" = 'admin@ayna.kz'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE u2."email" = 'admin@ayna.salon');

-- Eski yedek yönetici hesabı da aynı sebeple taşınıyor.
UPDATE "users"
SET "email" = 'eski-admin@ayna.salon'
WHERE "email" = 'eski-admin@ayna.kz'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE u2."email" = 'eski-admin@ayna.salon');
