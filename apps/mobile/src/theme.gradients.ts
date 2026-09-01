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
  hero: ['#FAF7F5', '#E8D9EB'] as const, // zemin → lila
  gold: ['#642855', '#4A1942'] as const, // ana CTA: mürdüm ombre (isim geriye dönük)
  rose: ['#C8848C', '#B0616B'] as const, // acil / sayaç kartı
  teal: ['#3E9560', '#2F7A4A'] as const, // onay
  plum: ['#642855', '#4A1942'] as const,
} as const;

export const darkGradients: GradientTokens = {
  hero: ['#18061C', '#26102A'] as const,
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
  gold: ['#C5A3C7', '#A87FAB'] as const,
  rose: ['#D4A0A0', '#B0616B'] as const,
  teal: ['#3E9560', '#2F7A4A'] as const,
  // Plum DOLU BİR YÜZEY ve üstüne HER ZAMAN beyaz yazı geliyor (7 ekran).
  // Koyuda accent'i açmak metin/ikon için doğru, dolu yüzey için değil:
  // '#AA9AC4' üstünde beyaz 2.58:1 ölçülüyor — okunmuyor. Bu çift 7.72:1
  // veriyor ve koyu zeminden (#1A1419) yine ayrışıyor.
  plum: ['#642855', '#4A1942'] as const,
};

export type GradientTokens = { [K in keyof typeof lightGradients]: readonly [string, string] };
