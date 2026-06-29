import { Text as RNText, type TextProps as RNTextProps, StyleSheet } from 'react-native';
import { colors, font } from '../theme';

type Variant = 'display' | 'title' | 'h2' | 'body' | 'bodyStrong' | 'label' | 'caption';
type Tone = 'ink' | 'inkSoft' | 'muted' | 'rose' | 'gold' | 'onColor';

interface TextProps extends RNTextProps {
  variant?: Variant;
  tone?: Tone;
}

export function Text({ variant = 'body', tone = 'ink', style, ...rest }: TextProps) {
  return <RNText {...rest} style={[styles[variant], { color: colors[tone] }, style]} />;
}

const styles = StyleSheet.create({
  display: { fontFamily: font.display, fontSize: 52, lineHeight: 56 },
  title: { fontFamily: font.display, fontSize: 30, lineHeight: 36 },
  h2: { fontFamily: font.bold, fontSize: 19, lineHeight: 24 },
  body: { fontFamily: font.body, fontSize: 15, lineHeight: 22 },
  bodyStrong: { fontFamily: font.semibold, fontSize: 15, lineHeight: 22 },
  label: {
    fontFamily: font.semibold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  caption: { fontFamily: font.medium, fontSize: 13, lineHeight: 18 },
});
