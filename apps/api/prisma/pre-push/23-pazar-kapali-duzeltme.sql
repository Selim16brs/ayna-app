-- SİSTEMİN UZMAN ADINA KAPATTIĞI PAZAR GÜNÜ — geriye dönük düzeltme.
--
-- Çalışma saatleri ekranının başlangıç değeri `open: wd !== 0` idi: PAZAR
-- günü uzman adına kapalı işaretleniyordu. Uzman o güne hiç dokunmasa bile,
-- ekranı bir kez kaydettiğinde "pazar kapalı" sunucuya gidiyordu ve müşteri
-- o gün hiç slot göremiyordu. Uzmanın kendi takviminde ise kilit yoktu.
--
-- Kod düzeltildi (varsayılan artık hiçbir günü kapatmıyor) ama MEVCUT
-- kayıtlarda pazar kapalı duruyor. Canlıda doğrulandı: pazar günü
-- `{"slots":[],"closed":true}`, pazartesi dolu.
--
-- ── GUARD: YALNIZ DOKUNULMAMIŞ VARSAYILAN ────────────────────────────────
--
-- Pazarı BİLEREK kapatmış uzmanın kararını ezmek, bu hatanın aynısını ters
-- yönde yapmak olurdu. Bu yüzden yalnız kaydın TAM OLARAK eski varsayılan
-- desene uyduğu satırlar düzeltiliyor:
--   · yedi günün hepsi var,
--   · yalnız pazar kapalı,
--   · açık günlerin hepsi 10:00–20:00 (varsayılan pencere).
-- Saatini özelleştirmiş ya da başka gün kapatmış hiçbir kayda dokunulmuyor.
DO $$
DECLARE
  eski_desen CONSTANT jsonb := '[
    {"wd":1,"open":true,"from":"10:00","to":"20:00"},
    {"wd":2,"open":true,"from":"10:00","to":"20:00"},
    {"wd":3,"open":true,"from":"10:00","to":"20:00"},
    {"wd":4,"open":true,"from":"10:00","to":"20:00"},
    {"wd":5,"open":true,"from":"10:00","to":"20:00"},
    {"wd":6,"open":true,"from":"10:00","to":"20:00"},
    {"wd":0,"open":false,"from":"10:00","to":"20:00"}
  ]'::jsonb;
  yeni_desen CONSTANT text := '[
    {"wd":1,"open":true,"from":"10:00","to":"20:00"},
    {"wd":2,"open":true,"from":"10:00","to":"20:00"},
    {"wd":3,"open":true,"from":"10:00","to":"20:00"},
    {"wd":4,"open":true,"from":"10:00","to":"20:00"},
    {"wd":5,"open":true,"from":"10:00","to":"20:00"},
    {"wd":6,"open":true,"from":"10:00","to":"20:00"},
    {"wd":0,"open":true,"from":"10:00","to":"20:00"}
  ]';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'professionals') THEN
    RETURN;
  END IF;

  -- Sıra farkı yok sayılıyor: aynı yedi satır, sırası değişik kaydedilmiş
  -- olabilir. Karşılaştırma küme olarak yapılıyor.
  UPDATE professionals
     SET hours_json = yeni_desen
   WHERE hours_json IS NOT NULL
     AND hours_json <> ''
     AND (
       SELECT COALESCE(jsonb_agg(x ORDER BY (x->>'wd')::int), '[]'::jsonb)
         FROM jsonb_array_elements(hours_json::jsonb) AS x
     ) = (
       SELECT jsonb_agg(y ORDER BY (y->>'wd')::int)
         FROM jsonb_array_elements(eski_desen) AS y
     );
END $$;
