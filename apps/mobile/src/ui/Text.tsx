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
/**
 * §15 (bonus) — SİSTEM YAZI ÖLÇEĞİ SINIRI.
 *
 * `maxFontSizeMultiplier` tanımlı DEĞİLDİ: erişilebilirlik ayarından yazı
 * boyutu %200'e alındığında metinler sınırsız büyüyor, sabit yükseklikli
 * kaplar (44pt dokunma hedefleri, 56pt `Button`) taşıyor ve yazı kırpılıyor.
 *
 * 1.4 seçildi çünkü ölçeklenmeyi TAMAMEN kapatmak da yanlış olurdu —
 * büyük yazıya ihtiyacı olan kullanıcı onu kaybeder. 1.4, düzeni bozmadan
 * anlamlı bir büyüme veriyor.
 *
 * Çağıran ekran gerekirse kendi değerini geçebilir (`{...rest}` sonda
 * değil, ÖNCE uygulanıyor ki geçersiz kılınabilsin).
 */
const OLCEK_SINIRI = 1.4;

export function Text({ variant = 'body', tone = 'ink', numeric, style, ...rest }: TextProps) {
  const { colors } = useTheme();
  return (
    <RNText
      maxFontSizeMultiplier={OLCEK_SINIRI}
      {...rest}
      style={[styles[variant], { color: colors[tone] }, numeric && tabularNums, style]}
    />
  );
}

const styles = StyleSheet.create(typeScale);
