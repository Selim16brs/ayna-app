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
  /** Yüzde — 10 => %10. TEK parametre budur. */
  pct: number;
};

export const DEFAULT_DEPOSIT_RULES: DepositRules = { pct: 10 };

/** Admin ayarlarının anahtarları — servisler bu listeyi tek sorguda okur. */
export const DEPOSIT_SETTING_KEYS = ['rate.deposit_pct'] as const;

/**
 * Hizmet bedelinden kapora tutarını hesaplar.
 *
 * Sonuç tam sayı ₸'dir. Kalan bakiye (%90) hizmetten sonra ödenir.
 */
export function depositFor(price: number, rules: DepositRules = DEFAULT_DEPOSIT_RULES): number {
  // TEK KURAL (kurucu, 31.08.2026): "kullanıcı randevu esnasında toplam işlem
  // ücretinin %10'unu öder. geri kalan bakiye ise uzman işlemi bitirdikten
  // sonra ödenir."
  //
  // ALT/ÜST SINIR VE TAVAN KALDIRILDI. Onlar yüzdenin üstüne binen İKİNCİ bir
  // kuraldı ve sonucu yüzde olmaktan çıkarıyordu:
  //   ·  1.000 ₸ hizmet → alt sınır 1.000 ₸ devreye girip TAMAMINI istiyordu
  //   · 100.000 ₸ hizmet → üst sınır 5.000 ₸ ile %5'e düşüyordu
  // Kullanıcıya "%10" denip başka tutar almak, para akışında birden fazla
  // kural demekti.
  if (!Number.isFinite(price) || price <= 0) return 0;
  const pct = Number.isFinite(rules.pct) && rules.pct > 0 ? rules.pct : DEFAULT_DEPOSIT_RULES.pct;
  // 100 ₸'ye YUVARLAMA DA KALDIRILDI: 500 ₸'lik hizmette %10 = 50 ₸ iken
  // yuvarlama 100 ₸ (yani %20) üretiyordu. Gösterimi güzelleştirmek için
  // yüzdeyi bozmak, "%10" demeyi yalan yapar. Tam ₸'ye yuvarlanır, o kadar.
  return Math.min(price, Math.max(0, Math.round((price * pct) / 100)));
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
  const v = settings.find((s) => s.key === 'rate.deposit_pct')?.intValue;
  return { pct: typeof v === 'number' && Number.isFinite(v) ? v : fallback.pct };
}
