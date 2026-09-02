/**
 * AKSAN SETLERİ — kullanıcının profilden seçtiği uygulama rengi.
 *
 * Kurucu kararı: "mevcut tasarımı hiç bozmadan sadece ama sadece renkleri
 * ayarlanabilir yapmak."
 *
 * Bu yüzden burada YALNIZCA renk var. Yerleşim, ölçü, yuvarlatma, boşluk ve
 * yazı tipi hiçbir sette değişmiyor — 128 ekran dosyasının hiçbirine
 * dokunulmadı. Ekranlar rengi zaten `useTheme()` üzerinden okuyor; değişen
 * tek şey o çağrının ne döndürdüğü.
 *
 * DEĞİŞEN TOKEN'LAR (aksan ailesi):
 *   accent · accentSoft · accentFg · heroSoft · plum
 *   gradyanlar: gold (birincil düğme) · plum (derin yüzey) · hero (sayfa sisi)
 *
 * DEĞİŞMEYENLER: zemin, kart, metin, çizgi ve ANLAM renkleri
 * (success yeşili, danger kırmızısı, gold kehribarı). Bunlar marka değil
 * durum bildiriyor; aksanla birlikte kayarlarsa "onaylandı" ile "iptal"
 * ayırt edilemez hâle gelir.
 *
 * Her değer iki temada da ölçüldü (`aksan-kontrast.test.ts`): en düşük
 * kontrast 4,52:1, eşik 4,5:1. Serbest renk seçimi YOK — kullanıcının
 * seçeceği rengi önceden ölçemeyeceğimiz için okunmaz kombinasyon üretme
 * riski var.
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

/** Varsayılan = bugünkü renk. Kullanıcı seçim yapmazsa hiçbir şey değişmez. */
export const VARSAYILAN_AKSAN: AksanAnahtari = 'gul';

/** Bir temadaki aksan ailesi. Alan adları `ColorTokens`/`GradientTokens` ile birebir. */
export interface AksanTemasi {
  accent: string;
  accentSoft: string;
  accentFg: string;
  heroSoft: string;
  plum: string;
  gradGold: readonly [string, string];
  gradPlum: readonly [string, string];
  gradHero: readonly [string, string];
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
   * GÜL — bugünkü renk, birebir.
   *
   * Değerler `theme.palette.ts` ve `theme.gradients.ts` içinden AYNEN
   * taşındı; tek bir tonu bile yeniden hesaplanmadı. Varsayılan set bu
   * olduğu için hiç kimse bir seçim yapmazsa uygulama bugünkü hâlinde kalır.
   */
  gul: {
    etiket: 'profile.accent.gul',
    ornek: '#BC245B',
    light: {
      accent: '#BC245B',
      accentSoft: '#FCE7EE',
      accentFg: '#BC245B',
      heroSoft: '#F6ECF4',
      plum: '#50094D',
      gradGold: ['#DD2A6A', '#BC245B'],
      gradPlum: ['#6A0D66', '#50094D'],
      gradHero: ['#F8F4F5', '#F6ECF4'],
    },
    dark: {
      accent: '#FF7FA8',
      accentSoft: '#33162A',
      accentFg: '#FF7FA8',
      heroSoft: '#2A1329',
      plum: '#3A0838',
      gradGold: ['#FF7FA8', '#F26191'],
      gradPlum: ['#4E0C4B', '#3A0838'],
      gradHero: ['#0F0B10', '#1A141C'],
    },
  },

  erik: {
    etiket: 'profile.accent.erik',
    ornek: '#6A1461',
    light: {
      accent: '#6A1461',
      accentSoft: '#FBEFFA',
      accentFg: '#6A1461',
      heroSoft: '#F6EEF6',
      plum: '#770D6D',
      gradGold: ['#CE27BD', '#6A1461'],
      gradPlum: ['#8C0F81', '#770D6D'],
      gradHero: ['#F8F4F5', '#F6EEF6'],
    },
    dark: {
      accent: '#D98BD2',
      accentSoft: '#2F132D',
      accentFg: '#D98BD2',
      heroSoft: '#3F1C3C',
      plum: '#570F51',
      gradGold: ['#D98BD2', '#E363D9'],
      gradPlum: ['#6B1264', '#570F51'],
      gradHero: ['#0F0B10', '#1A141C'],
    },
  },

  leylak: {
    etiket: 'profile.accent.leylak',
    ornek: '#633A8E',
    light: {
      accent: '#633A8E',
      accentSoft: '#F5EFFB',
      accentFg: '#633A8E',
      heroSoft: '#F2EEF6',
      plum: '#410D77',
      gradGold: ['#8351B8', '#633A8E'],
      gradPlum: ['#4E0F8C', '#410D77'],
      gradHero: ['#F8F4F5', '#F2EEF6'],
    },
    dark: {
      accent: '#BC9BDB',
      accentSoft: '#22132F',
      accentFg: '#BC9BDB',
      heroSoft: '#2E1C3F',
      plum: '#340F57',
      gradGold: ['#BC9BDB', '#A563E3'],
      gradPlum: ['#40126B', '#340F57'],
      gradHero: ['#0F0B10', '#1A141C'],
    },
  },

  bakir: {
    etiket: 'profile.accent.bakir',
    ornek: '#944A26',
    light: {
      accent: '#944A26',
      accentSoft: '#FBF3EF',
      accentFg: '#944A26',
      heroSoft: '#F6F1EE',
      plum: '#77310D',
      gradGold: ['#B75C2F', '#944A26'],
      gradPlum: ['#8C3A0F', '#77310D'],
      gradHero: ['#F8F4F5', '#F6F1EE'],
    },
    dark: {
      accent: '#E0A183',
      accentSoft: '#2F1C13',
      accentFg: '#E0A183',
      heroSoft: '#3F281C',
      plum: '#57260F',
      gradGold: ['#E0A183', '#E38C63'],
      gradPlum: ['#6B2E12', '#57260F'],
      gradHero: ['#0F0B10', '#1A141C'],
    },
  },

  gokyuzu: {
    etiket: 'profile.accent.gokyuzu',
    ornek: '#1466B8',
    light: {
      accent: '#1466B8',
      accentSoft: '#EFF5FB',
      accentFg: '#1466B8',
      heroSoft: '#EEF2F6',
      plum: '#0D4277',
      gradGold: ['#1775D4', '#1466B8'],
      gradPlum: ['#0F4E8C', '#0D4277'],
      gradHero: ['#F8F4F5', '#EEF2F6'],
    },
    dark: {
      accent: '#7FBCEE',
      accentSoft: '#13232F',
      accentFg: '#7FBCEE',
      heroSoft: '#1C303F',
      plum: '#0F3757',
      gradGold: ['#7FBCEE', '#63AAE3'],
      gradPlum: ['#12446B', '#0F3757'],
      gradHero: ['#0F0B10', '#1A141C'],
    },
  },

  lacivert: {
    etiket: 'profile.accent.lacivert',
    ornek: '#22356E',
    light: {
      accent: '#22356E',
      accentSoft: '#EFF2FB',
      accentFg: '#22356E',
      heroSoft: '#EEF0F6',
      plum: '#0D2877',
      gradGold: ['#4464C5', '#22356E'],
      gradPlum: ['#0F2F8C', '#0D2877'],
      gradHero: ['#F8F4F5', '#EEF0F6'],
    },
    dark: {
      accent: '#94A5DC',
      accentSoft: '#131A2F',
      accentFg: '#94A5DC',
      heroSoft: '#1C253F',
      plum: '#0F2057',
      gradGold: ['#94A5DC', '#6381E3'],
      gradPlum: ['#12286B', '#0F2057'],
      gradHero: ['#0F0B10', '#1A141C'],
    },
  },

  /**
   * PETROL — mavi-yeşil arası.
   *
   * İlk değeri (#0F6A72, ton 185°) `aksan-kontrast.test.ts`'in ayrım testini
   * kırdı: Zümrüt ile kanal farkı 52 idi, iki yuvarlak yan yana gözle
   * ayırt edilemiyordu. Ton 190°'ye çekildi — Zümrüt farkı 104, Gökyüzü
   * farkı 71. Kontrast düşmedi (beyaz yazıya karşı 5,00:1).
   */
  petrol: {
    etiket: 'profile.accent.petrol',
    ornek: '#087A91',
    light: {
      accent: '#087A91',
      accentSoft: '#EFF9FB',
      accentFg: '#087A91',
      heroSoft: '#EEF5F6',
      plum: '#0C5E6E',
      gradGold: ['#0B8098', '#087A91'],
      gradPlum: ['#0F697B', '#0C5E6E'],
      gradHero: ['#F8F4F5', '#EEF5F6'],
    },
    dark: {
      accent: '#5AC3D8',
      accentSoft: '#132A2F',
      accentFg: '#5AC3D8',
      heroSoft: '#1C3A3F',
      plum: '#0F4B57',
      gradGold: ['#5AC3D8', '#63CEE3'],
      gradPlum: ['#145967', '#0F4B57'],
      gradHero: ['#0F0B10', '#1A141C'],
    },
  },

  zumrut: {
    etiket: 'profile.accent.zumrut',
    ornek: '#1F6B4F',
    light: {
      accent: '#1F6B4F',
      accentSoft: '#EFFBF6',
      accentFg: '#1F6B4F',
      heroSoft: '#EEF6F3',
      plum: '#0B6544',
      gradGold: ['#268261', '#1F6B4F'],
      gradPlum: ['#0D7B53', '#0B6544'],
      gradHero: ['#F8F4F5', '#EEF6F3'],
    },
    dark: {
      accent: '#7FD3AE',
      accentSoft: '#132F23',
      accentFg: '#7FD3AE',
      heroSoft: '#1C3F30',
      plum: '#0F5738',
      gradGold: ['#7FD3AE', '#63E3AC'],
      gradPlum: ['#126B44', '#0F5738'],
      gradHero: ['#0F0B10', '#1A141C'],
    },
  },
};

/** Bilinmeyen bir anahtar (eski sürümden kalan kayıt) varsayılana düşer. */
export function aksanCoz(deger: string | null | undefined): AksanAnahtari {
  return AKSAN_ANAHTARLARI.includes(deger as AksanAnahtari)
    ? (deger as AksanAnahtari)
    : VARSAYILAN_AKSAN;
}
