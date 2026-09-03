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
  lashes_brows: require('../assets/hizmet-ikon/kirpik.png'),
  epilation: require('../assets/hizmet-ikon/epilasyon.png'),
  skin: require('../assets/hizmet-ikon/cilt.png'),
  makeup: require('../assets/hizmet-ikon/makyaj.png'),
  massage: require('../assets/hizmet-ikon/masaj.png'),
  // Figma `ayna-new-categories-dark` — kurucunun çizdirdiği altı yeni ikon.
  spa: require('../assets/hizmet-ikon/spa.png'),
  body_contouring: require('../assets/hizmet-ikon/vucut-sekillendirme.png'),
  hair_health: require('../assets/hizmet-ikon/sac-sagligi.png'),
  style: require('../assets/hizmet-ikon/imaj-stil.png'),
  wellness: require('../assets/hizmet-ikon/wellness.png'),
  other: require('../assets/hizmet-ikon/diger.png'),
};

/**
 * ── SET TAMAMLANDI ──────────────────────────────────────────────────────
 *
 * On üç kategorinin on üçünün de çizimi var. Eksik altısı kurucunun
 * Figma'daki `ayna-new-categories-dark` bölümünden geldi ve mevcut yedinin
 * biçimine getirildi: 192×192, şeffaf zemin, aynı erguvan çizgi rengi.
 *
 * Kaynak görseller AÇIK ÇİZGİ / KOYU ZEMİN idi (karanlık tema tasarımı).
 * Uygulama ikonu açık bir kutunun üstüne çiziyor; zemin şeffaflaştırılıp
 * çizgi rengi mevcut setle aynı değere getirildi. Ham hâlleriyle konsaydı
 * açık kutunun üstünde görünmezlerdi.
 *
 * `kalici-makyaj.png` ve `gelin.png` duruyor: karşılıkları (`makeup.pmu`,
 * `makeup.bridal`) alt hizmet olarak katalogda yaşıyor ve alt hizmet
 * ikonları açıldığında kullanılacaklar. `kas.png` de duruyor — Kirpik & Kaş
 * birleşti, şimdilik kirpik çizimi temsil ediyor.
 */

/** Eşlemede olmayan kategori için ikon yok — çağıran taraf gizlemeli. */
export const hizmetIkonu = (id: string): number | undefined => HIZMET_IKON[id];
