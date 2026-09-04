/**
 * TAMAMLANAN RANDEVU SAYISI — katalog listesindeki sayaç.
 *
 * Kurucu arama kırılımı olarak istedi ("gerçek randevu sayısını ekle ve
 * sunucu tarafında genişlet"). Mobil taraf o güne kadar en yakın veri olan
 * `reviewCount`u kullanmak zorundaydı; ikisi aynı sayı değil.
 *
 * Bu dosya üç şeyi koruyor:
 *   1. HANGİ DURUMLAR sayılıyor — akışın ortasındaki randevular ve
 *      iptaller sayıya karışmamalı.
 *   2. SORGU ŞEKLİ — uzman başına sorgu (N+1) açılmamalı, tek `groupBy`
 *      kalmalı; ve o sorgunun dayandığı indeks şemada durmalı.
 *   3. HİÇ RANDEVUSU OLMAYAN uzman `undefined` değil `0` almalı.
 */

import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const kok = join(import.meta.dirname, '../..');
const servis = readFileSync(join(kok, 'src/catalog/catalog.service.ts'), 'utf8');
const sema = readFileSync(join(kok, 'prisma/schema.prisma'), 'utf8');

/** `catalog.service.ts` içindeki listenin aynısı. */
const TAMAMLANMIS = ['tamamlandi', 'degerlendirme', 'kapandi'] as const;

test('yalnız hizmetin GERÇEKTEN verildiği durumlar sayılıyor', () => {
  // Akışın ortası: randevu daha bitmemiş olabilir.
  for (const d of [
    'taslak',
    'onay_bekliyor',
    'degisiklik_onerildi',
    'karsi_oneri',
    'depozito_bekliyor',
    'kesinlesti',
    'erteleme_onerildi',
    'hizmet_gunu',
    'odeme_bekliyor',
  ]) {
    assert.ok(
      !TAMAMLANMIS.includes(d as (typeof TAMAMLANMIS)[number]),
      `"${d}" tamamlanmış sayılmamalı — hizmet henüz bitmemiş olabilir`,
    );
  }
  // İptaller, no-show'lar ve uyuşmazlık asla sayılmamalı.
  for (const d of [
    'iptal_musteri',
    'iptal_uzman',
    'otomatik_dustu',
    'no_show_musteri',
    'no_show_uzman',
    'uyusmazlik',
  ]) {
    assert.ok(
      !TAMAMLANMIS.includes(d as (typeof TAMAMLANMIS)[number]),
      `"${d}" sayıya girerse uzman hiç yapmadığı işi yapmış görünür`,
    );
  }
});

test('sayılan üç durum da hizmetin verildiği anlamına geliyor', () => {
  // `tamamlandi` uzman ödemeyi aldı · `degerlendirme` 7 günlük pencere ·
  // `kapandi` kapanmış. Üçünde de hizmet verilmiş.
  assert.deepEqual([...TAMAMLANMIS], ['tamamlandi', 'degerlendirme', 'kapandi']);
  for (const d of TAMAMLANMIS) {
    assert.ok(sema.includes(`  ${d} `) || sema.includes(`  ${d}\n`), `"${d}" şemada yok`);
  }
});

test('servis bu üç durumu sayıyor', () => {
  assert.match(
    servis,
    /const TAMAMLANMIS = \['tamamlandi', 'degerlendirme', 'kapandi'\] as const;/,
    'servisteki durum listesi değişmiş',
  );
  assert.match(servis, /status: \{ in: \[\.\.\.TAMAMLANMIS\] \}/, 'sorgu durum süzmüyor');
});

test('TEK sorgu — uzman başına sorgu (N+1) yok', () => {
  assert.match(servis, /this\.prisma\.booking\.groupBy\(\{/, 'toplu sayım sorgusu yok');
  // `Promise.all` içinde: mevcut iki toplu sorgunun yanına eklendi, ayrı
  // bir tur açmıyor.
  /*
   * Başarı hesabı da aynı toplu turda — ama ORTAK SERVİSTEN
   * (`basari.hesapla`). Kural sorgu SAYISI değil ŞEKLİ: hepsi tek
   * `Promise.all` içinde ve sağlayıcı başına değil.
   */
  assert.match(
    servis,
    /const \[sps, bizs, randevuSayilari, basarilar, puanlar, esikAyari\] = await Promise\.all\(\[/,
    'sorgular toplu turun içinde değil',
  );
  assert.match(servis, /this\.basari\.hesapla\(ids\)/, 'başarı hesabı ortak servisten gelmiyor');
  /*
   * Liste döngüsünün içinde sorgu OLMAMALI. Dilim METODUN SONUNDA bitmeli:
   * dosyanın geri kalanına taşarsa başka metotların await'lerini yakalayıp
   * yanlış alarm verir (ilk yazımda tam bu oldu).
   */
  /*
   * `return rows` dosyada birden çok yerde geçiyor (kategoriler metodu da
   * öyle bitiyor). Çapa `randevuByPro` — o yalnız uzman listesinde var.
   */
  const bas = servis.indexOf('return rows', servis.indexOf('randevuByPro'));
  // Metot kapanışı: iki boşluk girintili tek `}` satırı.
  const son = servis.indexOf('\n  }\n', bas);
  const dongu = servis.slice(bas, son > 0 ? son : bas + 4000);
  assert.ok(dongu.includes('.map((r) =>'), 'liste döngüsü bulunamadı — test kapsamı kaymış');
  assert.ok(!dongu.includes('await this.prisma.'), 'liste döngüsünün içinde sorgu var (N+1)');
});

test('sorgunun dayandığı indeks şemada duruyor', () => {
  // (proId, status) olmadan sorgu tüm randevu tablosunu tarar.
  assert.match(sema, /@@index\(\[proId, status\]\)/, 'Booking(proId, status) indeksi yok');
});

test('randevusu olmayan uzman 0 alıyor, undefined değil', () => {
  // `groupBy` hiç randevusu olmayan uzman için satır DÖNDÜRMEZ. Alan
  // undefined kalırsa mobil taraftaki "alanı olmayanı eleme" kuralı
  // devreye girer ve yeni uzman her randevu filtresinden geçer.
  assert.match(
    servis,
    /completedBookings: randevuByPro\.get\(r\.id\) \?\? 0,/,
    'sayısı olmayan uzman için 0 verilmiyor',
  );
});

/*
 * PUAN VE YORUM SAYISI — sütun değil GERÇEK KAYIT.
 *
 * Bulgu: `Professional.rating` ve `reviewCount` sütunlarına HİÇBİR YERDE
 * yazılmıyordu. Değerlendirme verilince `Rating` satırı açılıyor ama uzman
 * kaydına dönmüyordu. Canlıda 12 gerçek değerlendirme varken listede
 * herkesin puanı 0 görünüyordu; aramada "4,5+" seçen kullanıcı her zaman
 * boş liste alıyordu ve "Puan"/"Popülerlik" sıralamaları hiçbir şey
 * sıralamıyordu.
 */

test('puan ve yorum sayısı Rating tablosundan hesaplanıyor', () => {
  assert.match(servis, /this\.prisma\.rating\.groupBy\(\{/, 'puanlar toplu hesaplanmıyor');
  assert.match(servis, /_avg: \{ score: true \}/, 'ortalama hesaplanmıyor');
  assert.match(
    servis,
    /rating: puanByPro\.get\(r\.id\)\?\.ortalama \?\? 0,/,
    'liste hâlâ bayat sütunu döndürüyor',
  );
  assert.match(
    servis,
    /reviewCount: puanByPro\.get\(r\.id\)\?\.adet \?\? 0,/,
    'yorum sayısı hâlâ bayat sütundan geliyor',
  );
});

test('görünürlük kuralları özet ucuyla AYNI', () => {
  /*
   * Liste ile profil aynı sayıyı göstermeli. `summary()` iki kural
   * uyguluyor: yalnız `visible` olanlar ve yayın anı gelmiş olanlar
   * (§4.11 bir günlük gecikme). Liste bunlardan birini atlarsa gizli ya da
   * henüz yayınlanmamış yorum aramada ortaya çıkar.
   */
  const i = servis.indexOf('this.prisma.rating.groupBy');
  const sorgu = servis.slice(i, i + 500);
  assert.ok(sorgu.includes('visible: true'), 'gizli yorumlar da sayılıyor');
  assert.ok(
    sorgu.includes('publishAt: null') && sorgu.includes('publishAt: { lte: new Date() }'),
    'yayın anı gelmemiş yorumlar da sayılıyor (§4.11 gecikmesi atlanıyor)',
  );
});

test('açılma eşiği uygulanıyor — eşik altında ortalama gizli', () => {
  // `summary()` eşiğin altında `average: null` döndürüyor; liste de 0
  // vermeli, yoksa profil "puan henüz açılmadı" derken arama puan gösterir.
  assert.match(servis, /rating\.threshold/, 'eşik ayarı okunmuyor');
  assert.match(servis, /adet >= esik/, 'eşik uygulanmıyor');
});

test('sayaç listede döndürülüyor', () => {
  const i = servis.indexOf('completedBookings');
  assert.ok(i > 0, 'completedBookings listeye eklenmemiş');
  // `priceTo` ile aynı map bloğunda — yani her uzman kaydına giriyor.
  const blok = servis.slice(i - 600, i + 200);
  assert.ok(blok.includes('priceTo:'), 'sayaç liste map bloğunun içinde değil');
});
