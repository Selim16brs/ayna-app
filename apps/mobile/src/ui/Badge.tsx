import { StyleSheet, View } from 'react-native';
import { colors, radius, space } from '../theme';
import { Text } from './Text';

type Tone = 'rose' | 'gold' | 'neutral';

export function Badge({ label, tone = 'rose' }: { label: string; tone?: Tone }) {
  const bg =
    tone === 'rose' ? colors.roseSoft : tone === 'gold' ? colors.goldSoft : colors.surfaceMuted;
  const fg = tone === 'rose' ? colors.rose : tone === 'gold' ? colors.gold : colors.inkSoft;
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
