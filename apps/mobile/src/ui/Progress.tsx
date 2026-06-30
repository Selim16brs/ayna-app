import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { radius } from '../theme';
import { useTheme } from '../theme-context';

interface ProgressProps {
  /** 0–1 arası ilerleme. */
  value: number;
  height?: number;
  color?: string;
  track?: string;
}

/** Yumuşak animasyonla dolan ince ilerleme çubuğu. */
export function Progress({ value, height = 8, color, track }: ProgressProps) {
  const { colors } = useTheme();
  const w = useSharedValue(0);
  const clamped = Math.max(0, Math.min(1, value));

  useEffect(() => {
    w.value = withTiming(clamped, { duration: 650 });
  }, [clamped, w]);

  const fill = useAnimatedStyle(() => ({ width: `${w.value * 100}%` }));

  return (
    <View
      style={{
        height,
        borderRadius: radius.pill,
        backgroundColor: track ?? colors.bgSunken,
        overflow: 'hidden',
      }}
    >
      <Animated.View
        style={[
          { height, borderRadius: radius.pill, backgroundColor: color ?? colors.accent },
          fill,
        ]}
      />
    </View>
  );
}
