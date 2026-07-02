import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

/**
 * Referans tasarım imzası: lime hero bloğunun altındaki organik dalga geçişi.
 * Lime bloğun İÇİNE, en alta yerleştirilir; `color` = sayfa zemin rengi (colors.bg),
 * dalgalı üst kenar lime'ı, düz alt kenar zemine akan içeriği verir.
 */
/**
 * Lime hero'nun dalgalı ALT kenarı: `color` (lime) üstten doldurur, alt kenar dalgalıdır,
 * altta kalan alan şeffaf → sayfa zemini görünür. Böylece "yeşil zemin dalgalı biter",
 * yeşilin üstünde beyaz bir şekil DURMAZ.
 */
export function WaveBottom({ color, height = 40 }: { color: string; height?: number }) {
  return (
    <View style={{ height, marginTop: -1 }} pointerEvents="none">
      <Svg width="100%" height={height} viewBox="0 0 100 30" preserveAspectRatio="none">
        <Path d="M0,0 L100,0 L100,15 C 80,26 58,6 34,14 C 18,19 8,10 0,12 Z" fill={color} />
      </Svg>
    </View>
  );
}
