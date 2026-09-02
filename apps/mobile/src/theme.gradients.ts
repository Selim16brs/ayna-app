/**
 * GRADYAN TOKEN'LARI — saf modül.
 *
 * `theme.ts` react-native'i içe aktarıyor (Platform), o yüzden Node testinde
 * çözülemiyor. Gradyanlar `theme.palette.ts` gibi burada duruyor ki
 * kontrastları ÖLÇÜLEBİLSİN (`gradyan-kontrast.test.ts`). `theme.ts` bunları
 * yeniden dışa aktarıyor — çağıran taraf için hiçbir şey değişmedi.
 */

// ── Gradyanlar ───────────────────────────────────────────────────────────
export const lightGradients = {
  hero: ['#F8F4F5', '#F6ECF4'] as const, // zemin → pembe sis
  /**
   * BİRİNCİL DÜĞME — ayna.salon'daki gibi PEMBE.
   *
   * Sitede `--pink` eylem rengi (bağlantı, birincil düğme, aktif sekme),
   * `--plum` ise derin yüzey (öne çıkan kart, bölüm zemini). Uygulamada
   * ikisi de erikti; her düğme, her çip ve her kart aynı koyu tonda olunca
   * ekran ağırlaşıyordu — kurucunun "çok dark" dediği şey buydu.
   *
   * Sitenin canlı pembesi (#DE3370) beyaz yazıyla 4.36:1 veriyor — eşiğin
   * altında. Gradyanın AÇIK ucu #DD2A6A: aynı ton (339°), yalnız iki puan
   * koyu, 4.55:1. Gözle ayırt edilmiyor ama okunuyor. Koyu uç sitenin
   * kendi `--pink-dark` değeri.
   *
   * Renk uydurulmadı: sitenin tonu korunup parlaklığı eşiğe kadar indirildi.
   */
  gold: ['#DD2A6A', '#BC245B'] as const,
  /**
   * ACİL / ÇEKİLİŞ kartı. Üstüne beyaz yazı geliyordu ve en açık ucunda
   * 2.94:1 ölçülüyordu — okunmuyordu. Bu çift 5.72:1 veriyor.
   */
  rose: ['#A34A57', '#83323F'] as const,
  // DERİN YÜZEY — sitedeki `--plum`. Ekran başına tek koyu kart burada.
  plum: ['#6A0D66', '#50094D'] as const,
} as const;

export const darkGradients: GradientTokens = {
  hero: ['#0F0B10', '#1A141C'] as const,
  /**
   * BİRİNCİL DÜĞME — koyuda da ERİK.
   *
   * Burası gül (#D4A0A0→#B0616B) idi ve iki sorunu vardı:
   *   · Yazı (`onAccent` = #18061C) üstünde 4.41:1 — 4.5 eşiğinin altında.
   *   · Aynı düğme açık temada erik, koyu temada güldü; marka rengi
   *     temaya göre değişiyordu.
   * Bu çift 5.81:1 veriyor ve koyu zeminden de 5.81:1 ayrışıyor.
   * `rose` gradyanı DURUYOR — orası acil/sayaç, gül orada anlam taşıyor.
   */
  // Koyuda pembe AÇILIR + koyu yazı: 8.15:1.
  gold: ['#FF7FA8', '#F26191'] as const,
  /**
   * Koyuda AÇIK gül + koyu yazı — birincil düğmeyle aynı mantık.
   * Koyu gül koyu zeminden ayrışmıyordu (2.30:1); açık gül hem yazıyı
   * taşıyor (6.78:1) hem zeminden ayrışıyor (6.78:1).
   */
  rose: ['#E8A0AA', '#D4818E'] as const,
  // Plum DOLU BİR YÜZEY ve üstüne HER ZAMAN beyaz yazı geliyor (7 ekran).
  // Koyuda accent'i açmak metin/ikon için doğru, dolu yüzey için değil:
  // '#AA9AC4' üstünde beyaz 2.58:1 ölçülüyor — okunmuyor. Bu çift 7.72:1
  // veriyor ve koyu zeminden (#1A1419) yine ayrışıyor.
  plum: ['#4E0C4B', '#3A0838'] as const,
};

export type GradientTokens = { [K in keyof typeof lightGradients]: readonly [string, string] };

// ── AKSAN SETİ UYGULAMA ─────────────────────────────────────────────────
// `paletUret` ile aynı mantık: dört gradyanın dördü de setten geliyor.
// `hero` sayfa sisi, `gold` birincil düğme, `plum` derin yüzey, `rose`
// acil/sayaç kartı.

import { AKSANLAR, type AksanAnahtari, VARSAYILAN_AKSAN } from './theme.aksan';

export function gradyanUret(
  mode: 'light' | 'dark',
  aksan: AksanAnahtari = VARSAYILAN_AKSAN,
): GradientTokens {
  const taban = mode === 'dark' ? darkGradients : lightGradients;
  const s = AKSANLAR[aksan][mode];
  return {
    ...taban,
    gold: s.gradGold,
    plum: s.gradPlum,
    hero: s.gradHero,
    rose: s.gradRose,
  };
}
