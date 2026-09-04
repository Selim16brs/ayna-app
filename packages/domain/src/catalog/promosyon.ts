/**
 * PROMOSYONLAR — uzmanın kendi açtığı kampanyalar.
 *
 * Kurucu: "uzman panelinden oluşturulan promosyonlar, fırsatlar alanında
 * gösterilmesin. fırsatlar ve senin için seçtiklerim parayla sattığımız
 * alan ama uzmanın açtığı promosyonlar o uzmana AYNA'nın sağladığı bir
 * reklam alanı… ayrı bir sekmede müşteriye promosyonlar alanı
 * gösterilmeli, en yakın lokasyondaki 4 promosyon ekranda görünüp
 * diğerleri için tümü butonu olmalı."
 *
 * ── İKİSİ AYNI ŞEY DEĞİL ────────────────────────────────────────────────
 *
 * "Senin için seçtiklerim" ve "Fırsatlar" ÖDENMİŞ vitrin: yerleşimi
 * satın alan belirliyor. Promosyon ise uzmanın üyeliğiyle gelen hak.
 * İkisini aynı şeritte göstermek, ödeyenin aldığı yeri ücretsiz
 * dağıtmak olurdu.
 */

export type PromosyonSiralama = 'yakinlik' | 'puan' | 'indirim';

export interface PromosyonKarti {
  id: string;
  proId: string;
  proAd: string;
  proGorsel: string;
  /** Sağlayıcının puanı; değerlendirilmemişse null — "0,0" DEĞİL. */
  puan: number | null;
  sehir: string;
  /** Kullanıcıya uzaklık (km); konum bilinmiyorsa null. */
  mesafeKm: number | null;
  baslik: string;
  aciklama: string;
  indirimYuzde: number | null;
  gorsel: string | null;
  basEtiket: string;
  sonEtiket: string;
}

/** Ana ekranda gösterilecek promosyon sayısı — gerisi "Tümü" ekranında. */
export const ANA_EKRAN_PROMOSYON = 4;

/**
 * Sıralama.
 *
 * ── BİLİNMEYEN DEĞER HER ZAMAN SONA ────────────────────────────────────
 *
 * Mesafesi bilinmeyen bir promosyonu "0 km" sayıp başa koymak, kullanıcıya
 * en yakın sanıp yola çıkacağı bir şey göstermek olurdu. Puanı olmayan
 * uzmanı da "0 puan" sayıp sona atmak haksızlık: ikisi de BİLİNMİYOR ve
 * bilinenlerin arkasına diziliyor.
 */
export function promosyonlariSirala(
  liste: readonly PromosyonKarti[],
  sira: PromosyonSiralama,
): PromosyonKarti[] {
  const deger = (p: PromosyonKarti): number | null =>
    sira === 'yakinlik' ? p.mesafeKm : sira === 'puan' ? p.puan : p.indirimYuzde;
  // Yakınlıkta KÜÇÜK önce; puan ve indirimde BÜYÜK önce.
  const artan = sira === 'yakinlik';
  return [...liste].sort((a, b) => {
    const x = deger(a);
    const y = deger(b);
    if (x === null && y === null) return 0;
    if (x === null) return 1;
    if (y === null) return -1;
    return artan ? x - y : y - x;
  });
}
