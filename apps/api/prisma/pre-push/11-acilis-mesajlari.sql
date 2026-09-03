-- AÇILIŞ MESAJLARI — brief §7.1/§7.2/§7.3.
--
-- Railway `prisma db push` çalıştırıyor; bu dosya push ÖNCESİ koşuyor ve
-- yalnızca db push'un tek başına yapamayacağı şeyleri yapıyor. Burada
-- ikisi de YENİ tablo olduğu için yapılacak bir taşıma yok: dosya
-- bilinçli olarak boş bırakılmadı, gelecekte kimlik değişimi olursa
-- buraya yazılacak diye numarası ayrıldı.
--
-- Tek gerçek iş: eski bir denemeden kalmış olabilecek yanlış birincil
-- anahtar. Yoksa hiçbir şey yapmıyor (guard'lı).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'splash_stats')
     AND NOT EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_name = 'splash_stats' AND column_name = 'locale'
     )
  THEN
    -- Sayaç tablosu; dil kırılımı olmadan biriken satırlar anlamsız.
    DELETE FROM splash_stats;
  END IF;
END $$;
