import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

const yorumsuz = (k: string) =>
  k.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
const oku = (...p: string[]) => yorumsuz(readFileSync(join(__dirname, '..', ...p), 'utf8'));
const api = (...p: string[]) =>
  yorumsuz(readFileSync(join(__dirname, '..', '..', 'api', 'src', ...p), 'utf8'));

/**
 * PROMOSYONLAR — uzmanın kendi kampanyaları.
 *
 * Kurucu: "uzman panelinden oluşturulan promosyonlar, fırsatlar alanında
 * gösterilmesin… ayrı bir sekmede müşteriye promosyonlar alanı
 * gösterilmeli, en yakın lokasyondaki 4 promosyon ekranda görünüp
 * diğerleri için tümü butonu olmalı ve açılan ekranda yakınlık,
 * değerlendirme ve puan gibi filtreli şekilde gösterilmeli."
 */

test('UZMAN KAMPANYALARI "Fırsatlar" şeridinde DEĞİL', () => {
  /*
   * "Fırsatlar" ve "Senin için seçtiklerim" ÖDENMİŞ vitrin. Uzmanın
   * üyeliğiyle gelen hakkı aynı şeritte göstermek, ödeyenin satın aldığı
   * yeri ücretsiz dağıtmak olurdu.
   */
  /*
   * Dilim KOD işaretlerinden: bölüm başlıkları yorum içinde ve bu dosya
   * yorumları söküyor. Yorumdan dilimleseydim sınır bulunamaz, dilim
   * dosyanın tamamına açılır ve test sessizce anlamsızlaşırdı.
   */
  const d = oku('app', '(tabs)', 'discover.tsx');
  const bas = d.indexOf("t('home.campaigns')");
  const son = d.indexOf("t('promos.title')");
  assert.ok(bas > 0 && son > bas, 'fırsatlar bölümü bulunamadı');
  const firsatlar = d.slice(bas, son);
  assert.doesNotMatch(firsatlar, /offers\.slice/, 'uzman kampanyaları hâlâ fırsatlarda');
  // Bölümün görünme koşulundan da çıkarıldı: yoksa boş bir başlık kalırdı.
  assert.doesNotMatch(
    d,
    /offers\.length > 0 \|\| campaigns\.length > 0/,
    'koşul hâlâ offers okuyor',
  );
});

test('ANA EKRANDA en yakın DÖRT promosyon + Tümü', () => {
  const d = oku('app', '(tabs)', 'discover.tsx');
  assert.match(
    d,
    /promosyonlariSirala\(promosyonlar, 'yakinlik'\)\.slice\(0, ANA_EKRAN_PROMOSYON\)/,
    'en yakınlar seçilmiyor',
  );
  assert.match(d, /onSeeAll=\{\(\) => router\.push\('\/promotions'\)\}/, '"Tümü" yolu yok');
});

test('TÜMÜ ekranı FİLTRELİ', () => {
  const k = oku('app', 'promotions.tsx');
  for (const s of ['yakinlik', 'puan', 'indirim']) {
    assert.ok(k.includes(`'${s}'`), `${s} filtresi yok`);
  }
  assert.match(k, /promosyonlariSirala\(promosyonlar, sira\)/, 'sıralama uygulanmıyor');
});

test('SUNUCU onaysız uzmanın promosyonunu göstermiyor', () => {
  /*
   * Katalogdan gizlenen bir hesap promosyon üzerinden vitrine
   * sızmamalı.
   */
  const k = api('catalog', 'catalog.service.ts');
  const govde = k.slice(k.indexOf('async promotions('), k.indexOf('async professionals()'));
  assert.match(govde, /status: \{ not: 'approved' \}/, 'onay kapısı promosyonlarda yok');
  assert.match(govde, /hiddenUntil: \{ gt: simdi \}/, 'görünmezlik cezası promosyonlarda yok');
  assert.match(govde, /if \(gizli\.has\(o\.proId\)\) continue;/, 'gizli sağlayıcı süzülmüyor');
});

test('SUNUCU uydurma mesafe ve puan ÜRETMİYOR', () => {
  const k = api('catalog', 'catalog.service.ts');
  const govde = k.slice(k.indexOf('async promotions('), k.indexOf('async professionals()'));
  // Koordinatı olmayan sağlayıcıda mesafe null.
  assert.match(
    govde,
    /p\.lat != null && p\.lng != null\s*\?\s*mesafeKm/,
    'mesafe koşulsuz hesaplanıyor',
  );
  // Değerlendirilmemiş uzman "0,0" değil.
  assert.match(
    govde,
    /p\.reviewCount > 0 \? Number\(p\.rating\) : null/,
    'puansız uzman 0 gösteriliyor',
  );
});

test('KAMPANYA GÖRSELİ uzman ekranında EKLENEBİLİYOR', () => {
  /*
   * Kurucu: "uzman kendi ekranından promosyon girerken promosyon
   * fotoğrafını ekleyeceği bir alan yok o yüzden müşteri ekranında
   * fotoğraf çıkmıyor."
   *
   * Sunucu görseli ZATEN kabul ediyordu; eksik olan tek şey alandı.
   */
  const k = oku('app', 'seller', 'offers.tsx');
  assert.match(k, /const gorselSec = async/, 'görsel seçme yok');
  assert.match(k, /imageDataUrl: gorsel/, 'görsel gönderilmiyor');
  assert.match(api('offers', 'offers.dto.ts'), /imageDataUrl/, 'sunucu görsel kabul etmiyor');
});

test('PROMOSYON GÖRSELİ ham base64 olarak SAKLANMIYOR', () => {
  /*
   * `promo_json` içine ham base64 yazmak satırı megabaytlara şişirir ve
   * o satır işletme profilinin HER okumasında taşınır.
   */
  const k = api('specialists', 'specialists.service.ts');
  assert.match(
    k,
    /this\.storage\.put\(p\.imageUri, 'promos'\)/,
    'promosyon görseli depoya gitmiyor',
  );
});

test('UZMAN kendi profilini MÜŞTERİ GÖZÜYLE görebiliyor', () => {
  const menu = oku('app', 'seller', 'menu.tsx');
  assert.match(menu, /route: '\/seller\/preview'/, 'önizleme menüde yok');
  const k = oku('app', 'seller', 'preview.tsx');
  /*
   * Ekran AYRI BİR KOPYA DEĞİL: müşterinin gördüğü sayfaya
   * yönlendiriyor. Kopya bir önizleme ikisini zamanla ayrıştırırdı.
   */
  assert.match(k, /router\.replace\(`\/professional\/\$\{proId\}`/, 'gerçek sayfaya gitmiyor');
  assert.match(k, /seller\.menu\.preview_none/, 'kartı olmayan uzmana sebep söylenmiyor');
});

test('BAŞARI YÜZDESİ sunucudan ve veri yoksa UYDURULMUYOR', () => {
  const k = oku('app', 'seller', 'reports.tsx');
  assert.match(k, /api\s*\.myPerformance\(token\)/, 'başarı yüzdesi çekilmiyor');
  assert.match(k, /basari\?\.yuzde === null \|\| basari === null/, 'veri yokken yüzde yazılıyor');
  assert.match(k, /reports\.success\.none/, 'sebep söylenmiyor');
  // Bileşenler ayrı ayrı: uzman "neden %70" sorusunun cevabını görmeli.
  assert.match(k, /basari\.bilesenler\.map/, 'bileşenler gösterilmiyor');
});

test('HER UZMANIN keşif kartı var — salona bağlı olsa bile', () => {
  /*
   * Kurucu: "salona bağlı uzman ile salona bağlı olmayan uzman arasındaki
   * tek fark bağlı olup olmamaları. onun dışında her şey işleyiş olarak
   * aynı olmalı."
   *
   * Kart YALNIZ bağımsız uzmana açılıyordu. Sonuçları zincirleme:
   * hizmetleri hiçbir yere yazılmıyor, profili açılmıyor, haritada
   * görünmüyor, yorumları bağlanamıyordu.
   */
  const k = api('specialists', 'specialists.service.ts');
  const kayit = k.slice(
    k.indexOf('const hizmetler = hizmetSatirlariniNormalle'),
    k.indexOf('async myReviews'),
  );
  assert.doesNotMatch(
    kayit,
    /if \(input\.kind === 'independent'\) \{/,
    'kart hâlâ yalnız bağımsıza açılıyor',
  );
  assert.match(kayit, /professional\.create\(/, 'keşif kartı oluşturulmuyor');
});

test('HİZMET KAYDI sessizce başarısız OLMUYOR', () => {
  /*
   * `{ services: [] }` dönüyordu: keşif kartı olmayan uzman hizmetlerini
   * kaydediyor, ekran "kaydedildi" diyor, hiçbir yere yazılmıyordu.
   * Kurucu bunu "hizmet ekliyorum ama müşteri görmüyor" diye bildirdi.
   */
  const k = api('specialists', 'specialists.service.ts');
  const govde = k.slice(
    k.indexOf('async setMyServices('),
    k.indexOf('async setMyServices(') + 1200,
  );
  assert.match(govde, /NO_DISCOVERY_CARD/, 'kartsız uzmanda sessizce boş dönüyor');
});

test('YAKINDAKİ SALONLAR ve UZMANLAR AYRI bölümler', () => {
  const d = oku('app', '(tabs)', 'discover.tsx');
  assert.match(d, /home\.nearby_experts/, 'uzmanlar bölümü yok');
  assert.match(d, /nearbySalons\.map/, 'salon listesi yok');
  assert.match(d, /nearbyExperts\.map/, 'uzman listesi yok');
  /*
   * HER İKİ liste de en fazla 3. Tek bir `.slice(0, 3)` aramak yetmiyordu:
   * birini kaldıran bir değişiklik diğerinin eşleşmesiyle geçiyordu
   * (mutasyonla göründü).
   */
  const salonBlok = d.slice(d.indexOf('const nearbySalons'), d.indexOf('const nearbyExperts'));
  const uzmanBlok = d.slice(
    d.indexOf('const nearbyExperts'),
    d.indexOf('const nearbyExperts') + 300,
  );
  assert.match(salonBlok, /\.slice\(0, 3\)/, 'salon listesinde ilk 3 sınırı yok');
  assert.match(uzmanBlok, /\.slice\(0, 3\)/, 'uzman listesinde ilk 3 sınırı yok');
  // "Tümü" iki bölümde de var.
  assert.match(d, /router\.push\('\/nearby'\)/, 'salonlar için tümü yok');
  assert.match(d, /router\.push\('\/nearby\?tur=uzman'\)/, 'uzmanlar için tümü yok');
  // Satır ORTAK bileşenden: kopyalasaydık ikisi zamanla ayrışırdı.
  assert.match(d, /function SaglayiciSatiri/, 'ortak satır bileşeni yok');
});

test('SIRALAMA sunucudan — başarıya göre', () => {
  /*
   * Kurucu: "ilk 3 görünmeli (başarı durumuna göre)."
   *
   * Sıralama sunucuda; istemci ilk üçü alıyor. İki yerde iki farklı
   * kural olsaydı liste ile "Tümü" ekranı farklı sıralanırdı.
   */
  const k = api('catalog', 'catalog.service.ts');
  assert.match(
    k,
    /\.sort\(\(a, b\) => b\.basariSirasi - a\.basariSirasi\)/,
    'liste başarıya göre sıralanmıyor',
  );
  assert.match(k, /uzmanBasarisi\(\{/, 'başarı hesabı kullanılmıyor');
  // Müşteriye yüzde YAZILMIYOR: uzmanın panelindeki yüzdeyle çelişirdi.
  assert.doesNotMatch(
    oku('app', '(tabs)', 'discover.tsx'),
    /basariSirasi/,
    'yüzde müşteriye gösteriliyor',
  );
});
