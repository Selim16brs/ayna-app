import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

/**
 * Referans tasarım imzası: lime hero bloğunun altındaki organik dalga geçişi.
 * Lime bloğun İÇİNE, en alta yerleştirilir; `color` = sayfa zemin rengi (colors.bg),
 * dalgalı üst kenar lime'ı, düz alt kenar zemine akan içeriği verir.
 */
export function WaveBottom({ color, height = 56 }: { color: string; height?: number }) {
  return (
    <View style={{ height, marginBottom: -1 }} pointerEvents="none">
      <Svg width="100%" height={height} viewBox="0 0 100 30" preserveAspectRatio="none">
        {/* Derin, organik scoop — zeminin lime hero'ya doğru büyük kavis yapması */}
        <Path
          d="M0,30 L0,14 C 22,-4 40,24 58,20 C 74,17 86,4 100,10 L100,30 Z"
          fill={color}
        />
      </Svg>
    </View>
  );
}
