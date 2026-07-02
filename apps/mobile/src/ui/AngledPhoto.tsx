import Svg, { ClipPath, Defs, Image as SvgImage, Polygon } from 'react-native-svg';

/**
 * Sağa yaslı, NET ama AÇILI (diyagonal) kesilmiş görsel — zemine gömülü görünür.
 * Sol kenar keskin bir eğik çizgi; sol taraf şeffaf kalır (kartın gradienti görünür).
 * cut-out değil; görselin kendi arka planıyla, açılı kesimle yerleşir.
 */
export function AngledPhoto({
  uri,
  width,
  height,
  clipId,
}: {
  uri: string;
  width: number;
  height: number;
  clipId: string;
}) {
  const topX = width * 0.42; // üstte kesim başlangıcı
  const botX = width * 0.26; // altta kesim başlangıcı (eğik)
  return (
    <Svg width={width} height={height}>
      <Defs>
        <ClipPath id={clipId}>
          <Polygon points={`${topX},0 ${width},0 ${width},${height} ${botX},${height}`} />
        </ClipPath>
      </Defs>
      <SvgImage
        href={{ uri }}
        x={0}
        y={0}
        width={width}
        height={height}
        preserveAspectRatio="xMidYMid slice"
        clipPath={`url(#${clipId})`}
      />
    </Svg>
  );
}
