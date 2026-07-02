import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

/**
 * Referans tasarım imzası: lime hero bloğunun altındaki organik dalga geçişi.
 * Lime bloğun İÇİNE, en alta yerleştirilir; `color` = sayfa zemin rengi (colors.bg),
 * dalgalı üst kenar lime'ı, düz alt kenar zemine akan içeriği verir.
 */
export function WaveBottom({ color, height = 34 }: { color: string; height?: number }) {
  return (
    <View style={{ height, marginBottom: -1 }} pointerEvents="none">
      <Svg width="100%" height={height} viewBox="0 0 100 20" preserveAspectRatio="none">
        <Path
          d="M0,20 L0,8 C 20,-3 38,13 60,6 C 78,0 90,7 100,3 L100,20 Z"
          fill={color}
        />
      </Svg>
    </View>
  );
}
