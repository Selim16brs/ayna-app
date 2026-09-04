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
