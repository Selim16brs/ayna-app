-- ANA ALAN HİZMET VERİLEN ALANLARDAN BİRİ DEĞİL — geriye dönük düzeltme.
--
-- `sectors` (hizmet verilen alanlar) her hizmet güncellemesinde yeniden
-- türetiliyordu; tekil `sector` sütunu ise kayıt anındaki değerde kalıyordu.
-- Canlıda görülen: sector 'makeup', sectors ['hair','nails'] — uzman makyaj
-- yapmıyor ama ana alanı makyaj. Kart uzmanlık etiketini oradan okuyor.
--
-- Guard: yalnız `sectors` DOLU ve ana alan o listede YOKKEN düzeltiliyor.
-- Listesi boş olan kayda (alan seti hiç türetilmemiş) dokunulmuyor: onun
-- tek bilgisi zaten `sector` sütunu.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'professionals') THEN
    RETURN;
  END IF;

  UPDATE professionals
     SET sector = sectors[1]
   WHERE array_length(sectors, 1) > 0
     AND NOT (sector = ANY(sectors));
END $$;
