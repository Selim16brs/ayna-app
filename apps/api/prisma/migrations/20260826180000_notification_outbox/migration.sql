-- §10.3 — BİLDİRİM OUTBOX'I
--
-- Bildirimler fire-and-forget gidiyordu: `void push.sendToUser(...)`. Ağ hatası,
-- Expo'nun 5xx dönmesi ya da geçersiz token durumunda bildirim SESSİZCE
-- kayboluyordu — tekrar denenmiyor, kaydı da tutulmuyordu. Expo'nun yanıtı hiç
-- okunmuyordu, dolayısıyla mesaj başına hatalar da görülmüyordu.
--
-- Artık her bildirim önce buraya yazılıyor. Teslim başarısızsa satır pending
-- kalıyor ve zamanlayıcı artan aralıklarla (1dk/5dk/15dk/1sa/6sa/24sa) tekrar
-- deniyor; hak bitince `dead` olup log'a ERROR düşüyor.
--
-- SAKLAMA: title/body kullanıcı adı taşıyabilir. Bu operasyonel veri (log ya da
-- analytics değil) ama süresiz durmuyor — teslim edilen satırlar 7 gün sonra
-- zamanlayıcı tarafından siliniyor.
--
-- Yıkıcı değil: yalnız yeni bir tablo.
CREATE TABLE IF NOT EXISTS "notification_outbox" (
  -- id uygulama katmanında üretilir (Prisma @default(uuid())); DB varsayılanı YOK
  "id"              UUID         NOT NULL,
  "user_id"         UUID         NOT NULL,
  "title"           TEXT         NOT NULL,
  "body"            TEXT         NOT NULL,
  "data_json"       TEXT         NOT NULL DEFAULT '{}',
  "status"          TEXT         NOT NULL DEFAULT 'pending',
  "attempts"        INTEGER      NOT NULL DEFAULT 0,
  "last_error"      TEXT,
  "next_attempt_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sent_at"         TIMESTAMPTZ(6),
  "created_at"      TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "notification_outbox_pkey" PRIMARY KEY ("id")
);

-- Zamanlayıcının tarama sorgusu tam olarak bu iki kolonu kullanıyor.
CREATE INDEX IF NOT EXISTS "notification_outbox_status_next_attempt_at_idx"
  ON "notification_outbox" ("status", "next_attempt_at");
