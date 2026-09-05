-- ŞEHİR ADI TEK YAZIMA — geriye dönük düzeltme.
--
-- Haritadan konum işaretleyen uzmanın şehri ters geocode'dan RUSÇA geliyor
-- ('Алматы'); uygulamanın şehir seçicisi Türkçe yazımı kullanıyor ('Almatı').
-- Eşleşme düz metindi: o uzman kendi şehrindeki müşterinin keşif ekranından
-- sessizce kayboluyordu. Kampanyası da hiç görünmüyordu — kampanya şehri
-- kayıt anında kopyalanıyor.
--
-- Kod tarafı düzeltildi (yazım normalleştirmesi + kanonik yazımla kayıt) ama
-- MEVCUT satırlar hâlâ Rusça. Bu dosya onları kanonik yazıma çeviriyor.
--
-- Guard: yalnız TANINAN yazımlar çevriliyor. Bilinmeyen bir şehir adına
-- dokunulmuyor — en yakın benzerine çekmek, uzmanı hiç bulunmadığı şehre
-- taşımak olurdu.
DO $$
DECLARE
  esleme CONSTANT text[][] := ARRAY[
    ['Актау','Aktau'], ['Актобе','Aktöbe'], ['Ақтөбе','Aktöbe'],
    ['Алматы','Almatı'], ['Алма-Ата','Almatı'], ['Almaty','Almatı'],
    ['Аркалык','Arkalık'], ['Арқалық','Arkalık'],
    ['Астана','Astana'], ['Нур-Султан','Astana'], ['Нұр-Сұлтан','Astana'],
    ['Атырау','Atırav'], ['Atyrau','Atırav'],
    ['Балхаш','Balkaş'], ['Балқаш','Balkaş'],
    ['Экибастуз','Ekibastuz'], ['Екібастұз','Ekibastuz'],
    ['Жезказган','Jezkazgan'], ['Жезқазған','Jezkazgan'],
    ['Жанаозен','Janaözen'], ['Жаңаөзен','Janaözen'],
    ['Караганда','Karagandı'], ['Қарағанды','Karagandı'],
    ['Кентау','Kentau'],
    ['Кызылорда','Kızılorda'], ['Қызылорда','Kızılorda'],
    ['Кокшетау','Kökşetau'], ['Көкшетау','Kökşetau'],
    ['Костанай','Kostanay'], ['Қостанай','Kostanay'],
    ['Уральск','Oral'], ['Орал','Oral'],
    ['Усть-Каменогорск','Öskemen'], ['Өскемен','Öskemen'],
    ['Павлодар','Pavlodar'], ['Риддер','Ridder'],
    ['Рудный','Rudnıy'],
    ['Сарыагаш','Sarıağaş'], ['Сарыағаш','Sarıağaş'],
    ['Семей','Semey'], ['Семипалатинск','Semey'],
    ['Степногорск','Stepnogorsk'],
    ['Шымкент','Şımkent'], ['Shymkent','Şımkent'],
    ['Талдыкорган','Taldıkorgan'], ['Талдықорған','Taldıkorgan'],
    ['Тараз','Taraz'], ['Темиртау','Temirtau'], ['Теміртау','Temirtau'],
    ['Туркестан','Türkistan'], ['Түркістан','Türkistan']
  ];
  i int;
BEGIN
  FOR i IN 1 .. array_length(esleme, 1) LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'professionals') THEN
      UPDATE professionals SET city = esleme[i][2] WHERE city = esleme[i][1];
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'offers') THEN
      UPDATE offers SET city = esleme[i][2] WHERE city = esleme[i][1];
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'businesses') THEN
      UPDATE businesses SET city = esleme[i][2] WHERE city = esleme[i][1];
    END IF;
  END LOOP;
END $$;
