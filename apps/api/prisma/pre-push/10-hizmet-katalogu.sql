-- HİZMET KATALOĞU GEÇİŞİ — `AYNA_HIZMET_KATALOGU_BRIEF.md` v1.0.
--
-- Kategori kimlikleri değişti: brief §3 taksonomisi 13 kategori tanımlıyor
-- ve bazıları eskiyle aynı ada sahip DEĞİL:
--
--   skincare  → skin            (yeniden adlandırma)
--   lashes    → lashes_brows    (kirpik + kaş TEK kategori oldu)
--   brows     → lashes_brows    (yukarıdakiyle BİRLEŞTİ)
--   pmu       → makeup.pmu      (kategori değil, Makyaj'ın ALT HİZMETİ)
--   bridal    → makeup.bridal   (kategori değil, Makyaj'ın ALT HİZMETİ)
--
-- SORUN: `CategorySyncService` EKSİK kategorileri ekliyor ama ESKİLERİ
-- silmiyor. Bu dosya olmasaydı panelde 12 eski + 13 yeni = 25 satır
-- görünürdü ve 5'i hiçbir uygulama ekranında karşılığı olmayan ölü
-- kategoriler olurdu. Kurucu "ne nerde ne iş yapıyor belli değil" dedikten
-- sonra panele ölü kategori bırakmak kabul edilemez.
--
-- SIRA ÖNEMLİ: pre-push `db push`tan ÖNCE çalışıyor; uygulama açıldığında
-- `CategorySyncService` eksik 13 kategoriyi ekliyor.

-- ── 1) TAŞINABİLENLER: satırı KORU, kodunu değiştir ─────────────────────
--
-- Silip yeniden yaratmak yerine yeniden adlandırıyoruz: `quote_requests`
-- satırın `id`sine bağlı, silmek mevcut talepleri koparırdı.
--
-- KORUMALI: hedef kod zaten varsa dokunma — `code` tekil, çakışma
-- dağıtımı yarıda bırakırdı.
UPDATE "service_categories" SET "code" = 'skin', "name_tr" = 'Cilt Bakımı'
WHERE "code" = 'skincare'
  AND NOT EXISTS (SELECT 1 FROM "service_categories" s2 WHERE s2."code" = 'skin');

UPDATE "service_categories" SET "code" = 'lashes_brows', "name_tr" = 'Kirpik & Kaş'
WHERE "code" = 'lashes'
  AND NOT EXISTS (SELECT 1 FROM "service_categories" s2 WHERE s2."code" = 'lashes_brows');

-- ── 2) BİRLEŞENLER: talepleri hedefe taşı, sonra eski satırı sil ────────
--
-- `brows` artık `lashes_brows` içinde. Kaş talebi eden kullanıcının talebi
-- kaybolmamalı; hedef kategoriye bağlanıyor.
UPDATE "quote_requests" q
SET "category_id" = (SELECT s."id" FROM "service_categories" s WHERE s."code" = 'lashes_brows')
WHERE q."category_id" IN (SELECT s."id" FROM "service_categories" s WHERE s."code" = 'brows')
  AND EXISTS (SELECT 1 FROM "service_categories" s WHERE s."code" = 'lashes_brows');

-- `pmu` ve `bridal` kategori olmaktan çıkıp Makyaj'ın alt hizmeti oldu.
UPDATE "quote_requests" q
SET "category_id" = (SELECT s."id" FROM "service_categories" s WHERE s."code" = 'makeup')
WHERE q."category_id" IN (SELECT s."id" FROM "service_categories" s WHERE s."code" IN ('pmu', 'bridal'))
  AND EXISTS (SELECT 1 FROM "service_categories" s WHERE s."code" = 'makeup');

-- ── 3) ARTIK KARŞILIĞI OLMAYAN SATIRLARI SİL ────────────────────────────
--
-- YALNIZ bağlı talebi kalmamış olanlar siliniyor. Bir talep hâlâ
-- bağlıysa (yukarıdaki taşıma hedefi bulunamamışsa) satır DURUYOR: veriyi
-- koparmaktansa panelde fazladan bir satır görünmesi yeğdir.
DELETE FROM "service_categories" s
WHERE s."code" IN ('brows', 'pmu', 'bridal', 'skincare', 'lashes')
  AND NOT EXISTS (SELECT 1 FROM "quote_requests" q WHERE q."category_id" = s."id");

-- ── 4) SIRALAMAYI KATALOG VARSAYILANINA GETİR ───────────────────────────
--
-- Kalan satırların `sort_order` değerleri ESKİ taksonomiye göre verilmişti
-- ve yeni sırayla ilgisiz: `epilation` eskiden 7. sıradaydı, katalogda 4.
-- Dahası çakışıyorlar — yeni eklenen `skin` 5 aldı, eski `makeup` de 5'te
-- kaldı. Panel ve uygulama kategorileri ne eski ne yeni sırada, RASTGELE
-- diziyordu.
--
-- Brief §7.3: katalog sırası VARSAYILAN, admin panelden değiştirebilir.
-- Buradaki değerler o varsayılan. Kurucu panelden yeniden sıralarsa
-- override kalıcıdır; bu dosya bir daha çalışmıyor.
UPDATE "service_categories" s
SET "sort_order" = v."n"
FROM (VALUES
  ('hair', 1),
  ('nails', 2),
  ('lashes_brows', 3),
  ('epilation', 4),
  ('skin', 5),
  ('makeup', 6),
  ('massage', 7),
  ('spa', 8),
  ('body_contouring', 9),
  ('hair_health', 10),
  ('style', 11),
  ('wellness', 12),
  ('other', 13)
) AS v("code", "n")
WHERE s."code" = v."code";
