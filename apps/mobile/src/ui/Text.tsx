import { Text as RNText, type TextProps as RNTextProps, StyleSheet } from 'react-native';
import { useTheme } from '../theme-context';
import { tabularNums, type as typeScale, type TypeVariant } from '../theme';

type Variant = TypeVariant;
type Tone =
  | 'ink'
  | 'inkSoft'
  | 'muted'
  | 'rose'
  | 'gold'
  | 'sage'
  | 'danger'
  | 'accentFg'
  | 'onColor'
  | 'onAccent'
  | 'onInverse'
  | 'onInverseMuted';

interface TextProps extends RNTextProps {
  variant?: Variant;
  tone?: Tone;
  /** Fiyat, saat, sayaç ve tablo rakamları için hizalı rakam. */
  numeric?: boolean;
}

// Tüm tipografi = Onest (tek aile). Ağırlık fontWeight ile DEĞİL, aile adıyla verilir
// (`Onest-Regular` / `Onest-Medium` / `Onest-SemiBold`) — iOS'ta ağırlık sentezi
// güvenilir değil ve sahte kalınlık Kiril metinde okunurluğu düşürüyor.
// İSTİSNA: bileşen kendi style'ında fontFamily verirse (ör. Caveat el yazısı) o korunur
// — style dizide en sonda olduğundan üzerine yazar.
export function Text({ variant = 'body', tone = 'ink', numeric, style, ...rest }: TextProps) {
  const { colors } = useTheme();
  return (
    <RNText
      {...rest}
      style={[styles[variant], { color: colors[tone] }, numeric && tabularNums, style]}
    />
  );
}

const styles = StyleSheet.create(typeScale);
