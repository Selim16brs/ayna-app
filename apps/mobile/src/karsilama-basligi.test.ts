import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { medyaAnahtari } from './media-cache';
import { portreKesilmisMi, portreSec } from './portre';

/**
 * ANA SAYFA KARŞILAMASI — brief dışı, kurucu isteği.
 *
 * "karşılama mesajında, mesaj üstte ve daha küçük, altında da isim daha
 * büyük ve bold olsun. sağdaki profil fotoğrafı daha büyük ve arka planı
 * kesilmiş şekilde çıksın, daire içinde olmasın."
 */

const yorumsuz = (x: string) =>
  x.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
const ekran = yorumsuz(
  readFileSync(join(__dirname, '..', 'app', '(tabs)', 'discover.tsx'), 'utf8'),
);

const stil = (ad: string): Record<string, number | string> => {
  const i = ekran.indexOf(`${ad}: {`);
  assert.ok(i > 0, `stil yok: ${ad}`);
  const govde = ekran.slice(i, ekran.indexOf('}', i));
  const o: Record<string, number | string> = {};
  for (const m of govde.matchAll(
    /(\w+):\s*(-?[\d.]+|(?:colors|font|radius|space)\.\w+|'[^']*')/g,
  )) {
    o[m[1]!] = /^-?[\d.]+$/.test(m[2]!) ? Number(m[2]) : m[2]!;
  }
  return o;
};

test('KARŞILAMA ÜSTTE ve KÜÇÜK, İSİM ALTTA ve BÜYÜK', () => {
  /*
   * Tek satırdı ("Merhaba, Selim") ve isim selamlamanın içinde
   * kayboluyordu. Ekranın konusu kullanıcının kendisi, karşılama sözü
   * değil.
   */
  const ust = stil('selamUst');
  const ad = stil('selamAd');
  assert.ok(
    Number(ad.fontSize) > Number(ust.fontSize),
    `isim karşılamadan büyük değil: ${ad.fontSize} vs ${ust.fontSize}`,
  );
  assert.equal(ad.fontFamily, 'font.semibold', 'isim kalın değil');
  assert.equal(ust.fontFamily, 'font.regular', 'karşılama da kalın — hiyerarşi kayboluyor');

  // Sıra: karşılama satırı İSİMDEN ÖNCE çiziliyor.
  const iUst = ekran.indexOf('styles.selamUst');
  const iAd = ekran.indexOf('styles.selamAd');
  assert.ok(iUst > 0 && iAd > iUst, 'isim karşılamanın üstünde çiziliyor');
});

test('KARŞILAMA saate göre — sabit metin değil', () => {
  // "Günaydın / İyi günler / İyi akşamlar" ortak yardımcıdan geliyor;
  // sabit bir metin yazsaydık gece yarısı "İyi günler" derdi.
  assert.match(ekran, /\{t\(greetingKey\(\)\)\}/, 'karşılama saate göre değil');
});

test('KESİLMİŞ portre BÜYÜK ve ÇERÇEVESİZ', () => {
  const kesik = stil('portreKesik');
  const daire = stil('avatar');
  assert.ok(
    Number(kesik.width) > Number(daire.width),
    `kesilmiş portre büyütülmemiş: ${kesik.width} vs ${daire.width}`,
  );
  assert.equal(kesik.borderRadius, undefined, 'kesilmiş portre hâlâ daire içinde');
  /*
   * Kesilmiş portrede HALKA yok — kap yalnız zemin çizgisini
   * hizalıyor (`portreKap`), çerçeve çizmiyor.
   */
  assert.match(
    ekran,
    /style=\{portreKesilmis \? styles\.portreKap : styles\.avatarHalka\}/,
    'kesilmiş portrede halka kaldırılmıyor',
  );
  const kap = stil('portreKap');
  assert.equal(kap.borderWidth, undefined, 'kesilmiş portrenin kabı çerçeve çiziyor');
  assert.equal(kap.borderRadius, undefined, 'kesilmiş portrenin kabı yuvarlak');
});

test('HAM fotoğraf DAİRE içinde kalıyor', () => {
  /*
   * Ham fotoğraf KENDİ arka planını taşıyor. Çerçevesiz ve kare
   * göstermek, kullanıcının odasını ana sayfaya yapıştırmak olurdu.
   */
  assert.match(
    ekran,
    /style=\{portreKesilmis \? styles\.portreKesik : styles\.avatar\}/,
    'ham fotoğraf da çerçevesiz çiziliyor',
  );
  assert.ok(Number(stil('avatar').borderRadius) > 0, 'daire stili yuvarlak değil');
});

test('portre ORANI korunuyor — tepesinden kesilmiyor', () => {
  // Kesilmiş görselin oranı fotoğraftan fotoğrafa değişiyor; `cover`
  // kimini tepesinden keserdi.
  /*
   * Desen PORTRE'ye bağlanıyor. İlk sürümüm dosyada herhangi bir
   * `resizeMode="contain"` arıyordu — ekranda başkaları da var (marka
   * işareti), o yüzden portrenin `cover`a çevrilmesini kaçırdı.
   */
  assert.match(
    ekran,
    /source=\{\{ uri: portre \}\}[\s\S]{0,160}?resizeMode="contain"/,
    'portre oranı korunmuyor',
  );
});

test('"kesilmiş mi" kararı PORTRE SEÇİMİYLE aynı koşulda', () => {
  /*
   * İkisi ayrışırsa ekran, kesilmemiş bir fotoğrafı kesilmiş sanıp
   * çerçevesiz çizer — tam da kaçınılmak istenen şey.
   */
  /*
   * `cutoutFor` ham adres değil ANAHTAR tutuyor (`medyaAnahtari`).
   * İlk denememde ham metin yazmıştım ve "güncel" durum bile bayat
   * göründü — testi kurgunun kendisi yanılttı.
   */
  const bayat = { cutoutUri: 'kesik', cutoutFor: medyaAnahtari('baska-foto'), avatarUri: 'foto' };
  assert.equal(portreKesilmisMi(bayat), false, 'bayat kesik "kesilmiş" sayıldı');
  assert.equal(portreSec(bayat), 'foto', 'bayat kesik gösteriliyor');

  const guncel = { cutoutUri: 'kesik', cutoutFor: medyaAnahtari('foto'), avatarUri: 'foto' };
  assert.equal(portreKesilmisMi(guncel), true);
  assert.equal(portreSec(guncel), 'kesik');

  const yok = { cutoutUri: null, cutoutFor: null, avatarUri: 'foto' };
  assert.equal(portreKesilmisMi(yok), false);
  assert.equal(portreSec(yok), 'foto');
});

test('ANA SAYFA LOGOSU büyütüldü — ORAN korunarak', () => {
  /*
   * Kurucu logoyu iki kez büyüttü (%35, sonra %30 daha). Testin
   * KORUDUĞU ŞEY ORAN: tek kenarı büyütmek marka işaretini ezerdi.
   *
   * Kesin ölçüye bağlamıyorum — o bir beğeni kararı ve değişmeye devam
   * edecek; ölçüyü sabitleyen bir test her ayarda gürültü çıkarırdı.
   * Kural, işaretin Figma'daki 80×30'dan KÜÇÜLMEMESİ ve oranın
   * bozulmaması.
   */
  const l = stil('logo');
  const g = Number(l.width);
  const y = Number(l.height);
  assert.ok(g >= 80, `logo Figma ölçüsünden küçük: ${g}`);
  const oran = g / y;
  assert.ok(Math.abs(oran - 80 / 30) < 0.05, `logo oranı bozulmuş: ${oran.toFixed(2)}`);
});

test('KESİK PORTRE uygulama kapanıp açılınca KAYBOLMUYOR', () => {
  /*
   * Kurucu: "ana sayfadaki profil fotoğrafı kesiliyor ama daha sonra
   * uygulama açılıp kapanınca yeniden daire içine giriyor."
   *
   * `cutoutFor` anahtarı YEREL fotoğrafın içeriğinden hesaplanıyordu.
   * Fotoğraf depoya yüklenince `avatarUri` bir ADRESE dönüşüyor;
   * adresin içeriği bambaşka, anahtar tutmuyor ve kesik BAYAT sayılıp
   * ham fotoğrafa düşülüyordu.
   *
   * Sunucudan gelen çift güvenilir: fotoğraf değiştiğinde kesik de
   * siliniyor, yani ikisi birden varsa aynı fotoğrafa aitler.
   */
  /*
   * DURUMU YAZAN yere bakıyoruz, önbelleğe yazana değil.
   *
   * Aynı ifade iki yerde geçiyor (`set(...)` ve `saveMediaCache(...)`).
   * İlk denememde dosyanın herhangi bir yerinde arıyordum: `set(`
   * bloğunu bozan mutasyon, öteki kopya sayesinde testi geçiyordu.
   * Ekranın gördüğü değer `set(` içindeki.
   */
  const magaza = readFileSync(join(__dirname, 'store.ts'), 'utf8');
  const durumBlogu = magaza.slice(
    magaza.indexOf('const localCutout ='),
    magaza.indexOf('}));', magaza.indexOf('const localCutout =')),
  );
  assert.match(
    durumBlogu,
    /cutoutFor: serverCutout\s*\?\s*medyaAnahtari\(nextAvatar\)/,
    'sunucudan gelen kesik mevcut fotoğrafa bağlanmıyor',
  );
  // Sunucuda kesik YOKSA eski davranış sürmeli: bayat koruması kalkmasın.
  assert.match(
    durumBlogu,
    /: \(get\(\)\.cutoutFor \?\? cached\?\.cutoutFor \?\? null\)/,
    'bayat kesik koruması kaldırılmış',
  );
});

test('ADRES ile DATA URL aynı anahtarı vermiyor — hatanın çekirdeği', () => {
  /*
   * Bu testin amacı düzeltmeyi değil SEBEBİ kilitlemek: biri "anahtar
   * zaten tutuyordu" diye düzeltmeyi geri alırsa burası hatırlatır.
   */
  const dataUrl = 'data:image/jpeg;base64,QUJDREVG';
  const adres = 'https://cdn.ayna.salon/avatars/abc123.jpg';
  assert.notEqual(medyaAnahtari(dataUrl), medyaAnahtari(adres));
});

test('KESİK PORTRENİN ALTINDA zemin çizgisi', () => {
  /*
   * Kurucu: "fotoğrafın altına paralel şekilde pembe çizgi… tam
   * fotoğrafın bittiği yerde ince görünsün ve fotoğraf genişliği kadar
   * olsun."
   *
   * Kesilmiş portrenin zemini saydam; çizgi olmadan figür boşlukta asılı
   * duruyor.
   */
  assert.match(
    ekran,
    /\{portreKesilmis \? <View style=\{styles\.portreCizgi\} \/> : null\}/,
    'zemin çizgisi yok',
  );
  const c = stil('portreCizgi');
  assert.equal(c.width, "'100%'", 'çizgi fotoğraf genişliğinde değil');
  assert.ok(Number(c.height) <= 3, `çizgi ince değil: ${c.height}`);
  assert.equal(c.backgroundColor, 'colors.accent', 'çizgi aksan renginden gelmiyor');
  // Kap portre ölçüsünde olmalı, yoksa "%100" fotoğrafın genişliği olmaz.
  assert.equal(Number(stil('portreKap').width), Number(stil('portreKesik').width));
});

test('DAİRE içindeki ham fotoğrafta çizgi YOK', () => {
  // Orada zaten bir çerçeve var; ikisi birden fazlalık olurdu.
  assert.match(
    ekran,
    /style=\{portreKesilmis \? styles\.portreKap : styles\.avatarHalka\}/,
    'ham fotoğraf da çizgili kapta',
  );
});

test('ARAMA ÇUBUĞU portrenin ÇİZGİSİNE YAPIŞIK', () => {
  /*
   * Kurucu: "search barın üstü müşteri profil fotosunun alt çizgisi ile
   * yapışık olsun. alttakileri üste çek."
   *
   * İki koşul birden gerekiyor. Satır ORTALI kalırsa portre 104px'lik
   * satırın ortasında yüzer ve çizginin altında pay kalır; alt iç boşluk
   * kalırsa çizgiyle arama arasında 20px durur.
   */
  const k = stil('karsilama');
  assert.equal(k.alignItems, "'flex-end'", 'satır alt hizalı değil');
  assert.equal(k.paddingBottom, 0, 'çizginin altında boşluk kalıyor');
  // Üstteki nefes duruyor: kalkan yalnız alttaki.
  assert.equal(k.paddingTop, 20, 'başlıkla karşılama sıkışmış');
  /*
   * Arama karşılamanın HEMEN ardından geliyor: araya bir şey girerse
   * "yapışık" iddiası ölçüyle değil sırayla bozulur.
   */
  const a = ekran.indexOf('styles.karsilama');
  const b = ekran.indexOf('styles.aramaKap');
  assert.ok(a > 0 && b > a, 'arama karşılamanın altında değil');
});

test('UZMANDA canlı özet kartı da çizgiye yapışık', () => {
  /*
   * Kurucu: "uzmanda da canlı özet kartının üstü ile uzman profil
   * fotoğrafının altı çizgisi yapışık olsun."
   *
   * Uzmanda başlık kaydırma alanının İÇİNDE ve o alanın kendi 20px'lik
   * aralığı var: yalnız paddingBottom'u sıfırlamak yetmiyordu, aralık da
   * negatif payla geri alınmalı.
   */
  const u = yorumsuz(readFileSync(join(__dirname, '..', 'app', 'seller', 'reports.tsx'), 'utf8'));
  const stilU = (ad: string) => {
    const i = u.indexOf(`${ad}: {`);
    assert.ok(i > 0, `stil yok: ${ad}`);
    const govde = u.slice(i, u.indexOf('}', i));
    const o: Record<string, number | string> = {};
    for (const m of govde.matchAll(/(\w+):\s*(-?[\d.]+|'[^']*')/g)) {
      o[m[1]!] = /^-?[\d.]+$/.test(m[2]!) ? Number(m[2]) : m[2]!;
    }
    return o;
  };
  assert.equal(stilU('karsilama').alignItems, "'flex-end'", 'uzman satırı alt hizalı değil');
  const bas = stilU('bas');
  assert.equal(bas.paddingBottom, 0, 'çizginin altında boşluk kalıyor');
  const aralik = stilU('icerik').gap;
  assert.equal(bas.marginBottom, -Number(aralik), 'kaydırma aralığı geri alınmamış');
});
