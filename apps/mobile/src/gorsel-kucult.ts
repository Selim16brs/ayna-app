import * as ImageManipulator from 'expo-image-manipulator';

/**
 * GÖNDERİLECEK GÖRSELİ KÜÇÜLTÜR — sunucu sınırı aşılmasın diye.
 *
 * Sunucu gövde sınırı 15 MB. Telefon fotoğrafı `quality: 0.35` ile bile
 * birkaç MB olabiliyor ve base64 onu %33 daha büyütüyor; iki-üç belge
 * sınırı aşıp isteği düşürüyordu. Kurucunun "kimlik doğrulama gönder
 * dediğimde hata alıyorum" dediği yer burasıydı: KYC ekranı küçültmüyordu,
 * profil ve paylaşım ekranları küçültüyordu.
 *
 * Kural artık TEK YERDE: üç ekran da buradan geçiyor, biri unutulamaz.
 *
 * KÜÇÜLTME BAŞARISIZ OLURSA orijinal base64 dönüyor — gönderimi tamamen
 * engellemek, büyük olma İHTİMALİ yüzünden kesin bir kayıp olurdu.
 */
export async function kucultVeB64(
  uri: string,
  hamB64: string | null | undefined,
  genislik: number,
): Promise<string | null> {
  try {
    const kucuk = await ImageManipulator.manipulateAsync(uri, [{ resize: { width: genislik } }], {
      compress: 0.7,
      format: ImageManipulator.SaveFormat.JPEG,
      base64: true,
    });
    if (kucuk.base64) return kucuk.base64;
  } catch {
    /* küçültme başarısızsa orijinalle devam */
  }
  return hamB64 ?? null;
}

export {
  AVATAR_GENISLIK,
  BELGE_GENISLIK,
  GOVDE_SINIRI_BAYT,
  PAYLASIM_GENISLIK,
  siniriAsiyorMu,
} from './gorsel-olcu';
