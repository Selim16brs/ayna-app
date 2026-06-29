import { type ViewProps, StyleSheet, View } from 'react-native';
import { colors, radius, shadow, space } from '../theme';

export function Card({ style, ...rest }: ViewProps) {
  return <View {...rest} style={[styles.card, shadow.card, style]} />;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space(2.5),
    borderWidth: 1,
    borderColor: colors.line,
  },
});
