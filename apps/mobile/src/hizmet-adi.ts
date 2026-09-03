import { TAXONOMY, findServiceWithCategory, tri, type TaxLocale } from './taxonomy';

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

/**
 * KAYITLI HİZMET METNİNDEN KATEGORİYİ BULUR — brief §4.8.
 *
 * "Her randevu kartında ilgili hizmetin kategori ikonu + alt hizmet adı
 * görünür."
 *
 * `Booking.service` hizmetin KİMLİĞİNİ değil METNİNİ saklıyor (yukarıdaki
 * nota bakınız). Kategoriyi bulmak için aynı ters dizin kullanılıyor:
 * metin katalogda varsa kimliği, kimlikten de kategorisi çıkıyor.
 *
 * BİRLEŞİK ETİKETTE İLK PARÇA belirliyor ("Kesim & fön + Manikür" → saç).
 * İkon tek; iki kategoriyi tek ikonla anlatmanın yolu yok ve ilk hizmet
 * randevunun ana işi.
 *
 * KATALOG DIŞI metinde `undefined` — çağıran ikonu ÇİZMEMELİ. Rastgele
 * bir kategori ikonu koymak, uzmanın serbest yazdığı bir hizmeti yanlış
 * kategoriye ait göstermek olurdu.
 */
export function hizmetKategorisi(etiket: string): string | undefined {
  const ham = (etiket ?? '').trim();
  if (!ham) return undefined;
  const ilk = ham.includes(' + ') ? ham.split(' + ')[0]! : ham;
  const id = TERS_DIZIN.get(anahtar(ilk));
  return id ? findServiceWithCategory(id)?.category.id : undefined;
}

/**
 * W2W GÖNDERİSİNİN KATEGORİSİNİ ÇÖZER — brief §4.10.
 *
 * "Memnuniyet paylaşımı kartında hizmetin kategori etiketi/ikonu yer alır."
 *
 * `CirclePost.category` iki biçimde olabilir: KOD (`hair`) ya da o anki
 * dilde yazılmış ETİKET ("Saç"). Gönderi oluşturma ekranı etiketi
 * saklıyordu; arayüz dili değişince aynı gönderi filtrelerin dışında
 * kalıyordu.
 *
 * Her iki biçim de çözülüyor — eski gönderiler kaybolmasın diye. Yeni
 * gönderiler kodu saklıyor.
 */
export function gonderiKategorisi(deger: string): string | undefined {
  const ham = (deger ?? '').trim();
  if (!ham) return undefined;
  // Önce kod: en yaygın ve en ucuz durum.
  if (TAXONOMY.some((c) => c.id === ham)) return ham;
  // Sonra ÜÇ DİLDE etiket — arayüz dili ne olursa olsun eşleşmeli.
  const a = anahtar(ham);
  for (const c of TAXONOMY) {
    for (const dil of ['tr', 'kk', 'ru'] as const) {
      if (anahtar(c.ad[dil]) === a) return c.id;
    }
  }
  return undefined;
}
