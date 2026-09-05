-- "FAYDALI" İŞARETİ KİŞİYE BAĞLANIYOR.
--
-- Eskiden yalnız `circle_posts.helpful` sayacı vardı ve uç kullanıcı kimliğini
-- hiç almıyordu: giriş yapmış herkes aynı gönderiyi sınırsız kez işaretleyip
-- sayacı şişirebiliyor, ya da `on: false` göndererek başka birinin
-- gönderisinin işaretlerini sıfıra indirebiliyordu.
--
-- Mevcut sayaçlara DOKUNULMUYOR: geçmişte kimin işaretlediği bilinmiyor,
-- uydurulmuş bir kullanıcı listesi üretmek yanlış olurdu. Sayaç olduğu yerde
-- kalıyor, bundan sonraki işaretler kişiye bağlı yazılıyor.
DO $$
BEGIN
  -- Geçmişte biriken sayaç korunuyor: yeni işaretler bunun ÜSTÜNE eklenecek.
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'circle_posts') THEN
    ALTER TABLE circle_posts ADD COLUMN IF NOT EXISTS helpful_base INTEGER NOT NULL DEFAULT 0;
    UPDATE circle_posts SET helpful_base = helpful WHERE helpful_base = 0 AND helpful > 0;
  END IF;

  CREATE TABLE IF NOT EXISTS circle_helpfuls (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL,
    post_id    UUID NOT NULL,
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT now()
  );

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
     WHERE tablename = 'circle_helpfuls' AND indexname = 'circle_helpfuls_user_id_post_id_key'
  ) THEN
    CREATE UNIQUE INDEX circle_helpfuls_user_id_post_id_key
      ON circle_helpfuls (user_id, post_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
     WHERE tablename = 'circle_helpfuls' AND indexname = 'circle_helpfuls_post_id_idx'
  ) THEN
    CREATE INDEX circle_helpfuls_post_id_idx ON circle_helpfuls (post_id);
  END IF;
END $$;
