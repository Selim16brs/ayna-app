/**
 * TELEFON BİÇİMİ — SAF MANTIK.
 *
 * Bileşenden ayrı: JSX'siz olduğu için testler doğrudan davranışı ölçebiliyor
 * (`bolge-adi.ts` ve `hizmet-adi.ts` ile aynı kalıp).
 *
 * Kurucu: "telefon numarası kaydedilirken ülke kodu ayrı numara ayrı şekilde
 * giriş yapılabilir."
 *
 * NEDEN: tek kutu sessizce bozuluyordu. Kurucu kayıtta numarayı ülke kodsuz
 * yazdı; sağlayıcı "uluslararası biçime uymuyor" diye reddetti ve ekranda
 * yalnız "kod gönderilemedi" göründü.
 */

export interface Ulke {
  kod: string;
  ad: string;
  bayrak: string;
}

/**
 * Desteklenen ülke kodları.
 *
 * Kısa tutuluyor: AYNA Kazakistan pazarında ve kullanıcıların ezici
 * çoğunluğu +7. Uzun bir dünya listesi, doğru seçeneği bulmayı
 * zorlaştırmaktan başka işe yaramazdı. Komşular ve kurucunun kullandığı
 * Türkiye ekli.
 */
export const ULKELER: readonly Ulke[] = [
  { kod: '+7', ad: 'Қазақстан', bayrak: '🇰🇿' },
  { kod: '+90', ad: 'Türkiye', bayrak: '🇹🇷' },
  { kod: '+996', ad: 'Кыргызстан', bayrak: '🇰🇬' },
  { kod: '+998', ad: 'Oʻzbekiston', bayrak: '🇺🇿' },
  { kod: '+992', ad: 'Тоҷикистон', bayrak: '🇹🇯' },
  { kod: '+994', ad: 'Azərbaycan', bayrak: '🇦🇿' },
  { kod: '+374', ad: 'Հայաստան', bayrak: '🇦🇲' },
  { kod: '+995', ad: 'საქართველო', bayrak: '🇬🇪' },
  { kod: '+49', ad: 'Deutschland', bayrak: '🇩🇪' },
  { kod: '+44', ad: 'United Kingdom', bayrak: '🇬🇧' },
  { kod: '+1', ad: 'USA / Canada', bayrak: '🇺🇸' },
] as const;

export const VARSAYILAN_ULKE = ULKELER[0]!;

/**
 * Yerel yazımı temizler.
 *
 * Ülke kodu ayrı seçildiği için baştaki ulusal önek (KZ'de 8, TR'de 0)
 * fazlalıktır. Bırakılırsa numara bir hane kayar.
 */
export function yerelKismiTemizle(ham: string, ulkeKodu: string): string {
  let d = (ham ?? '').replace(/[^0-9]/g, '');
  if (ulkeKodu === '+7' && d.length === 11 && d.startsWith('8')) d = d.slice(1);
  else if (ulkeKodu === '+7' && d.length === 11 && d.startsWith('7')) d = d.slice(1);
  // Baştaki sıfır her ülkede ulusal önektir; uluslararası biçimde bulunmaz.
  else if (d.startsWith('0')) d = d.replace(/^0+/, '');
  return d;
}

/** Ülke kodu + yerel numara → sunucuya gidecek tam numara. */
export function tamNumara(ulkeKodu: string, yerel: string): string {
  const y = yerelKismiTemizle(yerel, ulkeKodu);
  return y ? `${ulkeKodu}${y}` : '';
}

/** Tam numarayı ülke kodu + yerel parçaya ayırır (düzenleme ekranları için). */
export function parcala(
  tam: string,
  liste: readonly Ulke[] = ULKELER,
): { ulke: Ulke; yerel: string } {
  const d = (tam ?? '').replace(/[^0-9]/g, '');
  /*
   * EN UZUN EŞLEŞEN KOD ÖNCE.
   *
   * Şu anki listede çakışma yok, yani sıralama bugün bir hatayı
   * ÖNLEMİYOR — ileride önlüyor: listeye kısa bir kodun uzantısı olan
   * bir ülke eklenirse (örn. +1 yanına +12xx), sırasız arama numarayı
   * yanlış ülkeye yazardı ve bu sessiz bir hata olurdu.
   *
   * `liste` parametresi bu yüzden var: koruma testte gerçekten
   * ölçülebilsin diye (yoksa "ileride" diye yazılmış bir kural hiç
   * doğrulanamaz).
   */
  const sirali = [...liste].sort((a, b) => b.kod.length - a.kod.length);
  for (const u of sirali) {
    const rakam = u.kod.slice(1);
    if (d.startsWith(rakam)) return { ulke: u, yerel: d.slice(rakam.length) };
  }
  return { ulke: liste[0] ?? VARSAYILAN_ULKE, yerel: d };
}

// ─────────────────────────────────────────────────────────────────────────
// TÜM ÜLKELER + GERÇEK DOĞRULAMA
//
// Yukarıdaki liste SIK KULLANILANLAR olarak kalıyor (Kazakistan ilk sırada;
// `parcala` ve testler ona dayanıyor). Aşağısı onu genişletiyor.
//
// ── ÜLKE VERİSİ NEDEN BURADA, PAKETTEN DEĞİL ────────────────────────────
//
// `libphonenumber-js` ülke listesini kendi metadata'sından verebiliyor ama
// o metadata JSON olarak yükleniyor ve Node test koşucusunda `{ default }`
// sarmalıyla geliyor — kütüphane onu geçersiz sayıp hata fırlatıyor. Metro
// muhtemelen doğru yüklerdi, ama SINANAMAYAN bir yola güvenmek istemedim:
// liste burada duruyor, her ortamda aynı sonucu veriyor.
//
// Kütüphane yine de kullanılıyor — ama yalnız DOĞRULAMA ve BİÇİMLENDİRME
// için ve her çağrı korumalı: çalışmadığı ortamda sessizce daha basit
// kurala düşüyor, uygulama çökmüyor.
//
// BAYRAKLAR EMOJİ: gugusi'nin ülke verisi 586 KB, çünkü her bayrak base64
// PNG olarak gömülü. ISO kodundan emoji üretmek aynı sonucu sıfır byte'la
// veriyor — 'TR' → 🇹🇷 (iki bölgesel gösterge harfi).
// ─────────────────────────────────────────────────────────────────────────

/** ISO 3166-1 alfa-2 → uluslararası çevirme kodu (245 ülke). */
export const ISO_CEVIRME_KODU: Readonly<Record<string, string>> = {
  AD: '376',
  AE: '971',
  AF: '93',
  AG: '1268',
  AI: '1264',
  AL: '355',
  AM: '374',
  AO: '244',
  AR: '54',
  AS: '1684',
  AT: '43',
  AU: '61',
  AW: '297',
  AX: '358',
  AZ: '994',
  BA: '387',
  BB: '1246',
  BD: '880',
  BE: '32',
  BF: '226',
  BG: '359',
  BH: '973',
  BI: '257',
  BJ: '229',
  BL: '590',
  BM: '1441',
  BN: '673',
  BO: '591',
  BQ: '599',
  BR: '55',
  BS: '1242',
  BT: '975',
  BW: '267',
  BY: '375',
  BZ: '501',
  CA: '1',
  CC: '61',
  CD: '243',
  CF: '236',
  CG: '242',
  CH: '41',
  CI: '225',
  CK: '682',
  CL: '56',
  CM: '237',
  CN: '86',
  CO: '57',
  CR: '506',
  CU: '53',
  CV: '238',
  CW: '5999',
  CX: '61',
  CY: '357',
  CZ: '420',
  DE: '49',
  DJ: '253',
  DK: '45',
  DM: '1767',
  DO: '1809',
  DZ: '213',
  EC: '593',
  EE: '372',
  EG: '20',
  EH: '212',
  ER: '291',
  ES: '34',
  ET: '251',
  FI: '358',
  FJ: '679',
  FK: '500',
  FM: '691',
  FO: '298',
  FR: '33',
  GA: '241',
  GB: '44',
  GD: '1473',
  GE: '995',
  GF: '594',
  GG: '44',
  GH: '233',
  GI: '350',
  GL: '299',
  GM: '220',
  GN: '224',
  GP: '590',
  GQ: '240',
  GR: '30',
  GS: '500',
  GT: '502',
  GU: '1671',
  GW: '245',
  GY: '592',
  HK: '852',
  HN: '504',
  HR: '385',
  HT: '509',
  HU: '36',
  ID: '62',
  IE: '353',
  IL: '972',
  IM: '44',
  IN: '91',
  IO: '246',
  IQ: '964',
  IR: '98',
  IS: '354',
  IT: '39',
  JE: '44',
  JM: '1876',
  JO: '962',
  JP: '81',
  KE: '254',
  KG: '996',
  KH: '855',
  KI: '686',
  KM: '269',
  KN: '1869',
  KP: '850',
  KR: '82',
  KW: '965',
  KY: '1345',
  KZ: '7',
  LA: '856',
  LB: '961',
  LC: '1758',
  LI: '423',
  LK: '94',
  LR: '231',
  LS: '266',
  LT: '370',
  LU: '352',
  LV: '371',
  LY: '218',
  MA: '212',
  MC: '377',
  MD: '373',
  ME: '382',
  MF: '590',
  MG: '261',
  MH: '692',
  MK: '389',
  ML: '223',
  MM: '95',
  MN: '976',
  MO: '853',
  MP: '1670',
  MQ: '596',
  MR: '222',
  MS: '1664',
  MT: '356',
  MU: '230',
  MV: '960',
  MW: '265',
  MX: '52',
  MY: '60',
  MZ: '258',
  NA: '264',
  NC: '687',
  NE: '227',
  NF: '672',
  NG: '234',
  NI: '505',
  NL: '31',
  NO: '47',
  NP: '977',
  NR: '674',
  NU: '683',
  NZ: '64',
  OM: '968',
  PA: '507',
  PE: '51',
  PF: '689',
  PG: '675',
  PH: '63',
  PK: '92',
  PL: '48',
  PM: '508',
  PN: '64',
  PR: '1787',
  PS: '970',
  PT: '351',
  PW: '680',
  PY: '595',
  QA: '974',
  RE: '262',
  RO: '40',
  RS: '381',
  RU: '7',
  RW: '250',
  SA: '966',
  SB: '677',
  SC: '248',
  SD: '249',
  SE: '46',
  SG: '65',
  SH: '290',
  SI: '386',
  SJ: '4779',
  SK: '421',
  SL: '232',
  SM: '378',
  SN: '221',
  SO: '252',
  SR: '597',
  SS: '211',
  ST: '239',
  SV: '503',
  SX: '1721',
  SY: '963',
  SZ: '268',
  TC: '1649',
  TD: '235',
  TG: '228',
  TH: '66',
  TJ: '992',
  TK: '690',
  TL: '670',
  TM: '993',
  TN: '216',
  TO: '676',
  TR: '90',
  TT: '1868',
  TV: '688',
  TW: '886',
  TZ: '255',
  UA: '380',
  UG: '256',
  US: '1',
  UY: '598',
  UZ: '998',
  VA: '3906698',
  VC: '1784',
  VE: '58',
  VG: '1284',
  VI: '1340',
  VN: '84',
  VU: '678',
  WF: '681',
  WS: '685',
  XK: '383',
  YE: '967',
  YT: '262',
  ZA: '27',
  ZM: '260',
  ZW: '263',
};

/** ISO ülke kodundan bayrak emojisi: 'TR' → 🇹🇷 */
export function bayrakEmoji(iso: string): string {
  if (!/^[A-Za-z]{2}$/.test(iso)) return '\u{1F3F3}\uFE0F';
  return String.fromCodePoint(...[...iso.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

/*
 * Ülke ADI cihazın kendi tablosundan.
 *
 * 245 ülkenin adını üç dile çevirip pakete koymak yerine `Intl.DisplayNames`
 * kullanılıyor: kullanıcının diline göre adı kendisi veriyor. Bulunmadığı
 * ortamlar için yedek var — sık kullanılan ülkeler zaten yukarıdaki listede
 * kendi dillerinde yazılı, gerisi ISO koduna düşüyor (bayrak ve çevirme kodu
 * yanında dururken hâlâ seçilebilir ve aranabilir).
 */
function adCozucu(dil: string): (iso: string) => string {
  try {
    const dn = new Intl.DisplayNames([dil], { type: 'region' });
    return (iso) => dn.of(iso) ?? iso;
  } catch {
    return (iso) => iso;
  }
}

export interface UlkeTam extends Ulke {
  /** ISO 3166-1 alfa-2 — sunucu ve SMS sağlayıcısı bu kodu kullanıyor. */
  iso: string;
  /**
   * ARAMA için ikinci ad.
   *
   * Sık kullanılan ülkeler kendi dillerinde yazılı ("Deutschland",
   * "Қазақстан"). Kullanıcı "Germany" ya da "Kazakhstan" yazarsa bulamazdı;
   * cihazın İngilizce adı burada duruyor ve yalnız aramada kullanılıyor.
   */
  aramaAdi?: string;
}

/** Sık kullanılanların ISO karşılığı — kendi dillerindeki adları korunuyor. */
export const SIK_ISO: Readonly<Record<string, string>> = {
  '+7': 'KZ',
  '+90': 'TR',
  '+996': 'KG',
  '+998': 'UZ',
  '+992': 'TJ',
  '+994': 'AZ',
  '+374': 'AM',
  '+995': 'GE',
  '+49': 'DE',
  '+44': 'GB',
  '+1': 'US',
};

/**
 * Seçilebilir ülkelerin TAMAMI — sık kullanılanlar başta.
 *
 * Sıra rastgele değil: Kazakistan ve komşuları en üstte, çünkü kullanıcıların
 * ezici çoğunluğu orada. Gerisi ada göre sıralı ve arama kutusundan bulunuyor.
 */
export function tumUlkeler(dil = 'en'): UlkeTam[] {
  const ad = adCozucu(dil);
  const enAd = adCozucu('en');
  const sik: UlkeTam[] = ULKELER.map((u) => {
    const iso = SIK_ISO[u.kod] ?? '';
    return { ...u, iso, aramaAdi: iso ? enAd(iso) : undefined };
  });
  const sikIso = new Set(sik.map((u) => u.iso));
  const digerleri: UlkeTam[] = Object.keys(ISO_CEVIRME_KODU)
    .filter((iso) => !sikIso.has(iso))
    .map((iso) => ({
      iso,
      kod: `+${ISO_CEVIRME_KODU[iso]}`,
      ad: ad(iso),
      bayrak: bayrakEmoji(iso),
    }))
    .sort((a, b) => a.ad.localeCompare(b.ad));
  return [...sik, ...digerleri];
}

/** Arama: ülke adı, ISO kodu veya çevirme kodu üzerinden. */
export function ulkeAra(liste: readonly UlkeTam[], sorgu: string): UlkeTam[] {
  const q = sorgu.trim().toLocaleLowerCase();
  if (!q) return [...liste];
  const rakam = q.replace(/[^0-9]/g, '');
  return liste.filter(
    (u) =>
      u.ad.toLocaleLowerCase().includes(q) ||
      (u.aramaAdi ?? '').toLocaleLowerCase().includes(q) ||
      u.iso.toLocaleLowerCase().includes(q) ||
      (rakam.length > 0 && u.kod.includes(rakam)),
  );
}

/**
 * Bu ülkeye SMS GÖNDEREBİLİYOR MUYUZ?
 *
 * Ülke seçici 11'den 245'e çıktı ama SMS sağlayıcısıyla (Mobizon/SMSC)
 * kurulu hat hepsini kapsamıyor. Kullanıcı listede olmayan bir ülke seçip
 * numarasını yazar, "kod gönder"e basar ve hiçbir şey gelmezse hatayı
 * kendinde arar — numarayı tekrar tekrar yazar.
 *
 * Sık kullanılanlar listesi (Kazakistan ve komşuları + kurucunun kullandığı
 * ülkeler) doğrulanmış hat; gerisi için kullanıcı ÖNCEDEN uyarılıyor.
 * Uyarı numara girişini engellemiyor: hesap oluşturmanın tek yolu SMS değil
 * ve sağlayıcı yarın o ülkeyi açabilir — sadece beklentiyi doğru kuruyor.
 */
export function smsDestekleniyorMu(ulkeKodu: string): boolean {
  return Object.prototype.hasOwnProperty.call(SIK_ISO, ulkeKodu);
}

/** Çevirme kodundan ISO — sunucuya ülke bilgisini de gönderebilmek için. */
export function isoBul(ulkeKodu: string): string {
  const s = SIK_ISO[ulkeKodu];
  if (s) return s;
  const rakam = ulkeKodu.replace(/[^0-9]/g, '');
  for (const [iso, kod] of Object.entries(ISO_CEVIRME_KODU)) if (kod === rakam) return iso;
  return '';
}

// ── DOĞRULAMA ve BİÇİMLENDİRME ──────────────────────────────────────────
//
// Kütüphane KORUMALI kullanılıyor: `libphonenumber-js` metadata'sı bazı
// ortamlarda yüklenemiyor (bkz. yukarıdaki not) ve o durumda hata fırlatıyor.
// Her çağrı try/catch içinde; kütüphane yoksa uzunluk kuralına düşülüyor.
// Böylece doğrulama en kötü ihtimalle BUGÜNKÜ kadar iyi, genelde daha iyi.

type LphModul = {
  isValidPhoneNumber?: (n: string, ulke?: string) => boolean;
  AsYouType?: new (ulke?: string) => { input: (s: string) => string };
  parsePhoneNumberFromString?: (
    n: string,
  ) => { country?: string; countryCallingCode?: string; nationalNumber?: string } | undefined;
};

let lph: LphModul | null | undefined;
function kutuphane(): LphModul | null {
  if (lph !== undefined) return lph;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    lph = require('libphonenumber-js') as LphModul;
  } catch {
    lph = null;
  }
  return lph;
}

/** Numara o ülke için makul uzunlukta mı — kütüphanesiz yedek kural. */
function uzunlukMakul(yerel: string): boolean {
  const d = yerel.replace(/[^0-9]/g, '');
  return d.length >= 6 && d.length <= 15;
}

/**
 * Numara o ülke için GERÇEKTEN geçerli mi?
 *
 * Uzunluk kontrolü değil, numara planı kontrolü: eksik haneli ya da geçersiz
 * operatör önekli bir numara buradan geçemez. Yani kullanıcı hatayı SMS
 * sağlayıcısından bir ağ gidiş-dönüşü sonra değil, ekranda öğrenir.
 */
export function gecerliMi(ulkeKodu: string, yerel: string, iso?: string): boolean {
  const tam = tamNumara(ulkeKodu, yerel);
  if (!tam) return false;
  const k = kutuphane();
  if (!k?.isValidPhoneNumber) return uzunlukMakul(yerel);
  try {
    return k.isValidPhoneNumber(tam, iso ?? isoBul(ulkeKodu) ?? undefined);
  } catch {
    return uzunlukMakul(yerel);
  }
}

/**
 * Yazarken biçimlendirme — "5321234567" → "532 123 45 67".
 *
 * Yalnız GÖRÜNÜMÜ değiştiriyor: gönderilen değer `tamNumara` üzerinden
 * geçiyor ve o zaten rakam dışını atıyor. Ülke kodu kutunun solunda ayrı
 * durduğu için ulusal biçim kullanılıyor, kod tekrar yazılmıyor.
 */
export function bicimliYaz(ulkeKodu: string, yerel: string, iso?: string): string {
  const d = (yerel ?? '').replace(/[^0-9]/g, '');
  if (!d) return '';
  const k = kutuphane();
  const ulkeIso = iso ?? isoBul(ulkeKodu);
  if (k?.AsYouType && ulkeIso) {
    try {
      const b = new k.AsYouType(ulkeIso).input(d);
      if (b) return b;
    } catch {
      /* kütüphane bu ortamda çalışmıyor — aşağıdaki basit gruplama devreye giriyor */
    }
  }
  return basitGrupla(d);
}

/**
 * Kütüphanesiz yedek gruplama: 3-3-2-2 ("777 123 45 67").
 *
 * `AsYouType` bazı ortamlarda metadata'sını yükleyemiyor ve orada hiç
 * biçimlendirme yapılmazsa kullanıcı 10 haneyi bitişik görür — okuması ve
 * yazdığını kontrol etmesi zor. Bu desen KZ, TR, RU ve komşularının yazım
 * alışkanlığı; gönderilen değeri etkilemiyor, çünkü `tamNumara` boşlukları
 * zaten atıyor.
 */
function basitGrupla(d: string): string {
  const p: string[] = [];
  let i = 0;
  for (const uz of [3, 3, 2, 2]) {
    if (i >= d.length) break;
    p.push(d.slice(i, i + uz));
    i += uz;
  }
  if (i < d.length) p.push(d.slice(i));
  return p.join(' ');
}

/**
 * Kayıtlı numarayı kesin olarak ayırır — `parcala`nın kütüphaneli hâli.
 *
 * `+7` HEM Kazakistan HEM Rusya: elle yazılmış eşleme ikisini ayıramıyor ve
 * her +7 numarayı Kazakistan sayıyor. Kütüphane ulusal numaraya bakıp doğru
 * ülkeyi söylüyor. Çözemezse `null` dönüyor ve çağıran `parcala`ya düşüyor.
 */
export function parcalaKesin(tam: string): { iso: string; kod: string; yerel: string } | null {
  const k = kutuphane();
  if (!k?.parsePhoneNumberFromString) return null;
  try {
    const p = k.parsePhoneNumberFromString(tam);
    if (!p?.country || !p.countryCallingCode || !p.nationalNumber) return null;
    return { iso: p.country, kod: `+${p.countryCallingCode}`, yerel: p.nationalNumber };
  } catch {
    return null;
  }
}
