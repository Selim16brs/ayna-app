import type { ReactNode } from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = Omit<PressableProps, 'style' | 'children'> & {
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
  /** Basıldığında inilecek ölçek (0-1). */
  scaleTo?: number;
};

/** Dokununca yumuşakça küçülen Pressable — nazik wellness mikro-etkileşim. */
export function PressableScale({
  scaleTo = 0.97,
  onPressIn,
  onPressOut,
  style,
  children,
  ...rest
}: Props) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const spring = { damping: 18, stiffness: 280, mass: 0.5 };

  return (
    <AnimatedPressable
      onPressIn={(e) => {
        scale.value = withSpring(scaleTo, spring);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.value = withSpring(1, spring);
        onPressOut?.(e);
      }}
      style={[style, animatedStyle]}
      {...rest}
    >
      {children}
    </AnimatedPressable>
  );
}
