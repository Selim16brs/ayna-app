import { Dimensions, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

const W = Dimensions.get('window').width;

/**
 * Katmanlı dalga geçişinin ÖN katmanları: beyaz sliver + pembe (referans footer-wave).
 * Üst kısım ŞEFFAF → arkadaki yeşil hero görünür (yeşil şerit) ve foto yeşilin önünde durur.
 * Bu bileşen fotonun ÜSTÜNDE render edilir → beyaz+pembe fotoyu keser.
 */
export function WaveLayered({
  sliver,
  bottom,
  height = 96,
}: {
  sliver: string;
  bottom: string;
  height?: number;
}) {
  const H = height;
  // Beyaz sliver: iki paralel eğri arası bant (üst kenar = yeşil şeridin alt sınırı)
  const sliverPath = `M0,${0.42 * H} C ${0.33 * W},${0.12 * H} ${0.66 * W},${0.72 * H} ${W},${0.3 * H} L ${W},${0.44 * H} C ${0.66 * W},${0.86 * H} ${0.33 * W},${0.26 * H} 0,${0.56 * H} Z`;
  // Pembe: sliver'ın altından aşağıyı doldurur (band ile birleşir)
  const bottomPath = `M0,${0.56 * H} C ${0.33 * W},${0.26 * H} ${0.66 * W},${0.86 * H} ${W},${0.44 * H} L ${W},${H} L 0,${H} Z`;
  return (
    <View style={{ height: H }} pointerEvents="none">
      <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <Path d={sliverPath} fill={sliver} />
        <Path d={bottomPath} fill={bottom} />
      </Svg>
    </View>
  );
}
