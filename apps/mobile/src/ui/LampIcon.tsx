import Svg, { Circle, Ellipse, Path } from 'react-native-svg';

/**
 * Aladdin (cin) lambası — sihirli dilek lambası. Ionicons'ta yok, çizildi.
 * Yuvarlak karın (ellipse) + kıvrık emzik + boyun/topuz + sap + tepede sihir kıvılcımı.
 */
export function LampIcon({ size = 30, color = '#FF2E93' }: { size?: number; color?: string }) {
  const w = size;
  const h = size * 0.64;
  return (
    <Svg width={w} height={h} viewBox="0 0 96 60" fill="none">
      {/* zemin gölgesi */}
      <Ellipse cx="46" cy="52" rx="26" ry="3.5" fill={color} opacity={0.25} />
      {/* emzik (sol, yukarı kıvrık) */}
      <Path d="M22 40C9 36 4 27 7 21l6 2c-1 6 3 12 13 15z" fill={color} />
      {/* karın (yuvarlak gövde) */}
      <Ellipse cx="46" cy="41" rx="27" ry="11" fill={color} />
      {/* boyun */}
      <Path d="M37 32l4-8h12l4 8z" fill={color} />
      {/* kapak topuzu */}
      <Circle cx="47" cy="20" r="4.5" fill={color} />
      {/* sap (sağ kıvrım) */}
      <Path
        d="M70 35c14-3 16 10 5 13"
        stroke={color}
        strokeWidth={5}
        strokeLinecap="round"
        fill="none"
      />
      {/* sihir kıvılcımı (emzik ucunda) */}
      <Path d="M9 12l1.6 4.4L15 18l-4.4 1.6L9 24l-1.6-4.4L3 18l4.4-1.6z" fill={color} />
    </Svg>
  );
}
