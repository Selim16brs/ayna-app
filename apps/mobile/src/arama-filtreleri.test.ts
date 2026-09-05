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

/**
 * Kaynağın YORUMSUZ hâli.
 *
 * "Şu alan artık kullanılmıyor" testleri ham metne bakarsa, kaldırma
 * GEREKÇESİNİ anlatan yorum da eşleşir ve test kendi açıklamasına takılır
 * (ilk yazımda tam bu oldu). Blok yorumlar ve satır yorumları atılıyor;
 * `://` gibi dizi içi kalıpları bozmamak için yalnız SATIR BAŞINDAKİ `//`
 * ve `*` işaretleri siliniyor.
 */
const yorumsuz = (k: string) =>
  k
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((l) => {
      const t = l.trim();
      return !t.startsWith('//') && !t.startsWith('*');
    })
    .join('\n');

const ekranKod = yorumsuz(ekran);

// ── Test verisi: gerçek `Professional` alanlarının ilgili altkümesi ──
interface Kayit {
  id: string;
  city: string;
  rating: number;
  reviewCount: number;
  /** Sunucudan gelen TAMAMLANAN randevu sayısı. */
  completedBookings?: number;
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
    priceFrom: 9000,
    kind: 'salon',
  },
  {
    id: 'c',
    city: 'Astana',
    rating: 4.6,
    reviewCount: 110,
    completedBookings: 180,
    priceFrom: 22000,
    kind: 'independent',
    aynaVerified: true,
  },
  {
    id: 'd',
    city: 'Şımkent',
    rating: 3.8,
    reviewCount: 15,
    priceFrom: 5000,
    kind: 'salon',
  },
];

interface Filtre {
  sehir: string | null;
  minPuan: number | null;
  minRandevu: number | null;
  minYorum: number | null;
  maxFiyat: number | null;
  tur: 'salon' | 'independent' | null;
  onayliMi: boolean;
}

const bos = (sehir: string | null = null): Filtre => ({
  sehir,
  minPuan: null,
  minRandevu: null,
  minYorum: null,
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

test('panel altı kırılımı da çiziyor', () => {
  for (const anahtar of [
    'search.filter.city',
    'search.filter.rating',
    'search.filter.reviews',
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
    // Şehir artık NORMALLEŞTİRİLMİŞ karşılaştırılıyor: haritadan gelen
    // 'Алматы' ile seçicideki 'Almatı' aynı şehir (bkz. sehir-eslesmesi.test).
    'filtre.sehir !== null && !sehirEslesir(p.city, filtre.sehir)',
    'filtre.minPuan !== null && p.rating < filtre.minPuan',
    'p.completedBookings < filtre.minRandevu',
    'filtre.minYorum !== null && p.reviewCount < filtre.minYorum',
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
  // Değer artık `sehirGoster` ile YERELLEŞTİRİLİYOR: Rusça arayüzde
  // "Almatı" yazıyordu. Test ifadenin harfine değil, iki güvenceye bakıyor:
  // (1) seçili şehir kapalı satırda yazılı, (2) seçim yokken "tüm şehirler".
  assert.match(
    ekran,
    /deger=\{[\s\S]{0,120}filtre\.sehir[\s\S]{0,120}t\('search\.filter\.all_cities'\)/,
    'şehir satırı seçili değeri göstermiyor',
  );
  assert.match(
    ekran,
    /sehirGoster\(filtre\.sehir, locale\)/,
    'şehir adı yerelleştirilmiyor — ru arayüzde Türkçe yazım görünür',
  );
  // FİLTRE DEĞERİ kanonik kalmalı: çevrilmiş ad `sehirEslesir`e girerse
  // uzmanlar sessizce görünmez olur (bu modülün var oluş sebebi olan hata).
  assert.match(
    ekran,
    /sehirEslesir\(p\.city, filtre\.sehir\)/,
    'filtre kanonik şehirle eşleşmiyor',
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
    /const isEmpty =\s*query\.trim\(\)\.length === 0 && activeCat === null && etkin === 0 && !gozat;/,
    'etkin filtre varken boş ekran gösteriliyor',
  );
});

/*
 * GEZİNME MODU — "Randevu Al" kartından geliş.
 *
 * Kurucu: "ilk açılan ekran Randevu Al kısmında başka bir search alanı...
 * bunu direkt Randevu Al butonuna basınca çıkacak şekilde yapalım."
 *
 * Keşfet'te zaten arama kutusu var; bu kart ikincisini açmamalı. Ama filtre
 * penceresini BOŞ ekranın üstüne açmak da yanlış olurdu — düğmede "N sonucu
 * göster" yazarken arkada hiçbir şey olmaması kafa karıştırır. Üç şey birden
 * olmalı: klavye yok, sonuçlar var, pencere açık.
 */

test('Randevu Al kartı GEZİNME moduyla açıyor', () => {
  const kesfet = readFileSync(join(kok, 'app/(tabs)/discover.tsx'), 'utf8');
  assert.match(
    kesfet,
    /etiket: 'home\.qa\.book' as MessageKey,[\s\S]{0,400}yol: '\/search\?mod=gozat' as const/,
    'Randevu Al kartı gezinme moduyla gitmiyor',
  );
});

test('gezinme modunda klavye AÇILMIYOR', () => {
  // Kullanıcı yazmaya değil seçmeye geldi; klavye ekranın yarısını yiyordu.
  assert.match(ekran, /if \(gozat\) return;/, 'gezinme modunda odak engellenmiyor');
  assert.match(ekran, /autoFocus=\{!gozat\}/, 'gezinme modunda autoFocus kapalı değil');
});

test('gezinme modunda filtre penceresi AÇIK başlıyor', () => {
  assert.match(
    ekran,
    /const \[showSort, setShowSort\] = useState\(gozat\);/,
    'gezinme modunda pencere açık gelmiyor',
  );
});

test('gezinme modunda arkada SONUÇ var, boş kutu değil', () => {
  // Aksi hâlde "N sonucu göster" düğmesi hiçbir şeyin üstünde durur.
  assert.ok(/const isEmpty =[^;]*&& !gozat;/.test(ekran), 'gezinme modunda boş kutu gösteriliyor');
});

test('BEYANA dayalı kırılım YOK — deneyim kaldırıldı', () => {
  /*
   * Kurucu: "uzman deneyimini koymak mantıklı mı, uzman bunu kafasına göre
   * yazabilir kendini daha eski göstermek isteyebilir."
   *
   * `experienceYears` uzmanın kayıtta kendi yazdığı sayı; doğrulayan hiçbir
   * mekanizma yok. Aramayı doğrulanamayan bir beyana göre daraltmak
   * kullanıcıyı yanlış yönlendirir. Yerine sistemin kendi kaydı olan
   * `completedBookings` var.
   */
  assert.ok(!ekranKod.includes('experienceYears'), 'beyana dayalı deneyim kırılımı geri gelmiş');
  assert.ok(!ekranKod.includes('minDeneyim'), 'deneyim filtresi geri gelmiş');
  assert.ok(!sozluk.includes("'search.filter.experience':"), 'deneyim metni sözlükte kalmış');
});

test('her kırılım DOĞRULANABİLİR bir veriye dayanıyor', () => {
  /*
   * Kalan altı kırılımın kaynağı:
   *   şehir            → kayıtta seçilir, haritayla tutarlı
   *   puan / yorum     → Rating tablosu (yalnız tamamlanmış randevudan)
   *   tamamlanan rand. → Booking sayımı (sistem kaydı)
   *   fiyat            → uzmanın gerçek hizmet listesi
   *   tür / onaylı     → kayıt tipi ve doğrulama bayrakları
   * Hiçbiri serbest metin beyanı değil.
   */
  for (const alan of [
    'p.city',
    'p.rating',
    'p.reviewCount',
    'p.completedBookings',
    'p.priceFrom',
    'p.kind',
    'p.aynaVerified',
  ]) {
    assert.ok(ekran.includes(alan), `kırılım alanı ekranda yok: ${alan}`);
  }
});

test('şehir listesi merkezi taksonomiden geliyor', () => {
  // Elle yazılmış şehir listesi zamanla ayrışır.
  assert.match(ekran, /\{CITIES\.map\(/, 'şehirler CITIES sabitinden gelmiyor');
});
