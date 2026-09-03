/**
 * BÖLGE ADI — kayıtlardaki iki yazımı tek ada indirir.
 *
 * Aynı bölge veritabanında iki biçimde duruyor:
 *   · tohum verisi  → "Almatı · Bostandık"
 *   · canlı kayıtlar → "Bostandyk"
 *
 * Ayıklanmazsa harita seçicisinde aynı bölge İKİ ayrı seçenek olarak
 * çıkıyor ve her biri kayıtların yalnız bir kısmını gösteriyordu.
 *
 * Bileşenden AYRI duruyor ki gerçek girdilerle denenebilsin: ilk yazımda
 * mantık ekranın içindeydi ve testi ancak metin arayarak koruyabiliyordum
 * — mutasyon denemesinde o bekçi hatayı yakalayamadı.
 */
export function bolgeAdi(district: string, city: string): string {
  const ham = (district ?? '').trim();
  if (!ham) return '';
  // "Şehir · Bölge" → "Bölge". Ayraç yoksa değer zaten bölge adıdır.
  const parcalar = ham
    .split('·')
    .map((x) => x.trim())
    .filter(Boolean);
  const son = parcalar[parcalar.length - 1] ?? '';
  // Değer şehrin kendi adıysa bölge bilgisi YOK demektir ("Almatı" ilçe
  // değil). Boş dönüyoruz; çağıran taraf seçenek listesine koymuyor.
  if (!son || son.localeCompare(city.trim(), 'tr', { sensitivity: 'base' }) === 0) return '';
  return son;
}
