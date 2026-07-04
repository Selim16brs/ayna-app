import { StyleSheet, View } from 'react-native';
import { radius, space } from '../theme';
import { useTheme } from '../theme-context';
import { Text } from './Text';

type Tone = 'accent' | 'gold' | 'neutral';

export function Badge({ label, tone = 'accent' }: { label: string; tone?: Tone }) {
  const { colors } = useTheme();
  const bg =
    tone === 'accent' ? colors.accentSoft : tone === 'gold' ? colors.goldSoft : colors.surfaceMuted;
  const fg = tone === 'accent' ? colors.accentFg : tone === 'gold' ? colors.gold : colors.inkSoft;
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text variant="caption" style={[styles.text, { color: fg }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: space(1.25),
    paddingVertical: space(0.5),
    borderRadius: radius.pill,
  },
  text: { fontSize: 11, letterSpacing: 0.3 },
});
