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
  assert.match(
    ekran,
    /style=\{portreKesilmis \? undefined : styles\.avatarHalka\}/,
    'kesilmiş portrede halka kaldırılmıyor',
  );
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

test('ANA SAYFA LOGOSU %35 büyütüldü — oran korunarak', () => {
  /*
   * Kurucu: "ana sayfadaki ayna logosu %35 daha büyük olsun."
   *
   * Tek kenarı büyütmek marka işaretini ezerdi; ikisi de aynı oranda
   * büyümeli. Test oranı da ölçüyor.
   */
  const l = stil('logo');
  const g = Number(l.width);
  const y = Number(l.height);
  assert.ok(g >= 105 && g <= 110, `logo genişliği %35 büyümemiş: ${g}`);
  const oran = g / y;
  assert.ok(Math.abs(oran - 80 / 30) < 0.05, `logo oranı bozulmuş: ${oran.toFixed(2)}`);
});
