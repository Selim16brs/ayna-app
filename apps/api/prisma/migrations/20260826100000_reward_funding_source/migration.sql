-- §8.5 — İndirimi kim karşılıyor + komisyondan mahsup.
-- EKLEMELİ ve geri alınabilir: mevcut satırlar varsayılan değerle dolar.
--
-- NEDEN "IF EXISTS / IF NOT EXISTS":
-- Bu depoda migrations klasörü ile schema.prisma arasında ÖNCEDEN VAR OLAN bir
-- sapma bulunuyor (bkz. 20260826060000_trust_passport_reports notu). Somut
-- kanıt: "commission_invoices" migration'larda oluşturuluyor ama "payments"
-- OLUŞTURULMUYOR — üretim `prisma db push` ile dağıtıldığı için orada mevcut.
-- Koşulsuz bir ALTER, boş bir veritabanında "relation payments does not exist"
-- ile patlıyordu (denendi). Koşullu yazım her iki yolu da doğru kılar:
--   • `db push`  → şemadan türetir, bu dosya hiç çalışmaz
--   • `migrate deploy` üretimde → tablo var, sütunlar eklenir
--   • `migrate deploy` boş DB'de → tablo yok, sessizce atlanır (patlamaz)

-- Puanla ödenen kısmı kimin finanse ettiği. Varsayılan AYNA_COMMISSION:
-- geçmiş kayıtlarda uzman zaten eksik nakit almıştı; o yükü ona bırakmamak
-- doğru olan. Geçmiş FATURALAR yeniden hesaplanmaz (immutable finans kaydı).
ALTER TABLE IF EXISTS "payments"
  ADD COLUMN IF NOT EXISTS "funding_source" TEXT NOT NULL DEFAULT 'AYNA_COMMISSION';

-- Faturadan düşülen sübvansiyon kredisi. Geçmiş faturalarda 0 kalır.
ALTER TABLE IF EXISTS "commission_invoices"
  ADD COLUMN IF NOT EXISTS "reward_subsidy_amount" DECIMAL(12,2) NOT NULL DEFAULT 0;
