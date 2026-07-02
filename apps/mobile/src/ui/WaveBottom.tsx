import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

/**
 * Referans tasarım imzası: lime hero bloğunun altındaki organik dalga geçişi.
 * Lime bloğun İÇİNE, en alta yerleştirilir; `color` = sayfa zemin rengi (colors.bg),
 * dalgalı üst kenar lime'ı, düz alt kenar zemine akan içeriği verir.
 */
export function WaveBottom({ color, height = 46 }: { color: string; height?: number }) {
  return (
    <View style={{ height, marginBottom: -1 }} pointerEvents="none">
      <Svg width="100%" height={height} viewBox="0 0 100 30" preserveAspectRatio="none">
        {/* Zarif, yumuşak tek dalga (referans) — zemin lime hero'ya nazikçe kavis yapar */}
        <Path
          d="M0,30 L0,13 C 30,25 55,6 78,11 C 88,13 95,17 100,15 L100,30 Z"
          fill={color}
        />
      </Svg>
    </View>
  );
}
