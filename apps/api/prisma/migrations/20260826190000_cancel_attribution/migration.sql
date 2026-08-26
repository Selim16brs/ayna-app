-- §3 — İPTALİ KİM YAPTI
--
-- Şartname ayrı `CUSTOMER_CANCELLED` / `PROVIDER_CANCELLED` durumları istiyor.
-- Burada tek `cancelled` durumu korunup iki alan ekleniyor. Sonuç aynı — iptal
-- politikası (kapora kime kalır) artık kayıttan OKUNABİLİYOR — ama mevcut durum
-- makinesi, mobil ekranlar ve geçmiş kayıtlar bozulmuyor.
--
-- Eskiden bu bilgi hiçbir yerde yoktu: kimin iptal ettiği ne durumdan ne de bir
-- alandan türetilebiliyordu; yalnız `deposit_forfeited` bayrağından dolaylı
-- tahmin edilebiliyordu.
--
-- GEÇMİŞ KAYITLAR: `cancelled_by` bilinçli olarak NULL bırakılıyor. Kimin iptal
-- ettiği gerçekten bilinmiyor; uydurmak, kapora anlaşmazlıklarında yanlış
-- kanıt üretirdi. NULL = "kayıt tutulmadan önce iptal edilmiş".
--
-- Yıkıcı değil: iki nullable kolon.
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "cancelled_by" TEXT;
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "cancelled_at" TIMESTAMPTZ(6);
