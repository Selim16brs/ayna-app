import { Dimensions, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

const W = Dimensions.get('window').width;

/**
 * Lime hero'nun dalgalı ALT kenarı: `color` (lime) üstten doldurur, alt kenar dalgalıdır,
 * altta kalan alan şeffaf → sayfa zemini görünür ("yeşil zemin dalgalı biter").
 * `stroke` verilirse dalga kenarına referanstaki gibi siyah kontur çizgisi eklenir.
 * viewBox gerçek piksel genişliğiyle 1:1 → stroke her yerde eşit kalınlıkta.
 */
export function WaveBottom({
  color,
  height = 40,
  stroke,
  strokeWidth = 3,
}: {
  color: string;
  height?: number;
  stroke?: string;
  strokeWidth?: number;
}) {
  const H = height;
  // Dalga kenarı (sağdan sola) — hero'nun alt sınırı
  const edge = `M${W},${H * 0.5} C ${W * 0.8},${H * 0.9} ${W * 0.58},${H * 0.15} ${W * 0.34},${H * 0.46} C ${W * 0.18},${H * 0.64} ${W * 0.08},${H * 0.3} 0,${H * 0.4}`;
  const fill = `M0,0 L${W},0 L${W},${H * 0.5} C ${W * 0.8},${H * 0.9} ${W * 0.58},${H * 0.15} ${W * 0.34},${H * 0.46} C ${W * 0.18},${H * 0.64} ${W * 0.08},${H * 0.3} 0,${H * 0.4} Z`;
  return (
    <View style={{ height: H, marginTop: -1 }} pointerEvents="none">
      <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <Path d={fill} fill={color} />
        {stroke ? (
          <Path
            d={edge}
            fill="none"
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
        ) : null}
      </Svg>
    </View>
  );
}
