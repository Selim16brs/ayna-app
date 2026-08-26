-- D9 / §8.2 — REFERANS ÖDÜLÜ İLK TAMAMLANMIŞ RANDEVUYA BAĞLANDI
--
-- Ödül eskiden davet kodu girildiği ANDA veriliyordu. Bu sahte davet
-- ekonomisine açıktı: kayıt olup kodu girmek 300 puan kazanmaya yetiyordu,
-- platformda hiçbir şey yapmaya gerek yoktu.
--
-- KRİTİK: kuralın öncesinde kod kullanmış hesaplar ZATEN ÖDENDİ. Damga
-- atılmasaydı, o kullanıcılar ilk randevularını tamamladığında ödül İKİNCİ
-- kez yazılacaktı. Bu yüzden `referred_by` dolu olan her hesap burada
-- damgalanıyor — geçmiş ödemeler geri alınmıyor, yalnız tekrarı engelleniyor.
--
-- Yıkıcı değil: bir nullable kolon + geriye dönük doldurma.

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "referral_rewarded_at" TIMESTAMPTZ(6);

UPDATE "users"
   SET "referral_rewarded_at" = COALESCE("updated_at", now())
 WHERE "referred_by" IS NOT NULL
   AND "referral_rewarded_at" IS NULL;
