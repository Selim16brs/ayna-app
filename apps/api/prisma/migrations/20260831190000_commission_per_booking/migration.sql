-- K3 — işlem başına komisyon faturası.
-- Fatura artık tek bir randevuya bağlanabiliyor; dönem faturalarında NULL kalır.
ALTER TABLE "commission_invoices" ADD COLUMN "booking_id" UUID;

-- Aynı randevu İKİ KEZ faturalanamaz (çifte tahsilat = para hatası).
-- Postgres'te NULL'lar birbirinden farklı sayılır, dolayısıyla bu kısıt dönem
-- faturalarını (booking_id IS NULL) etkilemez.
CREATE UNIQUE INDEX "commission_invoices_booking_id_key"
  ON "commission_invoices"("booking_id");
