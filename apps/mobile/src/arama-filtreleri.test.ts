/**
 * DETAYLI ARAMA — kırılımların bekçisi.
 *
 * Kurucu isteği: "arama kısmında detaylı bir arama fonksiyonu olmalı.
 * değerlendirme notu, randevu sayısı ve benzeri şekilde kullanıcının arama
 * kriteri olabilecek kırımlara göre olabilir. şehir de ayrıca burda
 * kırımlardan birisi olsun."
 *
 * Burada iki ayrı şey deneniyor:
 *   1. ELEME MANTIĞI — her kırılım gerçekten eliyor mu, birlikte
 *      kullanıldıklarında kesişiyor mu, "Farketmez" hiçbir şeyi elemiyor mu.
 *   2. EKRAN BAĞI — panel gerçekten bu kırılımları çiziyor mu, metinler
 *      i18n'den mi geliyor, çipler kategori çipleriyle aynı dili mi
 *      kullanıyor.
 *
 * Eleme mantığı ekrandan bağımsız yeniden yazılmıyor: `search.tsx`'teki
 * koşulların AYNISI burada da var. Kopya olduğu için ikisi ayrışabilir —
 * bu yüzden ekran bağı testi koşulların ekranda hâlâ durduğunu ayrıca
 * denetliyor.
 */

import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const kok = join(import.meta.dirname, '..');
const ekran = readFileSync(join(kok, 'app/search.tsx'), 'utf8');
const sozluk = readFileSync(join(kok, '../../packages/i18n/src/messages/tr.ts'), 'utf8');

// ── Test verisi: gerçek `Professional` alanlarının ilgili altkümesi ──
interface Kayit {
  id: string;
  city: string;
  rating: number;
  reviewCount: number;
  /** Sunucudan gelen TAMAMLANAN randevu sayısı. */
  completedBookings?: number;
  experienceYears: number;
  priceFrom: number;
  kind: 'salon' | 'independent';
  aynaVerified?: boolean;
}

const KAYITLAR: Kayit[] = [
  {
    id: 'a',
    city: 'Almatı',
    rating: 4.9,
    reviewCount: 320,
    completedBookings: 540,
    experienceYears: 12,
    priceFrom: 42000,
    kind: 'independent',
    aynaVerified: true,
  },
  {
    id: 'b',
    city: 'Almatı',
    rating: 4.2,
    reviewCount: 60,
    completedBookings: 210,
    experienceYears: 4,
    priceFrom: 9000,
    kind: 'salon',
  },
  {
    id: 'c',
    city: 'Astana',
    rating: 4.6,
    reviewCount: 110,
    completedBookings: 180,
    experienceYears: 6,
    priceFrom: 22000,
    kind: 'independent',
    aynaVerified: true,
  },
  {
    id: 'd',
    city: 'Şımkent',
    rating: 3.8,
    reviewCount: 15,
    experienceYears: 1,
    priceFrom: 5000,
    kind: 'salon',
  },
];

interface Filtre {
  sehir: string | null;
  minPuan: number | null;
  minRandevu: number | null;
  minYorum: number | null;
  minDeneyim: number | null;
  maxFiyat: number | null;
  tur: 'salon' | 'independent' | null;
  onayliMi: boolean;
}

const bos = (sehir: string | null = null): Filtre => ({
  sehir,
  minPuan: null,
  minRandevu: null,
  minYorum: null,
  minDeneyim: null,
  maxFiyat: null,
  tur: null,
  onayliMi: false,
});

/** `search.tsx` içindeki eleme koşullarının aynısı. */
function ele(kayitlar: Kayit[], f: Filtre): string[] {
  return kayitlar
    .filter((p) => {
      if (f.sehir !== null && p.city !== f.sehir) return false;
      if (f.minPuan !== null && p.rating < f.minPuan) return false;
      if (
        f.minRandevu !== null &&
        p.completedBookings !== undefined &&
        p.completedBookings < f.minRandevu
      )
        return false;
      if (f.minYorum !== null && p.reviewCount < f.minYorum) return false;
      if (f.minDeneyim !== null && p.experienceYears < f.minDeneyim) return false;
      if (f.maxFiyat !== null && p.priceFrom > f.maxFiyat) return false;
      if (f.tur !== null && p.kind !== f.tur) return false;
      if (f.onayliMi && !p.aynaVerified) return false;
      return true;
    })
    .map((p) => p.id);
}

// ── 1. Her kırılım tek başına ──

test('boş filtre hiçbir şeyi elemiyor', () => {
  assert.deepEqual(ele(KAYITLAR, bos()), ['a', 'b', 'c', 'd']);
});

test('şehir kırılımı — kurucunun ayrıca istediği', () => {
  assert.deepEqual(ele(KAYITLAR, { ...bos(), sehir: 'Almatı' }), ['a', 'b']);
  assert.deepEqual(ele(KAYITLAR, { ...bos(), sehir: 'Astana' }), ['c']);
  // null = tüm şehirler. Kullanıcı kendi şehrinin dışına çıkabilmeli;
  // eskiden arama kullanıcının şehrine KİLİTLİYDİ.
  assert.deepEqual(ele(KAYITLAR, { ...bos(), sehir: null }).length, 4);
});

test('değerlendirme notu kırılımı', () => {
  assert.deepEqual(ele(KAYITLAR, { ...bos(), minPuan: 4.5 }), ['a', 'c']);
  assert.deepEqual(ele(KAYITLAR, { ...bos(), minPuan: 4.8 }), ['a']);
  // Sınır DAHİL: 4,9 puanlı uzman "4,5+" aramasında çıkmalı; tam 4,5 olan da.
  assert.ok(ele([{ ...KAYITLAR[0]!, rating: 4.5 }], { ...bos(), minPuan: 4.5 }).length === 1);
});

test('TAMAMLANAN RANDEVU kırılımı — sunucudan gelen gerçek sayı', () => {
  assert.deepEqual(ele(KAYITLAR, { ...bos(), minRandevu: 200 }), ['a', 'b', 'd']);
  assert.deepEqual(ele(KAYITLAR, { ...bos(), minRandevu: 500 }), ['a', 'd']);
  /*
   * "d" kaydında `completedBookings` YOK (eski sunucu sürümü senaryosu) ve
   * bu yüzden elenMİYOR. Filtre yüzünden görünmez olmaktansa görünmesi
   * doğru — aksi hâlde sunucu güncellenene kadar liste boşalırdı.
   */
  assert.ok(
    ele(KAYITLAR, { ...bos(), minRandevu: 500 }).includes('d'),
    'alanı olmayan kayıt elenmemeli',
  );
});

test('randevu sayısı ile değerlendirme sayısı AYRI kırılımlar', () => {
  // İkisi aynı şey değil: her randevu değerlendirmeye dönüşmüyor.
  // "b" 210 randevu yapmış ama yalnız 60 değerlendirme almış.
  assert.ok(ele(KAYITLAR, { ...bos(), minRandevu: 200 }).includes('b'));
  assert.ok(!ele(KAYITLAR, { ...bos(), minYorum: 200 }).includes('b'));
});

test('değerlendirme sayısı kırılımı', () => {
  assert.deepEqual(ele(KAYITLAR, { ...bos(), minYorum: 100 }), ['a', 'c']);
  assert.deepEqual(ele(KAYITLAR, { ...bos(), minYorum: 300 }), ['a']);
});

test('deneyim kırılımı', () => {
  assert.deepEqual(ele(KAYITLAR, { ...bos(), minDeneyim: 5 }), ['a', 'c']);
  assert.deepEqual(ele(KAYITLAR, { ...bos(), minDeneyim: 10 }), ['a']);
});

test('fiyat kırılımı ÜST sınır — bütçeyi aşan elenir', () => {
  assert.deepEqual(ele(KAYITLAR, { ...bos(), maxFiyat: 25000 }), ['b', 'c', 'd']);
  assert.deepEqual(ele(KAYITLAR, { ...bos(), maxFiyat: 10000 }), ['b', 'd']);
});

test('tür kırılımı', () => {
  assert.deepEqual(ele(KAYITLAR, { ...bos(), tur: 'salon' }), ['b', 'd']);
  assert.deepEqual(ele(KAYITLAR, { ...bos(), tur: 'independent' }), ['a', 'c']);
});

test('AYNA Onaylı kırılımı — alan yoksa elenir', () => {
  assert.deepEqual(ele(KAYITLAR, { ...bos(), onayliMi: true }), ['a', 'c']);
  // `aynaVerified` eski kayıtlarda tanımsız gelebiliyor; false gibi
  // davranmalı, "undefined truthy değil" diye sessizce geçmemeli.
  assert.deepEqual(ele(KAYITLAR, { ...bos(), onayliMi: false }).length, 4);
});

// ── 2. Kırılımlar BİRLİKTE ──

test('kırılımlar kesişiyor, birbirini ezmiyor', () => {
  assert.deepEqual(ele(KAYITLAR, { ...bos(), sehir: 'Almatı', minPuan: 4.5, onayliMi: true }), [
    'a',
  ]);
  // Çelişen kırılım boş sonuç vermeli — sessizce gevşememeli.
  assert.deepEqual(ele(KAYITLAR, { ...bos(), minPuan: 4.8, maxFiyat: 10000 }), []);
});

test('"Farketmez" seçimi o kırılımı gerçekten kapatıyor', () => {
  const dar: Filtre = { ...bos(), sehir: 'Almatı', minPuan: 4.5, minYorum: 300 };
  assert.deepEqual(ele(KAYITLAR, dar), ['a']);
  assert.deepEqual(ele(KAYITLAR, { ...dar, minYorum: null }), ['a']);
  assert.deepEqual(ele(KAYITLAR, { ...dar, minPuan: null, minYorum: null }), ['a', 'b']);
});

// ── 3. Ekran bağı ──

test('panel yedi kırılımı da çiziyor', () => {
  for (const anahtar of [
    'search.filter.city',
    'search.filter.rating',
    'search.filter.reviews',
    'search.filter.experience',
    'search.filter.price',
    'search.filter.kind',
    'search.filter.verified_only',
    'search.filter.bookings',
  ]) {
    assert.ok(ekran.includes(`'${anahtar}'`), `panelde "${anahtar}" kırılımı yok`);
    assert.ok(sozluk.includes(`'${anahtar}':`), `"${anahtar}" TR sözlükte yok`);
  }
});

test('eleme koşulları ekranda duruyor', () => {
  // Kopya mantığın ekrandan ayrışmasını yakalar: koşul ekrandan silinirse
  // buradaki testler hâlâ geçer ama uygulama filtrelemez.
  for (const kosul of [
    'filtre.sehir !== null && p.city !== filtre.sehir',
    'filtre.minPuan !== null && p.rating < filtre.minPuan',
    'p.completedBookings < filtre.minRandevu',
    'filtre.minYorum !== null && p.reviewCount < filtre.minYorum',
    'filtre.minDeneyim !== null && p.experienceYears < filtre.minDeneyim',
    'filtre.maxFiyat !== null && p.priceFrom > filtre.maxFiyat',
    'filtre.tur !== null && p.kind !== filtre.tur',
    'filtre.onayliMi && !p.aynaVerified',
  ]) {
    assert.ok(ekran.includes(kosul), `ekranda eleme koşulu yok: ${kosul}`);
  }
});

test('filtre sonucu yeniden hesaplanıyor', () => {
  // `filtre` bağımlılık dizisinde yoksa çipe basmak listeyi değiştirmez —
  // panel çalışıyor görünür ama sonuç donuk kalır.
  assert.match(
    ekran,
    /\}, \[professionals, query, activeCat, sort, city, filtre, t\]\);/,
    'useMemo bağımlılıklarında `filtre` yok',
  );
});

test('etkin kırılım sayısı düğmede görünüyor', () => {
  assert.match(ekran, /function etkinSayisi\(/, 'etkin sayısı hesaplanmıyor');
  assert.match(ekran, /styles\.tuneRozet/, 'düğmede sayı rozeti yok');
  // Temizleme yolu olmalı: yedi kırılımı tek tek geri almak işkence.
  assert.match(ekran, /setFiltre\(bosFiltre\(city\)\)/, 'filtreleri temizleme yok');
});

test('çipler kategori çipleriyle AYNI dili kullanıyor', () => {
  // Yeni bir görsel dil uydurulmadığının bekçisi: filtre çipi de
  // `styles.chip` + `styles.chipOn` kullanıyor.
  assert.match(
    ekran,
    /function FiltreCipi\([\s\S]{0,600}styles\.chip, secili && styles\.chipOn/,
    'filtre çipi mevcut çip dilini kullanmıyor',
  );
});

/*
 * İLK SÜRÜMÜN HATASI: kırılımlar sayfaya gömülü bir panelde açılıyordu,
 * yedi grup ekranın tamamını yiyordu ve paneli kapatıp sonuca dönmenin
 * DÜĞMESİ YOKTU. Kurucu: "arama yapacağın bir buton bile görünmüyor."
 * Aşağıdakiler o hatanın geri gelmesini engelliyor.
 */

test('kırılımlar ALT SAYFADA açılıyor, sayfayı yemiyor', () => {
  assert.match(ekran, /<Modal\n\s+visible=\{showSort\}/, 'filtreler alt sayfada değil');
  assert.match(ekran, /styles\.perde/, 'perde yok — neyin geçici olduğu belirsiz');
  assert.match(ekran, /maxHeight: '85%'/, 'alt sayfa ekranın tamamını kaplıyor');
});

test('SONUÇLARA DÖNDÜREN düğme var ve sayıyı yazıyor', () => {
  assert.match(ekran, /styles\.sayfaEylem/, 'sabit eylem alanı yok');
  assert.match(ekran, /'search\.filter\.apply'/, 'sonuç gösterme düğmesi yok');
  assert.match(ekran, /onPress=\{\(\) => setShowSort\(false\)\}/, 'düğme paneli kapatmıyor');
  // Sıfır sonuçta düğme kapalı olmalı: boş listeye döndürmek yanıltıcı.
  assert.match(ekran, /disabled=\{results\.length === 0\}/, 'boş sonuçta düğme kapanmıyor');
  assert.ok(sozluk.includes("'search.filter.apply':"), 'düğme metni sözlükte yok');
  assert.ok(sozluk.includes("'search.filter.no_result':"), 'boş sonuç metni yok');
});

test('düğme ScrollView DIŞINDA — kaydırınca kaybolmuyor', () => {
  const i = ekran.indexOf('styles.sayfaGovde');
  const kapanis = ekran.indexOf('</ScrollView>', i);
  const eylem = ekran.indexOf('styles.sayfaEylem', i);
  assert.ok(eylem > kapanis, 'eylem düğmesi kaydırma alanının içinde');
});

test('kırılımlar AÇILIR SATIR — hepsi birden açık değil', () => {
  /*
   * İki sürüm kalabalık kaldı: yatay şerit (seçenekler kesiliyordu) ve
   * hepsi açık sarmalı çipler (23 şehir tek başına ekranı dolduruyordu).
   * Kurucu: "seçim alanları çok kalabalık, açılır menü şeklinde olsun."
   */
  assert.match(ekran, /function FiltreSatiri\(/, 'kırılımlar açılır satır değil');
  assert.match(ekran, /const \[acikGrup, setAcikGrup\]/, 'açık grup durumu yok');
  // Tek seferde tek grup: aynı ada basmak kapatır, başkası açılınca öteki kapanır.
  assert.match(
    ekran,
    /setAcikGrup\(\(v\) => \(v === ad \? null : ad\)\)/,
    'tek seferde tek grup açılmıyor',
  );
  // Kapalıyken seçenekler ÇİZİLMEMELİ — yoksa kalabalık geri gelir.
  assert.match(
    ekran,
    /\{acik \? <View style=\{styles\.satirCipler\}>\{children\}<\/View> : null\}/,
    'kapalı satır seçenekleri gizlemiyor',
  );
  // Açılan seçenekler yine sarmalı: kesilmesin.
  assert.match(ekran, /satirCipler: \{[\s\S]{0,80}flexWrap: 'wrap'/, 'açılan çipler sarmıyor');
});

test('kapalı satır seçili değeri yazıyor', () => {
  // Kullanıcı neyi seçtiğini görmek için satırı açmak zorunda kalmamalı.
  assert.match(
    ekran,
    /deger=\{filtre\.sehir \?\? t\('search\.filter\.all_cities'\)\}/,
    'şehir satırı seçili değeri göstermiyor',
  );
  assert.match(ekran, /function turEtiketi\(/, 'tür satırı birleşik değeri göstermiyor');
});

test('FİLTRE DE BİR ARAMADIR — sonuç listesi çiziliyor', () => {
  /*
   * Kurucunun bildirdiği hata: "sonuçları göster butonuna basınca
   * çalışmıyor." Düğme paneli kapatıyordu ama ekran, arama kutusu boş diye
   * SONUÇ DEĞİL "son aramalar" kutusunu çiziyordu — filtreler `isEmpty`
   * hesabına girmiyordu.
   */
  assert.match(
    ekran,
    /const isEmpty =\s*query\.trim\(\)\.length === 0 && activeCat === null && etkin === 0;/,
    'etkin filtre varken boş ekran gösteriliyor',
  );
});

test('şehir listesi merkezi taksonomiden geliyor', () => {
  // Elle yazılmış şehir listesi zamanla ayrışır.
  assert.match(ekran, /\{CITIES\.map\(/, 'şehirler CITIES sabitinden gelmiyor');
});
