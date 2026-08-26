-- K4.2 — para puan KULLANIM KİLİDİ damgası.
--
-- Bakiye ilk kez eşiği (varsayılan 50.000 ₸) geçtiğinde yazılır ve bir daha
-- kapanmaz. NULL = kilit henüz açılmadı; mevcut tüm kullanıcılar bu durumda
-- başlar ve eşiği geçtikleri ilk özet okumasında damgalanır.
--
-- Yıkıcı değil: yalnız yeni bir nullable kolon.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "points_unlocked_at" TIMESTAMPTZ(6);
