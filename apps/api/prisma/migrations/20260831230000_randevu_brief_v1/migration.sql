-- AYNA_RANDEVU_AKISI_BRIEF.md v1 — randevu akışının tümden yenilenmesi.
--
-- Eski durum makinesi (confirmed/deposit_pending/completed_pending ...) TAMAMEN
-- kaldırıldı; brief §3'ün durumları geldi. Eski değerler yeni karşılıklarına
-- taşınıyor: veri kaybı yok, ama iki makine bir arada BIRAKILMIYOR.

-- 1) Yeni enum
CREATE TYPE "BookingStatus_yeni" AS ENUM (
  'taslak', 'onay_bekliyor', 'degisiklik_onerildi', 'karsi_oneri',
  'depozito_bekliyor', 'kesinlesti', 'erteleme_onerildi', 'hizmet_gunu',
  'odeme_bekliyor', 'tamamlandi', 'degerlendirme', 'kapandi',
  'iptal_musteri', 'iptal_uzman', 'otomatik_dustu',
  'no_show_musteri', 'no_show_uzman', 'uyusmazlik'
);

-- 2) Eski → yeni eşleme. `waitlist`, `refund_*` ve `reassigned_pending`in
--    brief'te karşılığı yok; bunlar kapanmış kayıt sayılıyor.
ALTER TABLE "bookings" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "bookings" ALTER COLUMN "status" TYPE "BookingStatus_yeni"
  USING (CASE "status"::text
    WHEN 'pending'              THEN 'onay_bekliyor'
    WHEN 'awaiting_provider'    THEN 'onay_bekliyor'
    WHEN 'alternative_proposed' THEN 'degisiklik_onerildi'
    WHEN 'deposit_pending'      THEN 'depozito_bekliyor'
    WHEN 'deposit_submitted'    THEN 'kesinlesti'
    WHEN 'confirmed'            THEN 'kesinlesti'
    WHEN 'completed_pending'    THEN 'odeme_bekliyor'
    WHEN 'balance_pending'      THEN 'odeme_bekliyor'
    WHEN 'balance_submitted'    THEN 'odeme_bekliyor'
    WHEN 'completed'            THEN 'tamamlandi'
    WHEN 'no_show'              THEN 'no_show_musteri'
    WHEN 'disputed'             THEN 'uyusmazlik'
    WHEN 'expired'              THEN 'otomatik_dustu'
    WHEN 'cancelled'            THEN 'iptal_musteri'
    -- Brief'te karşılığı olmayanlar: kapanmış say.
    WHEN 'waitlist'             THEN 'otomatik_dustu'
    WHEN 'refund_pending'       THEN 'iptal_musteri'
    WHEN 'refund_submitted'     THEN 'iptal_musteri'
    WHEN 'reassigned_pending'   THEN 'iptal_musteri'
    ELSE 'onay_bekliyor'
  END)::"BookingStatus_yeni";

DROP TYPE "BookingStatus";
ALTER TYPE "BookingStatus_yeni" RENAME TO "BookingStatus";
ALTER TABLE "bookings" ALTER COLUMN "status" SET DEFAULT 'onay_bekliyor';

-- 3) Dekont doğrulama kuyruğu için işaret (§4.4, §8.1)
ALTER TABLE "bookings" ADD COLUMN "deposit_verified_at" TIMESTAMPTZ(6);

-- 4) Ceza alanları (§4.7, §4.8)
ALTER TABLE "specialists" ADD COLUMN "hidden_until" TIMESTAMPTZ(6);
ALTER TABLE "specialists" ADD COLUMN "cancel_count" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "specialists" ADD COLUMN "cancel_count_month" TEXT NOT NULL DEFAULT '';

-- 5) İade kuyruğu (§4.10) ve uzlaşma kayıtları (§4.8)
CREATE TABLE "refund_requests" (
  "id" UUID NOT NULL,
  "booking_id" UUID NOT NULL,
  "payee_user_id" UUID NOT NULL,
  "kind" TEXT NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "payout_info" TEXT NOT NULL DEFAULT '',
  "status" TEXT NOT NULL DEFAULT 'bekliyor',
  "note" TEXT NOT NULL DEFAULT '',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "paid_at" TIMESTAMPTZ(6),
  CONSTRAINT "refund_requests_pkey" PRIMARY KEY ("id")
);
-- Aynı randevu + aynı tür için İKİ kayıt açılamaz (çift ödeme yasağı).
CREATE UNIQUE INDEX "refund_requests_booking_id_kind_key" ON "refund_requests"("booking_id","kind");
CREATE INDEX "refund_requests_status_idx" ON "refund_requests"("status");

CREATE TABLE "reconciliations" (
  "id" UUID NOT NULL,
  "booking_id" UUID NOT NULL,
  "kind" TEXT NOT NULL,
  "opened_by" UUID NOT NULL,
  "reason" TEXT NOT NULL DEFAULT '',
  "evidence" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "status" TEXT NOT NULL DEFAULT 'bekliyor',
  "admin_note" TEXT NOT NULL DEFAULT '',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolved_at" TIMESTAMPTZ(6),
  CONSTRAINT "reconciliations_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "reconciliations_booking_id_key" ON "reconciliations"("booking_id");
CREATE INDEX "reconciliations_status_idx" ON "reconciliations"("status");

-- 6) Komisyon faturaları — brief §4.4/§10: ikinci tahsilat YOK.
--    Tablo geçmiş kayıt olarak DURUYOR; yeni fatura üreten kod kaldırıldı.
--    Silmek, geçmiş muhasebeyi de silmek olurdu.
