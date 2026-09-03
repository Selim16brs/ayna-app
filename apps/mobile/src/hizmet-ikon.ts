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
  // spa · body_contouring · hair_health · style · wellness · other
  //   → ÇİZİM YOK, aşağıdaki nota bakınız.
};

/**
 * ── ÇİZİMİ OLMAYAN KATEGORİLER ──────────────────────────────────────────
 *
 * Katalog 13 kategori, elde 10 çizim var ve ikisi (kalıcı makyaj, gelin)
 * artık kategori değil Makyaj'ın alt hizmeti. Karşılıksız kalan altı
 * kategori: Spa & Hamam, Vücut Şekillendirme, Saç Sağlığı, İmaj & Stil,
 * Wellness, Diğer.
 *
 * BURAYA UYDURMA ÇİZİM KONMADI. Mevcut ikonlar elle çizilmiş; onları
 * taklit eden üretilmiş bir görsel yanlarında yamalı durur. Eşlemede
 * olmayan kimlik `HizmetIkonu` içinde kategorinin Ionicons yedeğine
 * düşüyor — kategori ekranda EKSİKSİZ çıkıyor, yalnız çizgi tarzı farklı.
 *
 * Tasarımcıdan dosyalar geldiğinde yapılacak tek iş bu nesneye satır
 * eklemek; hiçbir ekran değişmiyor.
 *
 * `kalici-makyaj.png` ve `gelin.png` dosyaları DURUYOR: karşılıkları
 * (`makeup.pmu`, `makeup.bridal`) alt hizmet olarak katalogda yaşıyor ve
 * alt hizmet ikonları açıldığında kullanılacaklar. `kas.png` de duruyor —
 * Kirpik & Kaş birleşti, şimdilik kirpik çizimi temsil ediyor.
 */

/** Eşlemede olmayan kategori için ikon yok — çağıran taraf gizlemeli. */
export const hizmetIkonu = (id: string): number | undefined => HIZMET_IKON[id];
