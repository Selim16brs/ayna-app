-- §4.4 — SES INVEST Kaspi işyeri bağlantısı (VARSAYILAN).
--
-- Kaynak: AIVio üretim paketindeki aynı SES INVEST işyeri QR'ı; kurucu
-- 01.09.2026'da "aynısı" diye onayladı. Kaspi işyeri QR'ları
-- `https://qr.kaspi.kz/<işyeri-kimliği>` biçiminde: telefonda Kaspi
-- uygulamasını açıp ALICIYI hazır getiriyor, tutarı müşteri yazıyor.
--
-- ON CONFLICT DO NOTHING — bu bir VARSAYILAN, dayatma değil: panelden
-- değiştirilen değer sonraki dağıtımlarda ezilmez. Ayarı temizlemek
-- (özelliği kapatmak) da panelden yapılır ve burası onu geri getirmez,
-- çünkü satır zaten var olur.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'settings') THEN
    RETURN;
  END IF;
  INSERT INTO "settings" ("key", "int_value", "str_value")
  VALUES (
    'kaspi.payment_url',
    0,
    'https://qr.kaspi.kz/19202910444260642559511536155121274667697'
  )
  ON CONFLICT ("key") DO NOTHING;
END $$;
