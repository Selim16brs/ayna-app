import { Text as RNText, type TextProps as RNTextProps, StyleSheet } from 'react-native';
import { useTheme } from '../theme-context';

type Variant = 'display' | 'title' | 'h2' | 'body' | 'bodyStrong' | 'label' | 'caption';
type Tone = 'ink' | 'inkSoft' | 'muted' | 'rose' | 'gold' | 'accentFg' | 'onColor' | 'onAccent';

interface TextProps extends RNTextProps {
  variant?: Variant;
  tone?: Tone;
}

// Tüm tipografi = SF (San Francisco, iOS sistem fontu). fontFamily VERİLMEZ → sistem fontu kullanılır
// (Latin+Türkçe+Kiril hepsini kapsar). İSTİSNA: bileşen kendi style'ında fontFamily verirse
// (ör. Caveat el yazısı) o korunur — style dizide en sonda olduğundan üzerine yazar.
export function Text({ variant = 'body', tone = 'ink', style, ...rest }: TextProps) {
  const { colors } = useTheme();
  return <RNText {...rest} style={[styles[variant], { color: colors[tone] }, style]} />;
}

const styles = StyleSheet.create({
  display: { fontSize: 34, lineHeight: 40, fontWeight: '700', letterSpacing: 0.37 },
  title: { fontSize: 28, lineHeight: 34, fontWeight: '700', letterSpacing: 0.36 },
  h2: { fontSize: 20, lineHeight: 25, fontWeight: '700', letterSpacing: 0.2 },
  body: { fontSize: 16, lineHeight: 22, fontWeight: '400' },
  bodyStrong: { fontSize: 16, lineHeight: 22, fontWeight: '600' },
  label: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '400' },
});
