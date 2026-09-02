-- E-posta kaydı tablosu.
--
-- Railway `prisma db push` çalıştırıyor, `migrate deploy` DEĞİL; migrations/
-- üretimde hiç koşmuyor. Tablo burada, db push'tan ÖNCE ve KORUMALI açılıyor.
CREATE TABLE IF NOT EXISTS "email_log" (
  "id"                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"             UUID,
  "email"               TEXT NOT NULL,
  "template"            TEXT NOT NULL,
  "dedupe_key"          TEXT NOT NULL,
  "locale"              TEXT NOT NULL DEFAULT 'tr',
  "status"              TEXT NOT NULL DEFAULT 'QUEUED',
  "provider_message_id" TEXT,
  "error"               TEXT,
  "sent_at"             TIMESTAMPTZ(6),
  "created_at"          TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);

-- ── SONRADAN EKLENEN SÜTUN ───────────────────────────────────────────────
--
-- BU BLOK OLMADAN SUNUCU AÇILMIYORDU.
--
-- Tablo #139'da `dedupe_key` OLMADAN oluşturuldu. #141 sütunu yukarıdaki
-- CREATE TABLE'a ekledi ama `IF NOT EXISTS` var olan tabloyu atladığı için
-- sütun üretimde hiç açılmadı; hemen ardından gelen indeks
--   Error: column "dedupe_key" does not exist
-- diye patladı, dağıtım yarıda kaldı ve API HİÇ AÇILMADI. Telefon her
-- istekte 502 alıp "çevrimdışısın" gösteriyordu — ağ değil, sunucu yoktu.
--
-- Ders: korumalı CREATE TABLE tek başına yetmiyor. Şemaya sonradan eklenen
-- her sütunun ayrıca ALTER'ı olmak zorunda.
--
-- Sıra önemli: önce boş bırakılabilir ekle, sonra doldur, sonra zorunlu yap.
-- Tek adımda NOT NULL eklemek mevcut satırlar yüzünden reddedilirdi.
ALTER TABLE "email_log" ADD COLUMN IF NOT EXISTS "dedupe_key" TEXT;

-- Geriye dönük dolgu: `dedupe_key` gelmeden önce tekilleştirme zaten ŞABLON
-- üzerindendi. Eski satırlar için doğru karşılık şablon adının kendisi.
UPDATE "email_log" SET "dedupe_key" = "template" WHERE "dedupe_key" IS NULL;

ALTER TABLE "email_log" ALTER COLUMN "dedupe_key" SET NOT NULL;

-- ── ESKİ KISIT KALDIRILIYOR ──────────────────────────────────────────────
--
-- (user_id, template) tekilliği #141'in düzelttiği hatanın ta kendisiydi:
-- ikinci randevunun onay postası "bu şablon zaten gitmiş" diye susuyordu.
-- Yeni kısıt anahtar üzerinden; eskisi kalırsa aynı hatayı geri getirir.
-- İKİSİ birden: biri bu script'in #139'daki hâlinden, diğeri Prisma'nın
-- eski `@@unique([userId, template])` tanımından kalma. Yalnız birini
-- düşürmek yetmez, diğeri aynı kısıtı sürdürür.
DROP INDEX IF EXISTS "email_log_user_template_key";
DROP INDEX IF EXISTS "email_log_user_id_template_key";

-- Tekilleştirme ANAHTAR üzerinden: bir kez gidecekler düz şablon adı, olay
-- başına gidecekler "sablon:olayId". Yalnız şablona bakmak iki yönlü yanlıştı:
-- ikinci randevunun onayı susuyordu, teklif postası ise gevşetilse taşardı.
-- Kısıt veritabanında: uygulama katmanında "önce oku sonra yaz" iki eşzamanlı
-- koşuda ikisini de geçirir.
CREATE UNIQUE INDEX IF NOT EXISTS "email_log_user_dedupe_key"
  ON "email_log" ("user_id", "dedupe_key");

CREATE INDEX IF NOT EXISTS "email_log_email_idx"    ON "email_log" ("email");
CREATE INDEX IF NOT EXISTS "email_log_status_idx"   ON "email_log" ("status");
CREATE INDEX IF NOT EXISTS "email_log_template_idx" ON "email_log" ("template");
