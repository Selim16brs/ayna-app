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
