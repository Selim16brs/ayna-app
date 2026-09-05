import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { medyaAnahtari } from './media-cache';
import { portreKesilmisMi, portreSec } from './portre';

/**
 * EKRANDA UYDURMA BİLGİ OLMAYACAK.
 *
 * Kurucu: "üyelik 2024 yazıyor ne alaka. yanlış bilgi. uydurma bilgiler
 * olmamalı." Pasaportta üyelik yılı SABİT `2024` yazıyordu ve sadakat
 * seviyesi puanı ne olursa olsun "Gümüş" görünüyordu.
 *
 * Bu testler o iki alanın GERÇEK veriye bağlı kaldığını ve veri yoksa
 * uydurulmadığını denetliyor.
 */

const oku = (...p: string[]) => readFileSync(join(__dirname, '..', ...p), 'utf8');
const pasaport = oku('app', 'profile', 'passport.tsx');

test('PASAPORTTA sabit üyelik yılı YOK', () => {
  const govde = pasaport.slice(pasaport.indexOf('passport.member_since'));
  assert.doesNotMatch(
    govde.slice(0, 400),
    />\s*(19|20)\d\d\s*</,
    'üyelik yılı ekrana sabit yazılmış',
  );
  assert.match(
    pasaport,
    /new Date\(memberSinceMs\)\.getFullYear\(\)/,
    'yıl gerçek tarihten gelmiyor',
  );
});

test('ÜYELİK TARİHİ YOKSA satır hiç çizilmiyor', () => {
  /*
   * Sunucu tarihi dönmezse "bugünün yılı" ya da başka bir varsayılan
   * yazmak, kullanıcının hesabı hakkında yanlış bilgi vermek olurdu.
   */
  assert.match(pasaport, /memberSinceMs !== null \? \(/, 'tarih yokken satır yine çiziliyor');
  assert.match(pasaport, /Number\.isFinite\(ms\) \? ms : null/, 'bozuk tarih sayı gibi işleniyor');
});

test('SADAKAT SEVİYESİ sabit değil, sunucudan', () => {
  assert.doesNotMatch(pasaport, /t\('rewards\.tier\.silver'\)/, 'seviye "Gümüş"e çakılı');
  assert.match(
    pasaport,
    /tier \? t\(TIER_LABEL\[tier\.key\]\)/,
    'seviye gerçek anahtardan gelmiyor',
  );
});

test('SUNUCU hesabın açılış tarihini dönüyor', () => {
  // Zincirin sunucu ucu: alan dönmezse ekran satırı hiç göstermez ve
  // kurucu "üyelik bilgisi kayboldu" der. Üç halka da bağlı olmalı.
  const auth = readFileSync(
    join(__dirname, '..', '..', 'api', 'src', 'auth', 'auth.service.ts'),
    'utf8',
  );
  assert.match(auth, /memberSince: user\.createdAt\.toISOString\(\)/, 'sunucu tarihi dönmüyor');
  const api = oku('src', 'api.ts');
  assert.match(api, /memberSince\?: string \| null;/, 'istemci tipinde alan yok');
});

// ── KESİK PORTRENİN BAĞI ────────────────────────────────────────────────

test('SOĞUK AÇILIŞTA portre bağı geri yükleniyor', () => {
  /*
   * Kurucu: "profil fotoğrafı kesiliyor ama uygulama açılıp kapanınca
   * yeniden daire içine giriyor." Önbellek `cutoutFor`u saklıyor ama
   * geri YAZMIYORDU; bağ kopunca kesik bayat sayılıp ham fotoğrafa
   * düşülüyor ve daire geri geliyordu.
   */
  const store = oku('src', 'store.ts');
  const geriYukle = store.slice(store.indexOf('loadMediaCache(uid).then'));
  assert.match(
    geriYukle.slice(0, 1200),
    /cur\.cutoutFor == null && m\.cutoutFor \? \{ cutoutFor: m\.cutoutFor \}/,
    'önbellekteki portre bağı geri yüklenmiyor',
  );
});

test('GİRİŞTE sunucudaki kesik portrenin bağı kuruluyor', () => {
  const store = oku('src', 'store.ts');
  // DİKKAT: `markPhoneVerified` dosyada DAHA ÖNCE (tip tanımında) geçiyor;
  // ona kadar dilimlemek boş metin veriyor ve test hep "yok" derdi.
  const bas = store.indexOf('setAuth: (session) => {');
  const setAuth = store.slice(bas, store.indexOf('markPhoneVerified:', bas));
  assert.ok(setAuth.length > 200, 'setAuth gövdesi bulunamadı — test yanlış yeri okuyor');
  const yeniUye = setAuth.slice(
    setAuth.indexOf('userScopedReset()'),
    setAuth.indexOf('setApiToken'),
  );
  assert.ok(
    /cutoutFor:/.test(yeniUye) && /medyaAnahtari\(session\.user\.avatarUrl\)/.test(yeniUye),
    'yeni girişte bağ kurulmuyor',
  );
  assert.match(
    setAuth,
    /cutoutFor: medyaAnahtari\(session\.user\.avatarUrl\)/,
    'aynı kullanıcı girişinde bağ kurulmuyor',
  );
});

test('BAYAT KESİK koruması hâlâ çalışıyor', () => {
  /*
   * Bağı geri yüklerken tazelik kuralını gevşetmediğimizi doğruluyoruz:
   * fotoğraf değişmişse eski kesik HÂLÂ elenmeli.
   *
   * `cutoutFor` ham adres değil, adresin ÖZETİ. Fikstürde ham metin
   * yazsaydım test hiçbir zaman eşleşmez ve "koruma çalışıyor" derken
   * aslında hep bayat dalını sınardı.
   */
  const fotoA = 'https://ornek/foto-a.jpg';
  const fotoB = 'https://ornek/foto-b.jpg';
  const guncel = { cutoutUri: 'kesik', cutoutFor: medyaAnahtari(fotoA), avatarUri: fotoA };
  assert.equal(portreSec(guncel), 'kesik');
  assert.equal(portreKesilmisMi(guncel), true);

  const bayat = { cutoutUri: 'kesik', cutoutFor: medyaAnahtari(fotoA), avatarUri: fotoB };
  assert.equal(portreSec(bayat), fotoB, 'bayat kesik hâlâ gösteriliyor');
  assert.equal(portreKesilmisMi(bayat), false);

  const bagsiz = { cutoutUri: 'kesik', cutoutFor: null, avatarUri: fotoA };
  assert.equal(portreKesilmisMi(bagsiz), false, 'bağsız kesik kesilmiş sayılıyor');
});

test('PASAPORT kesilmiş portreyi daireye sokmuyor', () => {
  assert.match(
    pasaport,
    /portreKesilmis \? styles\.portre : styles\.avatar/,
    'portre her hâlde daire',
  );
  assert.match(
    pasaport,
    /resizeMode=\{portreKesilmis \? 'contain' : 'cover'\}/,
    'kesik portre kırpılıyor',
  );
});

test('DEĞERLENDİRİLMEMİŞ uzman "0,0" DEĞİL — her ekranda', () => {
  /*
   * Sunucu hiç yorumu olmayan uzmanın puanını 0 döndürüyor (`rating:
   * puanByPro.get(r.id)?.ortalama ?? 0`). Ekranların bir kısmı bunu
   * yıldızla "0.0" diye yazıyordu: müşteri, kimsenin puan vermediği
   * uzmanı EN KÖTÜ puanlı sanıyordu. Keşif satırı ve harita detayı
   * doğruyu yapıyordu, arama satırı / harita iğne kartı / uzman profili
   * yapmıyordu.
   *
   * Kural: puan YALNIZ `reviewCount > 0` iken sayı olarak yazılır.
   */
  for (const yol of [
    ['app', 'search.tsx'],
    ['app', 'map.tsx'],
    ['app', 'professional', '[id].tsx'],
    ['app', '(tabs)', 'discover.tsx'],
  ]) {
    const k = oku(...yol);
    for (const m of k.matchAll(/(\w+)\.rating\.toFixed\(1\)/g)) {
      const nesne = m[1]!;
      // Sayının HEMEN üstünde o nesnenin yorum sayısı sorulmuş olmalı.
      const once = k.slice(Math.max(0, m.index! - 600), m.index!);
      assert.ok(
        new RegExp(`${nesne.replace('[', '\\[')}\\.reviewCount > 0`).test(once),
        `${yol.join('/')}: ${nesne}.rating yorum sayısı sorulmadan yazılıyor`,
      );
    }
  }
});

test('YORUMSUZ uzmanın ortalaması ÇİZGİ — sıfır değil', () => {
  /*
   * Yorumlar sekmesindeki büyük ortalama da 0 yazıyordu. Hiç not yoksa
   * gösterilecek bir ortalama YOK; "—" bunu söylüyor, "0,0" yalan.
   */
  const k = oku('app', 'professional', '[id].tsx');
  assert.match(
    k,
    /\{pro\.reviewCount > 0 \? pro\.rating\.toFixed\(1\) : '—'\}/,
    'ortalama yorumsuzken de sayı yazıyor',
  );
});

test('FOTOĞRAFI OLMAYAN işletmeye BAŞKASININ fotoğrafı konmuyor', () => {
  /*
   * Admin onayında, fotoğraf yüklememiş her işletmenin kartına stok bir
   * Unsplash salon fotoğrafı konuyordu. Canlıdaki salonda görülen buydu:
   * müşteri, o işletmeye ait OLMAYAN bir mekânın fotoğrafını onun mekânı
   * sanıyordu. Uydurulmuş kanıtın en ağırı — yazı değil, fotoğraf.
   */
  const admin = readFileSync(
    join(__dirname, '..', '..', 'api', 'src', 'admin', 'admin.service.ts'),
    'utf8',
  );
  assert.doesNotMatch(admin, /imageUrl:[^\n]*\?\?\s*DEFAULT_PRO_IMAGE/, 'stok fotoğraf hâlâ var');
  assert.doesNotMatch(admin, /images\.unsplash\.com/, 'stok fotoğraf adresi duruyor');
  assert.match(admin, /imageUrl: b\.photos\[0\] \?\? '',/, 'boş bırakılmıyor');
});

test('FOTOĞRAF YOKSA kart BOŞ değil — sağlayıcının BAŞ HARFİ', () => {
  /*
   * Stok fotoğraf kalkınca `image` boş kalıyor; `<Image uri="">` sessiz
   * bir boşluk çiziyor ve kart bozuk görünüyor. Baş harf uydurma değil —
   * elimizdeki tek gerçek bilgi.
   */
  const bilesen = oku('src', 'ui', 'SaglayiciFoto.tsx');
  assert.match(bilesen, /if \(uri\) return <Image/, 'foto varken bileşen çizmiyor');
  assert.match(bilesen, /charAt\(0\)\.toLocaleUpperCase\('tr'\)/, 'baş harf alınmıyor');

  // Müşterinin sağlayıcıyı gördüğü ekranlar ham <Image> kullanmıyor.
  for (const [yol, alan] of [
    [['app', 'search.tsx'], 'pro'],
    [['app', '(tabs)', 'discover.tsx'], 'pro'],
    [['app', 'map.tsx'], 'selected'],
    [['app', 'professional', '[id].tsx'], 'pro'],
    [['app', 'booking', 'schedule.tsx'], 'pro'],
  ] as [string[], string][]) {
    const k = oku(...yol);
    assert.doesNotMatch(
      k,
      new RegExp(`<Image source=\\{\\{ uri: ${alan}\\.image \\}\\}`),
      `${yol.join('/')}: ham <Image> kalmış`,
    );
    assert.match(k, /<SaglayiciFoto/, `${yol.join('/')}: ortak bileşen kullanılmıyor`);
  }
});

test('TEKLİF MESAFESİ uydurulmuyor — kimlikten sayı üretilmiyor', () => {
  /*
   * Sunucu `distanceKm: estKm(q.id)` gönderiyordu: teklifin KİMLİK
   * DİZESİNDEN hesaplanan 1–9 km arası bir sayı. Müşteri kartta "3 km"
   * okuyor, üstelik "Yakınlık" sıralaması ve "Önerilen" skoru da bu sayıya
   * bakıyordu — yani sıralama kısmen rastgeleydi.
   */
  const svc = readFileSync(
    join(__dirname, '..', '..', 'api', 'src', 'quotes', 'quotes.service.ts'),
    'utf8',
  );
  assert.doesNotMatch(svc, /function estKm/, 'kimlikten mesafe üreten fonksiyon duruyor');
  assert.doesNotMatch(svc, /distanceKm:/, 'uydurma mesafe hâlâ gönderiliyor');
  assert.match(svc, /lat: pro\?\.lat \?\? null/, 'gerçek koordinat gönderilmiyor');

  // Ekran mesafeyi ORTAK kuraldan hesaplıyor ve bilinmiyorsa hiç yazmıyor.
  const ekran = oku('app', 'quote', 'results.tsx');
  assert.match(ekran, /saglayiciMesafesi\(o, sehir\)/, 'ortak kural kullanılmıyor');
  assert.match(ekran, /offer\.mesafeKm != null \? \(/, 'bilinmeyen mesafe yine yazılıyor');

  // Sıralama da bilinmeyeni "yakın" saymıyor.
  const data = oku('src', 'data.ts');
  assert.match(
    data,
    /\(a\.mesafeKm \?\? Infinity\) - \(b\.mesafeKm \?\? Infinity\)/,
    'bilinmeyen başa geçiyor',
  );
});

test('ROZET GERÇEK DOĞRULAMADAN — "verified" sütunu artık yok', () => {
  /*
   * `Professional.badge` sütunu şemada `@default(verified)`: kayıt olan
   * HERKES "doğrulanmış" doğuyor ve hiçbir doğrulama bu değeri
   * güncellemiyordu. Kartlarda rozet olarak çizilseydi — o kartlar hâlâ
   * kodda duruyor — hiç doğrulanmamış uzman doğrulanmış görünürdü.
   * Uydurulmuş güven işaretinin en pahalısı.
   *
   * Sunucu alanı artık hiç göndermiyor; kartlar KYC'ye bağlı
   * `aynaVerified`i okuyor ve doğrulanmamışa hiçbir şey çizmiyor —
   * "değil" damgası basmak da ayrı bir haksızlık olurdu.
   */
  const katalog = readFileSync(
    join(__dirname, '..', '..', 'api', 'src', 'catalog', 'catalog.service.ts'),
    'utf8',
  );
  assert.doesNotMatch(katalog, /^\s*badge: p\.badge,/m, 'uydurma rozet hâlâ gönderiliyor');

  for (const dosya of ['ProCard.tsx', 'SalonRow.tsx']) {
    const k = oku('src', 'ui', dosya);
    assert.doesNotMatch(k, /BADGE\[pro\.badge\]/, `${dosya}: rozet sütundan okunuyor`);
    assert.match(k, /pro\.aynaVerified \? DOGRULANDI : null/, `${dosya}: gerçek doğrulama yok`);
    // Doğrulanmamışta rozet HİÇ çizilmiyor.
    assert.match(k, /\{badge \? \(/, `${dosya}: rozet koşulsuz çiziliyor`);
  }
});
