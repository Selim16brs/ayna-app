import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

/**
 * İADE KAYDI AÇILABİLİR OLMALI — randevu kimlikleri UUID DEĞİL.
 *
 * `refund_requests.booking_id` ve `reconciliations.booking_id` sütunları UUID
 * tipindeydi; oysa `bookings.id` düz metin:
 *
 *   uygulama → `bk-m2x8k9ab1`      (store.ts nextId)
 *   sunucu   → `bk_q_1a2b3c4d`      (quotes.service)
 *
 * Yani HİÇBİR randevunun iade kaydı yazılamıyordu. Postgres "invalid UUID"
 * diyor, koddaki `catch` bunu "Bu randevu için iade talebi zaten açık" diye
 * raporluyordu: müşteri var olmayan bir talebi bekliyor, depozitosunu hiç
 * geri alamıyordu. Uzman gelmediğinde açılması gereken telafi kaydı ve
 * itiraz (uzlaşma) kaydı da aynı sebeple yazılamıyordu.
 *
 * Birim testleri bunu YAKALAYAMAZ: sahte Prisma sütun tipini bilmiyor.
 * Uçtan uca canlı denemede bulundu (06.09.2026).
 */

const sema = readFileSync(new URL('../../prisma/schema.prisma', import.meta.url), 'utf8');

function modelGovdesi(ad: string): string {
  const i = sema.indexOf(`model ${ad} {`);
  assert.ok(i > 0, `${ad} modeli bulunamadı`);
  return sema.slice(i, sema.indexOf('\n}', i));
}

test('RANDEVU KİMLİĞİ düz metin — UUID değil', () => {
  const booking = modelGovdesi('Booking');
  const idSatiri = booking.split('\n').find((l) => l.trim().startsWith('id '));
  assert.ok(idSatiri, 'Booking.id bulunamadı');
  assert.doesNotMatch(idSatiri, /@db\.Uuid/, 'Booking.id UUID olmuş — bu testin premisi değişti');
});

test('İADE kaydının randevu kimliği UUID İSTEMİYOR', () => {
  const m = modelGovdesi('RefundRequest');
  const satir = m.split('\n').find((l) => l.includes('bookingId'));
  assert.ok(satir, 'RefundRequest.bookingId bulunamadı');
  assert.doesNotMatch(
    satir,
    /@db\.Uuid/,
    'iade kaydı UUID istiyor — hiçbir randevu için iade açılamaz',
  );
});

test('UZLAŞMA kaydının randevu kimliği UUID İSTEMİYOR', () => {
  const m = modelGovdesi('Reconciliation');
  const satir = m.split('\n').find((l) => l.includes('bookingId'));
  assert.ok(satir, 'Reconciliation.bookingId bulunamadı');
  assert.doesNotMatch(satir, /@db\.Uuid/, 'itiraz kaydı hiç açılamaz');
});

test('MEVCUT veritabanı için tip düzeltmesi var', () => {
  // Şemayı düzeltmek yalnız yeni kurulumları kurtarır; canlıdaki sütun
  // ALTER edilmezse iade orada da açılamamaya devam eder.
  const sql = readFileSync(
    new URL('../../prisma/pre-push/24-iade-kimligi.sql', import.meta.url),
    'utf8',
  );
  assert.match(sql, /ALTER TABLE refund_requests ALTER COLUMN booking_id TYPE TEXT/);
  assert.match(sql, /ALTER TABLE reconciliations ALTER COLUMN booking_id TYPE TEXT/);
  // Guard: zaten metin ise dokunulmuyor (idempotent). İKİ tablo için de.
  assert.equal(
    (sql.match(/data_type = 'uuid'/g) ?? []).length,
    2,
    'guard eksik — her koşuda ALTER çalışır',
  );
});

test('İADE HATASI DOĞRU SEBEPLE raporlanıyor', () => {
  /*
   * `catch` HER hatayı "zaten açık" diye raporluyordu. Gerçek sebep ne
   * log'a ne kullanıcıya ulaşıyordu — bu yüzden hata aylarca görünmedi.
   */
  const kaynak = readFileSync(new URL('./bookings.service.ts', import.meta.url), 'utf8');
  const i = kaynak.indexOf("code: 'ALREADY_REQUESTED'");
  assert.ok(i > 0, 'iade hata yolu bulunamadı');
  const once = kaynak.slice(Math.max(0, i - 600), i);
  assert.match(
    once,
    /if \(\(e as \{ code\?: string \}\)\.code === 'P2002'\)/,
    'yalnız tekillik ihlali "zaten açık" sayılmıyor',
  );
  assert.match(kaynak, /iade talebi yazılamadı/, 'gerçek hata log’a yazılmıyor');
  // Bilinmeyen hata YUKARI FIRLIYOR: yutulursa müşteri yine sessizce beklerdi.
  const sonra = kaynak.slice(i, i + 800);
  assert.match(sonra, /throw e;/, 'bilinmeyen hata yutuluyor');
});
