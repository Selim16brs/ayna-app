import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type GestureResponderEvent } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

/**
 * Parmak ekranda gezerken ojeli tırnak (💅) imleci gösterir.
 * Dokunmaları engellemez (overlay pointerEvents=none; sarmalayıcı responder almaz).
 */
export function NailCursor({ children }: { children: ReactNode }) {
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const shown = useSharedValue(0);

  const move = (e: GestureResponderEvent) => {
    x.value = e.nativeEvent.pageX;
    y.value = e.nativeEvent.pageY;
  };

  const style = useAnimatedStyle(() => ({
    opacity: shown.value,
    transform: [
      { translateX: x.value - 14 },
      { translateY: y.value - 46 },
      { scale: 0.6 + shown.value * 0.4 },
    ],
  }));

  return (
    <View
      style={styles.fill}
      onTouchStart={(e) => {
        move(e);
        shown.value = withTiming(1, { duration: 120 });
      }}
      onTouchMove={move}
      onTouchEnd={() => {
        shown.value = withTiming(0, { duration: 220 });
      }}
      onTouchCancel={() => {
        shown.value = withTiming(0, { duration: 220 });
      }}
    >
      {children}
      <Animated.View pointerEvents="none" style={[styles.cursor, style]}>
        <Text style={styles.nail}>💅</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  cursor: { position: 'absolute', left: 0, top: 0, zIndex: 9999 },
  nail: { fontSize: 30 },
});
