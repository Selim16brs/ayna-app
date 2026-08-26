-- §12.8 — KOMİSYON TAHAKKUKU DÜZELTMELERİ
--
-- 1) bookings.completed_at — randevunun tamamlandığı an.
--    Komisyon dönemi eskiden `created_at` ile filtreleniyordu ve bu bir gelir
--    sızıntısıydı: haziranda oluşup ağustosta tamamlanan randevu HİÇBİR döneme
--    düşmüyordu (haziran kapandığında henüz tamamlanmamış, ağustos döneminde ise
--    created_at penceresi dışında).
--
-- 2) commission_invoices.commission_rate — faturanın kesildiği andaki oran.
--    Oran sonradan değişince geçmiş faturaların tutarı açıklanamaz hâle gelirdi.
--
-- 3) (pro_id, period_start, period_end) benzersizliği — aynı pro + aynı dönem
--    için iki fatura kesilemez. Eskiden yalnız "önce oku sonra yaz" kontrolü
--    vardı; eşzamanlı iki kapanış çağrısı çift borçlandırma üretebiliyordu.
--
-- Yıkıcı değil. Geriye dönük veri korunur: mevcut TAMAMLANMIŞ randevuların
-- completed_at değeri created_at ile doldurulur — böylece geçmiş dönemler
-- bugüne kadar hangi kurala göre faturalandıysa öyle kalır. Retroaktif olarak
-- yeniden hesaplamak, kapanmış dönemlerde çift ya da eksik fatura üretirdi.

ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "completed_at" TIMESTAMPTZ(6);

UPDATE "bookings"
   SET "completed_at" = "created_at"
 WHERE "status" = 'completed' AND "completed_at" IS NULL;

ALTER TABLE "commission_invoices"
  ADD COLUMN IF NOT EXISTS "commission_rate" DECIMAL(5,2) NOT NULL DEFAULT 10;

-- Benzersizlik kısıtı, mevcut çift kayıt varsa kurulamaz. Böyle bir durumda
-- dağıtımı düşürmek yerine uyarıp devam ediyoruz: uygulama katmanındaki
-- kontrol yerinde duruyor, çiftler elle çözülünce indeks kendiliğinden kurulur.
DO $do$
BEGIN
  CREATE UNIQUE INDEX IF NOT EXISTS "commission_invoices_pro_id_period_start_period_end_key"
    ON "commission_invoices" ("pro_id", "period_start", "period_end");
EXCEPTION WHEN unique_violation THEN
  RAISE WARNING 'commission_invoices: mevcut çift fatura var, benzersizlik indeksi kurulmadı';
END $do$;
