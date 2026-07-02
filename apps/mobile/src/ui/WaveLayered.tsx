import { Dimensions, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

const W = Dimensions.get('window').width;

/**
 * Katmanlı (çift) dalga geçişi — referans "footer wave" dili:
 * üstte `top` renk şeridi (hero) → ince `gap` (beyaz) boşluk → altta `bottom` renk (band).
 * İki eğri paralel offset → akıcı, tutarlı beyaz sliver. Kontur çizgisi yok.
 */
export function WaveLayered({
  top,
  bottom,
  gap,
  height = 96,
}: {
  top: string;
  bottom: string;
  gap: string;
  height?: number;
}) {
  const H = height;
  // Üst (top) renk: tepeden aşağı, dalgalı alt kenar
  const topPath = `M0,0 L${W},0 L${W},${0.3 * H} C ${0.66 * W},${0.72 * H} ${0.33 * W},${0.12 * H} 0,${0.42 * H} Z`;
  // Alt (bottom) renk: aynı eğrinin ~0.14H altına kaydırılmışı, aşağıyı doldurur
  const bottomPath = `M0,${0.56 * H} C ${0.33 * W},${0.26 * H} ${0.66 * W},${0.86 * H} ${W},${0.44 * H} L ${W},${H} L 0,${H} Z`;
  return (
    <View style={{ height: H, marginTop: -1, backgroundColor: gap }} pointerEvents="none">
      <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <Path d={topPath} fill={top} />
        <Path d={bottomPath} fill={bottom} />
      </Svg>
    </View>
  );
}
