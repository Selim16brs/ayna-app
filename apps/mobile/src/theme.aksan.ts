/**
 * AKSAN SETLERİ — kullanıcının profilden seçtiği uygulama rengi.
 *
 * İLK SÜRÜMDE YALNIZ DÜĞMELER DEĞİŞİYORDU; kurucu haklı olarak "çok sığ
 * kalmış, zemin ve kartlar hiç değişmemiş" dedi. Artık her set KENDİ TAM
 * KATMANINI taşıyor: zemin, çökertilmiş bölüm, kart, panel, çizgi, metin
 * tonları ve yüzen alt menü de setin tonundan türüyor.
 *
 * NASIL KURULDU: mevcut pembe paletin PARLAKLIK MERDİVENİ ölçülüp aynen
 * korundu; değişen yalnız TON. Böylece derinlik sırası (kart zeminden açık,
 * çökertilmiş bölüm zeminden koyu) her sette birebir aynı kalıyor —
 * yerleşim ve hiyerarşi bozulmadan renk değişiyor.
 *
 * ZEMİN NEDEN BİRAZ KOYULAŞTI: eski zemin %96,5 parlaklıktaydı ve o
 * yükseklikte renge yer kalmıyor — ton değişse bile göz farkı görmüyordu
 * (ölçüm: ΔE 2–4, "zar zor fark edilir" sınırı). Merdiven %94,2'ye indi,
 * ΔE 3,5–6,9'a çıktı: fark artık bakışta görülüyor.
 *
 * DEĞİŞMEYENLER: yerleşim, ölçü, yuvarlatma, boşluk, yazı tipi ve ANLAM
 * renkleri (success yeşili, danger kırmızısı, gold kehribarı). Bunlar marka
 * değil durum bildiriyor; aksanla kayarlarsa "onaylandı" ile "iptal"
 * ayırt edilemez hâle gelir.
 *
 * Her değer iki temada da ölçüldü (`aksan-kontrast.test.ts`): 37 kritik
 * çift × 8 set × 2 tema. En düşük kontrast 4,60:1, eşik 4,5:1.
 */

export const AKSAN_ANAHTARLARI = [
  'gul',
  'erik',
  'leylak',
  'bakir',
  'gokyuzu',
  'lacivert',
  'petrol',
  'zumrut',
] as const;

export type AksanAnahtari = (typeof AKSAN_ANAHTARLARI)[number];

/** Varsayılan. Eylem rengi bugünküyle AYNI (#BC245B); değişen yalnız yüzeyler. */
export const VARSAYILAN_AKSAN: AksanAnahtari = 'gul';

/**
 * Bir temadaki TAM katman. Alan adları `ColorTokens`/`GradientTokens` ile
 * birebir; `paletUret` bunları taban paletin üzerine yazıyor.
 */
export interface AksanTemasi {
  bg: string;
  bgSunken: string;
  surface: string;
  surfaceMuted: string;
  ink: string;
  inkSoft: string;
  muted: string;
  line: string;
  lineStrong: string;
  inverse: string;
  onInverse: string;
  onInverseMuted: string;
  fadeFrom: string;
  fadeMid: string;
  accent: string;
  accentSoft: string;
  accentFg: string;
  onAccent: string;
  rose: string;
  roseSoft: string;
  heroSoft: string;
  plum: string;
  gradGold: readonly [string, string];
  gradPlum: readonly [string, string];
  gradHero: readonly [string, string];
  gradRose: readonly [string, string];
}

export interface AksanSeti {
  /** Profildeki etiketin i18n anahtarı. */
  etiket: `profile.accent.${AksanAnahtari}`;
  /** Yuvarlağın rengi (açık temadaki aksan). */
  ornek: string;
  light: AksanTemasi;
  dark: AksanTemasi;
}

export const AKSANLAR: Record<AksanAnahtari, AksanSeti> = {
  /**
   * GÜL — varsayılan.
   *
   * Yüzeyler diğer setler gibi tonlandı (kurucu "zemin hiç değişmemiş"
   * dedi), ama EYLEM RENGİ bugünküyle birebir aynı: #BC245B ve düğme
   * gradyanı ['#DD2A6A', '#BC245B'] elle sabitlendi. Üretici bu ucu
   * #DC185A'ya kaydırıyordu; marka düğmesi kaymamalı.
   */
  gul: {
    etiket: 'profile.accent.gul',
    ornek: '#BC245B',
    light: {
      bg: '#F6EAEE',
      bgSunken: '#F1DEE4',
      surface: '#FEFCFD',
      surfaceMuted: '#F9F1F4',
      ink: '#1C1417',
      inkSoft: '#45353B',
      muted: '#69565C',
      line: '#E6CCD4',
      lineStrong: '#D7B4C0',
      inverse: '#250E16',
      onInverse: '#FAF5F7',
      onInverseMuted: 'rgba(250,245,247,0.66)',
      fadeFrom: 'rgba(246,234,238,0)',
      fadeMid: 'rgba(246,234,238,0.72)',
      accent: '#BC245B',
      accentSoft: '#FCF3F6',
      accentFg: '#BC245B',
      onAccent: '#FFFFFF',
      rose: '#BC245B',
      roseSoft: '#FCF3F6',
      heroSoft: '#F5E0E7',
      plum: '#820D34',
      gradGold: ['#DD2A6A', '#BC245B'],
      gradPlum: ['#9C1140', '#820D34'],
      gradHero: ['#F6EAEE', '#F5E0E7'],
      gradRose: ['#9C1140', '#820D34'],
    },
    dark: {
      bg: '#160C0F',
      bgSunken: '#1F1216',
      surface: '#24161B',
      surfaceMuted: '#301F25',
      ink: '#F7F0F2',
      inkSoft: '#DFD3D7',
      muted: '#AC9AA0',
      line: '#3E2D33',
      lineStrong: '#523D44',
      inverse: '#5B293A',
      onInverse: '#FAF5F7',
      onInverseMuted: 'rgba(250,245,247,0.62)',
      fadeFrom: 'rgba(22,12,15,0)',
      fadeMid: 'rgba(22,12,15,0.72)',
      accent: '#FF7FA8',
      accentSoft: '#240F16',
      accentFg: '#FF7FA8',
      onAccent: '#15090D',
      rose: '#FF7FA8',
      roseSoft: '#240F16',
      heroSoft: '#240F16',
      plum: '#570F27',
      gradGold: ['#FF7FA8', '#F26191'],
      gradPlum: ['#6F1533', '#570F27'],
      gradHero: ['#160C0F', '#24161B'],
      gradRose: ['#6F1533', '#570F27'],
    },
  },

  erik: {
    etiket: 'profile.accent.erik',
    ornek: '#6A1461',
    light: {
      bg: '#F6EAF6',
      bgSunken: '#F1DEF0',
      surface: '#FEFCFE',
      surfaceMuted: '#F9F1F8',
      ink: '#1C141C',
      inkSoft: '#453544',
      muted: '#695668',
      line: '#E6CCE4',
      lineStrong: '#D7B4D5',
      inverse: '#250E24',
      onInverse: '#FAF5F9',
      onInverseMuted: 'rgba(250,245,249,0.66)',
      fadeFrom: 'rgba(246,234,246,0)',
      fadeMid: 'rgba(246,234,246,0.72)',
      accent: '#6A1461',
      accentSoft: '#FCF3FB',
      accentFg: '#6A1461',
      onAccent: '#FFFFFF',
      rose: '#6A1461',
      roseSoft: '#FCF3FB',
      heroSoft: '#F5E0F4',
      plum: '#820D7C',
      gradGold: ['#C516BD', '#6A1461'],
      gradPlum: ['#9C1195', '#820D7C'],
      gradHero: ['#F6EAF6', '#F5E0F4'],
      gradRose: ['#9C1195', '#820D7C'],
    },
    dark: {
      bg: '#160C15',
      bgSunken: '#1F121E',
      surface: '#241624',
      surfaceMuted: '#301F2F',
      ink: '#F7F0F6',
      inkSoft: '#DFD3DE',
      muted: '#AC9AAB',
      line: '#3E2D3D',
      lineStrong: '#523D51',
      inverse: '#5B2959',
      onInverse: '#FAF5F9',
      onInverseMuted: 'rgba(250,245,249,0.62)',
      fadeFrom: 'rgba(22,12,21,0)',
      fadeMid: 'rgba(22,12,21,0.72)',
      accent: '#D98BD2',
      accentSoft: '#240F23',
      accentFg: '#D98BD2',
      onAccent: '#150915',
      rose: '#D98BD2',
      roseSoft: '#240F23',
      heroSoft: '#240F23',
      plum: '#570F53',
      gradGold: ['#D98BD2', '#E363DD'],
      gradPlum: ['#6F156B', '#570F53'],
      gradHero: ['#160C15', '#241624'],
      gradRose: ['#6F156B', '#570F53'],
    },
  },

  leylak: {
    etiket: 'profile.accent.leylak',
    ornek: '#633A8E',
    light: {
      bg: '#F0EAF6',
      bgSunken: '#E8DEF1',
      surface: '#FDFCFE',
      surfaceMuted: '#F5F1F9',
      ink: '#18141C',
      inkSoft: '#3D3545',
      muted: '#605669',
      line: '#D9CCE6',
      lineStrong: '#C6B4D7',
      inverse: '#1A0E25',
      onInverse: '#F7F5FA',
      onInverseMuted: 'rgba(247,245,250,0.66)',
      fadeFrom: 'rgba(240,234,246,0)',
      fadeMid: 'rgba(240,234,246,0.72)',
      accent: '#633A8E',
      accentSoft: '#F7F3FC',
      accentFg: '#633A8E',
      onAccent: '#FFFFFF',
      rose: '#633A8E',
      roseSoft: '#F7F3FC',
      heroSoft: '#EBE0F5',
      plum: '#490D82',
      gradGold: ['#8823E7', '#633A8E'],
      gradPlum: ['#59119C', '#490D82'],
      gradHero: ['#F0EAF6', '#EBE0F5'],
      gradRose: ['#59119C', '#490D82'],
    },
    dark: {
      bg: '#110C16',
      bgSunken: '#18121F',
      surface: '#1E1624',
      surfaceMuted: '#281F30',
      ink: '#F4F0F7',
      inkSoft: '#D9D3DF',
      muted: '#A49AAC',
      line: '#362D3E',
      lineStrong: '#483D52',
      inverse: '#43295B',
      onInverse: '#F7F5FA',
      onInverseMuted: 'rgba(247,245,250,0.62)',
      fadeFrom: 'rgba(17,12,22,0)',
      fadeMid: 'rgba(17,12,22,0.72)',
      accent: '#BC9BDB',
      accentSoft: '#1A0F24',
      accentFg: '#BC9BDB',
      onAccent: '#100915',
      rose: '#BC9BDB',
      roseSoft: '#1A0F24',
      heroSoft: '#1C1127',
      plum: '#340F57',
      gradGold: ['#BC9BDB', '#A563E3'],
      gradPlum: ['#44156F', '#340F57'],
      gradHero: ['#110C16', '#1E1624'],
      gradRose: ['#44156F', '#340F57'],
    },
  },

  bakir: {
    etiket: 'profile.accent.bakir',
    ornek: '#944A26',
    light: {
      bg: '#F6EEEA',
      bgSunken: '#F1E4DE',
      surface: '#FEFCFC',
      surfaceMuted: '#F9F3F1',
      ink: '#1C1714',
      inkSoft: '#453A35',
      muted: '#695C56',
      line: '#E6D4CC',
      lineStrong: '#D7BFB4',
      inverse: '#25150E',
      onInverse: '#FAF6F5',
      onInverseMuted: 'rgba(250,246,245,0.66)',
      fadeFrom: 'rgba(246,238,234,0)',
      fadeMid: 'rgba(246,238,234,0.72)',
      accent: '#944A26',
      accentSoft: '#FCF6F3',
      accentFg: '#944A26',
      onAccent: '#FFFFFF',
      rose: '#944A26',
      roseSoft: '#FCF6F3',
      heroSoft: '#F5E7E0',
      plum: '#82300D',
      gradGold: ['#C14915', '#944A26'],
      gradPlum: ['#9C3B11', '#82300D'],
      gradHero: ['#F6EEEA', '#F5E7E0'],
      gradRose: ['#9C3B11', '#82300D'],
    },
    dark: {
      bg: '#160F0C',
      bgSunken: '#1F1612',
      surface: '#241B16',
      surfaceMuted: '#30241F',
      ink: '#F7F2F0',
      inkSoft: '#DFD6D3',
      muted: '#ACA09A',
      line: '#3E322D',
      lineStrong: '#52433D',
      inverse: '#5B3829',
      onInverse: '#FAF6F5',
      onInverseMuted: 'rgba(250,246,245,0.62)',
      fadeFrom: 'rgba(22,15,12,0)',
      fadeMid: 'rgba(22,15,12,0.72)',
      accent: '#E0A183',
      accentSoft: '#24150F',
      accentFg: '#E0A183',
      onAccent: '#150D09',
      rose: '#E0A183',
      roseSoft: '#24150F',
      heroSoft: '#24150F',
      plum: '#57250F',
      gradGold: ['#E0A183', '#E38963'],
      gradPlum: ['#6F3015', '#57250F'],
      gradHero: ['#160F0C', '#241B16'],
      gradRose: ['#6F3015', '#57250F'],
    },
  },

  gokyuzu: {
    etiket: 'profile.accent.gokyuzu',
    ornek: '#1466B8',
    light: {
      bg: '#EAF0F6',
      bgSunken: '#DEE8F1',
      surface: '#FCFDFE',
      surfaceMuted: '#F1F5F9',
      ink: '#14181C',
      inkSoft: '#353D45',
      muted: '#566069',
      line: '#CCD9E6',
      lineStrong: '#B4C6D7',
      inverse: '#0E1A25',
      onInverse: '#F5F7FA',
      onInverseMuted: 'rgba(245,247,250,0.66)',
      fadeFrom: 'rgba(234,240,246,0)',
      fadeMid: 'rgba(234,240,246,0.72)',
      accent: '#1466B8',
      accentSoft: '#F3F7FC',
      accentFg: '#1466B8',
      onAccent: '#FFFFFF',
      rose: '#1466B8',
      roseSoft: '#F3F7FC',
      heroSoft: '#E0EBF5',
      plum: '#0D4782',
      gradGold: ['#1670CA', '#1466B8'],
      gradPlum: ['#11579C', '#0D4782'],
      gradHero: ['#EAF0F6', '#E0EBF5'],
      gradRose: ['#11579C', '#0D4782'],
    },
    dark: {
      bg: '#0C1116',
      bgSunken: '#12181F',
      surface: '#161D24',
      surfaceMuted: '#1F2830',
      ink: '#F0F4F7',
      inkSoft: '#D3D9DF',
      muted: '#9AA3AC',
      line: '#2D363E',
      lineStrong: '#3D4752',
      inverse: '#29425B',
      onInverse: '#F5F7FA',
      onInverseMuted: 'rgba(245,247,250,0.62)',
      fadeFrom: 'rgba(12,17,22,0)',
      fadeMid: 'rgba(12,17,22,0.72)',
      accent: '#7FBCEE',
      accentSoft: '#0F1A24',
      accentFg: '#7FBCEE',
      onAccent: '#090F15',
      rose: '#7FBCEE',
      roseSoft: '#0F1A24',
      heroSoft: '#0F1A24',
      plum: '#0F3357',
      gradGold: ['#7FBCEE', '#63A3E3'],
      gradPlum: ['#15426F', '#0F3357'],
      gradHero: ['#0C1116', '#161D24'],
      gradRose: ['#15426F', '#0F3357'],
    },
  },

  lacivert: {
    etiket: 'profile.accent.lacivert',
    ornek: '#22356E',
    light: {
      bg: '#EAEDF6',
      bgSunken: '#DEE3F1',
      surface: '#FCFCFE',
      surfaceMuted: '#F1F3F9',
      ink: '#14161C',
      inkSoft: '#353945',
      muted: '#565B69',
      line: '#CCD2E6',
      lineStrong: '#B4BDD7',
      inverse: '#0E1425',
      onInverse: '#F5F6FA',
      onInverseMuted: 'rgba(245,246,250,0.66)',
      fadeFrom: 'rgba(234,237,246,0)',
      fadeMid: 'rgba(234,237,246,0.72)',
      accent: '#22356E',
      accentSoft: '#F3F5FC',
      accentFg: '#22356E',
      onAccent: '#FFFFFF',
      rose: '#22356E',
      roseSoft: '#F3F5FC',
      heroSoft: '#E0E6F5',
      plum: '#0D2A82',
      gradGold: ['#2354E7', '#22356E'],
      gradPlum: ['#11349C', '#0D2A82'],
      gradHero: ['#EAEDF6', '#E0E6F5'],
      gradRose: ['#11349C', '#0D2A82'],
    },
    dark: {
      bg: '#0C0E16',
      bgSunken: '#12151F',
      surface: '#161A24',
      surfaceMuted: '#1F2330',
      ink: '#F0F2F7',
      inkSoft: '#D3D6DF',
      muted: '#9A9FAC',
      line: '#2D313E',
      lineStrong: '#3D4252',
      inverse: '#29365B',
      onInverse: '#F5F6FA',
      onInverseMuted: 'rgba(245,246,250,0.62)',
      fadeFrom: 'rgba(12,14,22,0)',
      fadeMid: 'rgba(12,14,22,0.72)',
      accent: '#94A5DC',
      accentSoft: '#0F1424',
      accentFg: '#94A5DC',
      onAccent: '#090C15',
      rose: '#94A5DC',
      roseSoft: '#0F1424',
      heroSoft: '#0F1424',
      plum: '#0F2157',
      gradGold: ['#94A5DC', '#6383E3'],
      gradPlum: ['#152C6F', '#0F2157'],
      gradHero: ['#0C0E16', '#161A24'],
      gradRose: ['#152C6F', '#0F2157'],
    },
  },

  petrol: {
    etiket: 'profile.accent.petrol',
    ornek: '#0A748A',
    light: {
      bg: '#EAF4F6',
      bgSunken: '#DEEEF1',
      surface: '#FCFEFE',
      surfaceMuted: '#F1F7F9',
      ink: '#141B1C',
      inkSoft: '#354345',
      muted: '#566669',
      line: '#CCE1E6',
      lineStrong: '#B4D1D7',
      inverse: '#0E2125',
      onInverse: '#F5F9FA',
      onInverseMuted: 'rgba(245,249,250,0.66)',
      fadeFrom: 'rgba(234,244,246,0)',
      fadeMid: 'rgba(234,244,246,0.72)',
      accent: '#0A748A',
      accentSoft: '#F3FAFC',
      accentFg: '#0A748A',
      onAccent: '#FFFFFF',
      rose: '#0A748A',
      roseSoft: '#F3FAFC',
      heroSoft: '#DDF0F4',
      plum: '#0B5F6F',
      gradGold: ['#10798E', '#0A748A'],
      gradPlum: ['#0E6A7C', '#0B5F6F'],
      gradHero: ['#EAF4F6', '#DDF0F4'],
      gradRose: ['#0E6A7C', '#0B5F6F'],
    },
    dark: {
      bg: '#0C1416',
      bgSunken: '#121C1F',
      surface: '#162224',
      surfaceMuted: '#1F2D30',
      ink: '#F0F6F7',
      inkSoft: '#D3DDDF',
      muted: '#9AA9AC',
      line: '#2D3B3E',
      lineStrong: '#3D4F52',
      inverse: '#29535B',
      onInverse: '#F5F9FA',
      onInverseMuted: 'rgba(245,249,250,0.62)',
      fadeFrom: 'rgba(12,20,22,0)',
      fadeMid: 'rgba(12,20,22,0.72)',
      accent: '#5AC3D8',
      accentSoft: '#0F2024',
      accentFg: '#5AC3D8',
      onAccent: '#091315',
      rose: '#5AC3D8',
      roseSoft: '#0F2024',
      heroSoft: '#0F2024',
      plum: '#0F4B57',
      gradGold: ['#5AC3D8', '#63CEE3'],
      gradPlum: ['#15606F', '#0F4B57'],
      gradHero: ['#0C1416', '#162224'],
      gradRose: ['#15606F', '#0F4B57'],
    },
  },

  zumrut: {
    etiket: 'profile.accent.zumrut',
    ornek: '#1F6B4F',
    light: {
      bg: '#EAF6F2',
      bgSunken: '#DEF1EA',
      surface: '#FCFEFD',
      surfaceMuted: '#F1F9F6',
      ink: '#141C19',
      inkSoft: '#35453F',
      muted: '#566962',
      line: '#CCE6DC',
      lineStrong: '#B4D7CA',
      inverse: '#0E251D',
      onInverse: '#F5FAF8',
      onInverseMuted: 'rgba(245,250,248,0.66)',
      fadeFrom: 'rgba(234,246,242,0)',
      fadeMid: 'rgba(234,246,242,0.72)',
      accent: '#1F6B4F',
      accentSoft: '#F3FCF8',
      accentFg: '#1F6B4F',
      onAccent: '#FFFFFF',
      rose: '#1F6B4F',
      roseSoft: '#F3FCF8',
      heroSoft: '#D9F2E9',
      plum: '#0A6644',
      gradGold: ['#0E8157', '#1F6B4F'],
      gradPlum: ['#0C6E4A', '#0A6644'],
      gradHero: ['#EAF6F2', '#D9F2E9'],
      gradRose: ['#0C6E4A', '#0A6644'],
    },
    dark: {
      bg: '#0C1612',
      bgSunken: '#121F1A',
      surface: '#16241F',
      surfaceMuted: '#1F302A',
      ink: '#F0F7F4',
      inkSoft: '#D3DFDA',
      muted: '#9AACA6',
      line: '#2D3E38',
      lineStrong: '#3D524A',
      inverse: '#295B49',
      onInverse: '#F5FAF8',
      onInverseMuted: 'rgba(245,250,248,0.62)',
      fadeFrom: 'rgba(12,22,18,0)',
      fadeMid: 'rgba(12,22,18,0.72)',
      accent: '#7FD3AE',
      accentSoft: '#0F241C',
      accentFg: '#7FD3AE',
      onAccent: '#091511',
      rose: '#7FD3AE',
      roseSoft: '#0F241C',
      heroSoft: '#0F241C',
      plum: '#0F573D',
      gradGold: ['#7FD3AE', '#63E3B4'],
      gradPlum: ['#156F4E', '#0F573D'],
      gradHero: ['#0C1612', '#16241F'],
      gradRose: ['#156F4E', '#0F573D'],
    },
  },
};

/** Bilinmeyen bir anahtar (eski sürümden kalan kayıt) varsayılana düşer. */
export function aksanCoz(deger: string | null | undefined): AksanAnahtari {
  return AKSAN_ANAHTARLARI.includes(deger as AksanAnahtari)
    ? (deger as AksanAnahtari)
    : VARSAYILAN_AKSAN;
}
