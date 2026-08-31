import { SLOT_HOLDING_STATUSES } from '../bookings/slot-statuses';

// A3 — slot benzersizliğinin veritabanı tarafı.
//
// NEDEN TRIGGER: üretim her açılışta `prisma db push` çalıştırıyor (Dockerfile:32).
// `db push` şemada tanımlı olmayan indeks ve kısıtları düşürür — bu yüzden kısmi
// (partial) bir unique index kalıcı olamaz. Bunun yerine kısıt, şemada tanımlı
// `slot_key` kolonunun @unique'i olarak yaşıyor; kolonu doğru dolduran mantık da
// trigger'da. Trigger'ı Prisma bilmez, dolayısıyla `db push` ona dokunmaz.
//
// Uygulama kodunda değil trigger'da olmasının sebebi: randevu durumu 11 ayrı yerde
// değişiyor, dördü `updateMany`. Kolonu elle doldurmak, bir gün birinin unutması
// demekti — ve unutulan yer sessizce çift rezervasyona açılırdı.

/**
 * Slot işgal eden durumlar, SQL listesi olarak.
 *
 * Liste `slot-statuses.ts`ten TÜRETİLİYOR. Burada eskiden elle yazılmış bir
 * kopya vardı ("aynı liste olmalı" diye bir yorumla) ve brief §3 sözlüğü
 * değiştiğinde kopya güncellenmedi: trigger hiçbir randevuyu eşleştiremediği
 * için her kayda `slot_key = NULL` yazıyordu, yani veritabanı seviyesindeki
 * çift-rezervasyon koruması sessizce KAPALIYDI. Yorumla korunan değil,
 * türetilen liste.
 *
 * Değerler enum adları — tırnak içinde string olarak SQL'e gidiyor; Prisma
 * enum'u kaynak olduğu için kullanıcı girdisi karışamaz.
 */
export const SLOT_HOLDING_SQL_LIST = `(${SLOT_HOLDING_STATUSES.map((s) => `'${s}'`).join(',')})`;

// Anahtar biçimi: `<pro_id>@<başlangıç UTC, saniye hassasiyetinde>`.
// `AT TIME ZONE 'UTC'` şart: sunucunun yerel saati değişse bile anahtar kaymaz.
const KEY_EXPR = `NEW.pro_id || '@' || to_char(NEW.start_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS')`;

export const SLOT_KEY_FUNCTION_SQL = `
CREATE OR REPLACE FUNCTION ayna_booking_slot_key() RETURNS trigger AS $BODY$
BEGIN
  IF NEW.pro_id IS NOT NULL
     AND NEW.start_at IS NOT NULL
     AND NEW.status::text IN ${SLOT_HOLDING_SQL_LIST} THEN
    NEW.slot_key := ${KEY_EXPR};
  ELSE
    NEW.slot_key := NULL;
  END IF;
  RETURN NEW;
END;
$BODY$ LANGUAGE plpgsql;
`;

// DİKKAT: her eleman TEK bir SQL komutu olmalı. `$executeRawUnsafe` prepared
// statement kullanır ve tek çağrıda birden fazla komutu reddeder (42601) —
// ikisini tek string'de birleştirmek kurulumu üretimde sessizce düşürür.
export const SLOT_KEY_TRIGGER_SQL = [
  `DROP TRIGGER IF EXISTS bookings_slot_key ON bookings`,
  `CREATE TRIGGER bookings_slot_key
     BEFORE INSERT OR UPDATE ON bookings
     FOR EACH ROW EXECUTE FUNCTION ayna_booking_slot_key()`,
];

// Geriye dönük doldurma. Trigger yalnız YENİ yazımlarda çalışır; kurulumdan önce
// var olan aktif randevuların anahtarı NULL kalır ve DB seviyesinde korunmazlar.
//
// DISTINCT ON kritik: üretimde zaten çift rezervasyon varsa (uygulama katmanı
// korumasız olan teklif-seçme yolundan girmiş olabilir) her (uzman, saat) grubunun
// yalnız EN ESKİ kaydı anahtarlanır. Böylece doldurma unique ihlaliyle patlamaz;
// sonradan gelen kopyalar anahtarsız kalır ve `slot-conflicts` raporunda görünür.
//
// `slot_key IS NULL` koşulu doldurmayı idempotent yapar — her açılışta çalışabilir.
export const SLOT_KEY_BACKFILL_SQL = `
WITH ilk AS (
  SELECT DISTINCT ON (pro_id, start_at) id
  FROM bookings
  WHERE pro_id IS NOT NULL
    AND start_at IS NOT NULL
    AND slot_key IS NULL
    AND status::text IN ${SLOT_HOLDING_SQL_LIST}
  ORDER BY pro_id, start_at, created_at ASC, id ASC
)
UPDATE bookings b
   SET slot_key = b.pro_id || '@' || to_char(b.start_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS')
  FROM ilk
 WHERE b.id = ilk.id;
`;

// Doldurmadan sonra anahtarsız kalan aktif randevular = gerçekten var olan çift
// rezervasyonlar. Sayısı log'a yazılır (PII yok — yalnız adet).
export const SLOT_CONFLICT_COUNT_SQL = `
SELECT count(*)::int AS adet
  FROM bookings
 WHERE pro_id IS NOT NULL
   AND start_at IS NOT NULL
   AND slot_key IS NULL
   AND status::text IN ${SLOT_HOLDING_SQL_LIST};
`;
