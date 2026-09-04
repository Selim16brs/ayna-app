import { Image, StyleSheet, View, type ImageStyle, type StyleProp } from 'react-native';
import { font, type ColorTokens } from '../theme';
import { useTheme, useThemedStyles } from '../theme-context';
import { Text } from './Text';

/**
 * SAĞLAYICI FOTOĞRAFI — yoksa BAŞ HARF, başkasının fotoğrafı DEĞİL.
 *
 * İki ayrı sorunun ortak çözümü:
 *
 * 1. Fotoğraf yüklemeyen işletme onaylandığında sunucu kartına stok bir
 *    Unsplash salon fotoğrafı koyuyordu. Müşteri, o işletmeye ait olmayan
 *    bir mekânın fotoğrafını onun mekânı sanıyordu — uydurulmuş kanıt.
 * 2. Stok fotoğraf kalkınca `image` boş kalıyor ve `<Image uri="">` sessiz
 *    bir boşluk çiziyor: kart bozuk görünüyor.
 *
 * Boşken sağlayıcının KENDİ adının baş harfi yazılıyor. Uydurma değil —
 * elimizdeki tek gerçek bilgi — ve kart bilerek yapılmış görünüyor.
 */
export function SaglayiciFoto({
  uri,
  ad,
  style,
}: {
  uri?: string | null | undefined;
  ad?: string | null | undefined;
  style: StyleProp<ImageStyle>;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  if (uri) return <Image source={{ uri }} style={style} resizeMode="cover" />;
  /*
   * Baş harf Unicode'a göre alınıyor: "Şirin" gibi adlarda `toUpperCase`
   * yerelden bağımsız çalışsın diye 'tr' verilmiyor — 'i' harfinin
   * Türkçe büyük hâli 'İ' ve o da doğru.
   */
  const harf = (ad ?? '').trim().charAt(0).toLocaleUpperCase('tr');
  return (
    <View style={[style, styles.bos]}>
      <Text style={[styles.harf, { color: colors.accentFg }]}>{harf}</Text>
    </View>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    bos: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accentSoft },
    harf: { fontFamily: font.semibold, fontSize: 22 },
  });
