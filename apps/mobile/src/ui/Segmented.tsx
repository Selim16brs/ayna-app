import { Pressable, StyleSheet, View } from 'react-native';
import { colors, radius, shadow, space } from '../theme';
import { Text } from './Text';

interface Option<T extends string> {
  value: T;
  label: string;
}

interface SegmentedProps<T extends string> {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
}

/** iOS-tarzı segmented control: açık ray + seçili segment beyaz pill. */
export function Segmented<T extends string>({ options, value, onChange }: SegmentedProps<T>) {
  return (
    <View style={styles.track}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            style={[styles.segment, on && [styles.segmentOn, shadow.soft]]}
          >
            <Text
              variant="caption"
              tone={on ? 'ink' : 'inkSoft'}
              style={on ? styles.onText : undefined}
            >
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    backgroundColor: colors.bgSunken,
    borderRadius: radius.md,
    padding: 3,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: space(1.1),
    borderRadius: radius.md - 3,
  },
  segmentOn: { backgroundColor: colors.surface },
  onText: { fontFamily: 'Manrope_600SemiBold' },
});
