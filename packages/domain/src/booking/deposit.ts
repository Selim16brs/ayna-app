// Kapora tutarı — tek doğruluk kaynağı.
//
// Karar K1 (26.08.2026): kapora sabit değil, hizmet bedeliyle orantılıdır.
//
//     kapora = clamp(round100(fiyat × %10), alt sınır, üst sınır)
//
// Bu dosyadan önce hesap İKİ yerde ayrı ayrı yaşıyordu:
//   · `bookings.service.ts` — oranlı (%20 varsayılan), 100 ₸'ye yuvarlamalı
//   · `quotes.service.ts`   — düz sabit `rate.deposit_kzt` (1.000 ₸)
// Yani uzmanın onayladığı randevuyla müşterinin teklif seçtiği randevu aynı
// fiyata FARKLI kapora istiyordu. Her iki yol da artık buraya bağlanıyor.
//
// Gelir şartnamesi §10.1'deki "1.000 ₸" örneği K1 ile düzeltilmiş sayılır:
// 20.000 ₸'lik bir hizmette kapora 2.000 ₸ olur.

export type DepositRules = {
  /** Yüzde — 10 => %10. */
  pct: number;
  /** Alt sınır (₸). Fiyat ne kadar düşük olursa olsun kapora bunun altına inmez. */
  minKzt: number;
  /** Üst sınır (₸). Fiyat ne kadar yüksek olursa olsun kapora bunu aşmaz. */
  maxKzt: number;
  /** Yuvarlama adımı (₸). Kullanıcıya "1.556 ₸" değil "1.600 ₸" gösterilir. */
  stepKzt: number;
  /**
   * Depozito fiyatın EN FAZLA yüzde kaçı olabilir.
   *
   * Karar K2 (31.08.2026): depozito bir ÖN ödemedir; kalanı hizmetten sonra
   * ödenir. Yani her zaman bir kalan olmalıdır.
   *
   * Bu tavan olmadan alt sınır (`minKzt`) fiyatın kendisini aşabiliyordu:
   *   1.000 ₸ hizmet → depozito 1.000 ₸  (tamamı, kalan 0)
   *     800 ₸ hizmet → depozito 1.000 ₸  (fiyattan FAZLA, kalan −200)
   * Ekran kalanı `Math.max(0, ...)` ile gösterdiği için eksi değer görünmüyor,
   * kullanıcı da "depozito diye ücretin tamamı alınıyor" diyordu.
   */
  maxSharePct: number;
};

export const DEFAULT_DEPOSIT_RULES: DepositRules = {
  pct: 10,
  minKzt: 1000,
  maxKzt: 5000,
  stepKzt: 100,
  maxSharePct: 50,
};

/** Admin ayarlarının anahtarları — servisler bu listeyi tek sorguda okur. */
export const DEPOSIT_SETTING_KEYS = [
  'rate.deposit_pct',
  'rate.deposit_min',
  'rate.deposit_max',
  'rate.deposit_max_share_pct',
] as const;

/**
 * Hizmet bedelinden kapora tutarını hesaplar.
 *
 * Sonuç her zaman tam sayı ₸'dir ve `stepKzt`'nin katıdır. Sınırlar adımdan
 * bağımsız uygulanır: alt/üst sınır adımın katı olmasa bile tam olarak
 * korunur — admin 1.250 ₸ alt sınır girdiyse kapora 1.250 ₸'nin altına inmez.
 *
 * Geçersiz girdi (NaN, sonsuz, sıfır/negatif fiyat veya oran) alt sınıra
 * düşer: kapora akışını sessizce sıfırlayıp randevunun kaporasız doğmasındansa
 * taban tutar istenir.
 */
export function depositFor(price: number, rules: DepositRules = DEFAULT_DEPOSIT_RULES): number {
  const min = Math.max(0, Math.round(rules.minKzt));
  // Üst sınır alt sınırın altına ayarlanmışsa (yanlış admin girdisi) alt sınır
  // kazanır — aksi hâlde clamp ters çalışır ve min'i de ezerdi.
  const max = Math.max(min, Math.round(rules.maxKzt));
  const step = Number.isFinite(rules.stepKzt) && rules.stepKzt >= 1 ? Math.round(rules.stepKzt) : 1;

  if (!Number.isFinite(price) || price <= 0) return min;
  if (!Number.isFinite(rules.pct) || rules.pct <= 0) return min;

  const raw = (price * rules.pct) / 100;
  const stepped = Math.round(raw / step) * step;
  const clamped = Math.min(max, Math.max(min, stepped));

  // K2 — TAVAN: depozito fiyatın belirli bir payını aşamaz, çünkü kalan mutlaka
  // hizmetten sonra ödenecek. Alt sınır fiyatın üstüne çıkabildiği için bu
  // tavan clamp'ten SONRA uygulanır; aksi hâlde min onu yine ezerdi.
  const pay = Number.isFinite(rules.maxSharePct) ? rules.maxSharePct : 100;
  if (pay <= 0 || pay >= 100) return clamped; // tavan kapalı → eski davranış
  const tavan = Math.floor((price * pay) / 100);
  if (clamped <= tavan) return clamped;
  // Tavan adımdan küçükse adıma yuvarlamak 0 üretirdi (ucuz hizmette depozito
  // tamamen kaybolur); o durumda tavanın kendisi kullanılır.
  return tavan >= step ? Math.floor(tavan / step) * step : tavan;
}

/**
 * Admin `Setting` satırlarından kural nesnesi kurar.
 * Eksik/boş anahtar varsayılana düşer; `rate.deposit_kzt` (eski düz tutar)
 * yalnızca alt sınır için geriye dönük yedek olarak okunur.
 */
export function depositRulesFrom(
  settings: ReadonlyArray<{ key: string; intValue: number | null }>,
  fallback: DepositRules = DEFAULT_DEPOSIT_RULES,
): DepositRules {
  const val = (k: string) => {
    const v = settings.find((s) => s.key === k)?.intValue;
    return typeof v === 'number' && Number.isFinite(v) ? v : null;
  };
  return {
    pct: val('rate.deposit_pct') ?? fallback.pct,
    minKzt: val('rate.deposit_min') ?? val('rate.deposit_kzt') ?? fallback.minKzt,
    maxKzt: val('rate.deposit_max') ?? fallback.maxKzt,
    stepKzt: fallback.stepKzt,
    maxSharePct: val('rate.deposit_max_share_pct') ?? fallback.maxSharePct,
  };
}
