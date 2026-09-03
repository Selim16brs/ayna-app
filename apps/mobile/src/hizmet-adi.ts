import { TAXONOMY, tri, type TaxLocale } from './taxonomy';

/**
 * KAYITLI HİZMET ADINI SEÇİLİ DİLE ÇEVİRİR.
 *
 * Kurucu: "uzman adının altındaki hizmetler kullanıcı arayüz dili değişse
 * de Türkçe kalıyor."
 *
 * SEBEP: `Booking.service` hizmetin KİMLİĞİNİ değil METNİNİ saklıyor —
 * randevu kurulurken etiket o anki dilde (pratikte Türkçe) yazılıp
 * dondurulyor. Metin bir kez yazıldıktan sonra çevrilecek bir bağ kalmıyor.
 *
 * ÇÖZÜM: taksonomiden TERS DİZİN kuruluyor. Katalogdaki her hizmetin üç
 * dildeki etiketi de kimliğine bağlanıyor; kayıtlı metin bu dizinde
 * bulunursa seçili dilde yeniden yazılıyor.
 *
 * BİRLEŞİK ETİKETLER: çoklu hizmet " + " ile birleştiriliyor
 * ("Saç boyama (kök) + Keratin / Botoks"). Parçalara ayrılıp her biri
 * ayrı çevriliyor, sonra aynı ayraçla birleştiriliyor.
 *
 * ── NEYİ ÇEVİRMEZ ───────────────────────────────────────────────────────
 * Uzmanın kendi yazdığı serbest hizmet adları. Onlar katalogda yok ve
 * çevirileri de yok; uydurmak yerine OLDUĞU GİBİ bırakılıyor. Yanlış bir
 * çeviri üretmektense kaynağın kendi sözcüğünü göstermek doğru.
 *
 * Kalıcı çözüm randevunun hizmet KİMLİKLERİNİ de saklaması; bu modül
 * geçmiş kayıtları ve serbest metinleri kurtarıyor.
 */

/** "Etiket (herhangi bir dilde)" → hizmet kimliği. */
const TERS_DIZIN: Map<string, string> = (() => {
  const m = new Map<string, string>();
  for (const kategori of TAXONOMY) {
    for (const hizmet of kategori.services) {
      for (const dil of ['tr', 'kk', 'ru'] as const) {
        // Anahtar normalize: baştaki/sondaki boşluk ve büyük/küçük fark
        // kayıtlarda oynayabiliyor.
        m.set(anahtar(hizmet.label[dil]), hizmet.id);
      }
    }
  }
  return m;
})();

/** Kimlik → etiket (üç dil). */
const ETIKETLER: Map<string, { tr: string; kk: string; ru: string }> = (() => {
  const m = new Map<string, { tr: string; kk: string; ru: string }>();
  for (const kategori of TAXONOMY) {
    for (const hizmet of kategori.services) m.set(hizmet.id, hizmet.label);
  }
  return m;
})();

function anahtar(s: string): string {
  return s.trim().toLocaleLowerCase('tr-TR');
}

/**
 * Tek bir hizmet adını çevirir. Katalogda yoksa aynen döner.
 */
export function hizmetAdiCevir(ad: string, locale: string): string {
  const ham = (ad ?? '').trim();
  if (!ham) return ham;
  const id = TERS_DIZIN.get(anahtar(ham));
  if (!id) return ham;
  const etiket = ETIKETLER.get(id);
  return etiket ? tri(etiket, locale as TaxLocale) : ham;
}

/**
 * Birleşik hizmet etiketini çevirir ("A + B" → "Ç + D").
 *
 * Ayraç KORUNUYOR: parçalar arasındaki " + " kullanıcıya "iki hizmet"
 * diyor; kaybolursa tek uzun bir ad gibi okunur.
 */
export function hizmetEtiketiCevir(etiket: string, locale: string): string {
  const ham = (etiket ?? '').trim();
  if (!ham) return ham;
  // Yalnız " + " ayracı bölünüyor. Hizmet adlarının KENDİSİNDE de "/" ve
  // "&" geçiyor ("Keratin / Botoks", "Kesim & fön") — onlardan bölmek
  // adı ortadan ikiye keserdi.
  if (!ham.includes(' + ')) return hizmetAdiCevir(ham, locale);
  return ham
    .split(' + ')
    .map((p) => hizmetAdiCevir(p, locale))
    .join(' + ');
}
