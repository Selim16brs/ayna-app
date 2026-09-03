/**
 * ARAMA ANAHTARI — metni karşılaştırılabilir hâle getirir.
 *
 * TEK KOPYA. Uygulamanın üç dilli araması ve sunucunun regüle hizmet
 * taraması aynı işlemi yapıyor; iki ayrı kopya olsaydı biri düzeltilip
 * öteki bozuk kalırdı. Nitekim tam bu oldu: aşağıdaki Unicode kuralı
 * yalnız bir tarafta düzeltilmişti.
 *
 * ── TÜRKÇE "İ" TUZAĞI ───────────────────────────────────────────────────
 *
 * `'İ'.toLowerCase()` JavaScript'te TEK harf değil İKİ kod noktası
 * üretiyor: 'i' + U+0307 (birleşen nokta). Küçültmeden SONRA harf
 * değiştiren bir kod o noktayı bırakıyor ve "di̇ş" ile "diş" eşleşmiyor.
 *
 * Sonuç görünmez ama ağır: klavyeden BÜYÜK HARF yazan kullanıcı hiçbir
 * sonuç alamıyordu — "MANİKÜR" araması boş dönüyordu.
 *
 * Ayrıca `toLocaleLowerCase('tr-TR')` KULLANILMIYOR: "MANIKÜR"ü "manıkür"
 * yapıp katalogdaki "manikür"le eşleşmesini engelliyor. Aramada ı/i ayrımı
 * bilgi taşımıyor, yalnız eşleşmeyi bozuyor; dördü tek harfe indiriliyor.
 */
export function aramaAnahtari(s: string): string {
  return (
    (s ?? '')
      // SIRA KRİTİK: büyük İ/I küçültmeden ÖNCE sadeleşiyor.
      .replace(/[İI]/g, 'i')
      .toLowerCase()
      .replace(/ı/g, 'i')
      // Başka bir yerden küçültülmüş olarak gelen İ için kalan nokta.
      .replace(/̇/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  );
}
