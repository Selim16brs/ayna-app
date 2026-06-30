import { type ViewProps, StyleSheet, View } from 'react-native';
import { type ColorTokens, radius, space } from '../theme';
import { useTheme, useThemedStyles } from '../theme-context';

export function Card({ style, ...rest }: ViewProps) {
  const { shadow } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return <View {...rest} style={[styles.card, shadow.card, style]} />;
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: space(2.5),
      borderWidth: 1,
      borderColor: colors.line,
    },
  });
