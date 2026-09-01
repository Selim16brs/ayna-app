/**
 * HİZMET İKONLARI — kurucunun Figma'da çizdiği görseller.
 *
 * Kurucu: "ıconlar benım figmada yaptıgım ıconlar degıl."
 *
 * Ionicons ile çizilmiş vektörler onun tasarladıkları DEĞİLDİ. Görseller
 * Figma'dan indirildi ve depoya alındı — Figma'nın asset bağlantıları 7 günde
 * ölüyor, dosyayı taşımasaydık ikonlar sessizce kaybolurdu.
 *
 * Burada tek kopya duruyor: keşfet, fotoğraflı teklif ve fiyat/talep ekranları
 * aynı eşlemeyi okuyor. Üç yerde üç kopya olsaydı biri güncellenip ötekiler
 * geride kalırdı.
 */
export const HIZMET_IKON: Record<string, number> = {
  hair: require('../assets/hizmet-ikon/sac.png'),
  nails: require('../assets/hizmet-ikon/tirnak.png'),
  lashes: require('../assets/hizmet-ikon/kirpik.png'),
  brows: require('../assets/hizmet-ikon/kas.png'),
  makeup: require('../assets/hizmet-ikon/makyaj.png'),
  skincare: require('../assets/hizmet-ikon/cilt.png'),
  epilation: require('../assets/hizmet-ikon/epilasyon.png'),
  spa: require('../assets/hizmet-ikon/masaj.png'),
  pmu: require('../assets/hizmet-ikon/kalici-makyaj.png'),
  bridal: require('../assets/hizmet-ikon/gelin.png'),
};

/** Eşlemede olmayan kategori için ikon yok — çağıran taraf gizlemeli. */
export const hizmetIkonu = (id: string): number | undefined => HIZMET_IKON[id];
