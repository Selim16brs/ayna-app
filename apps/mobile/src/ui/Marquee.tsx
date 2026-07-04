import { useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { space, type ColorTokens } from '../theme';
import { useThemedStyles } from '../theme-context';
import { Text } from './Text';

/**
 * Sürekli (kesintisiz) sağdan sola kayan yazı — marquee.
 * Metnin DOĞAL genişliğini yatay ScrollView içinde (yatay kısıtsız) ölçer, sonra iki tam
 * kopyayı o genişlikte çizer → hiçbir cümle kırpılmaz, döngü dikişsizdir.
 */
export function Marquee({
  text,
  speed = 45, // px/sn
  style,
  textStyle,
}: {
  text: string;
  speed?: number;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}) {
  const styles = useThemedStyles(makeStyles);
  const x = useSharedValue(0);
  const [w, setW] = useState(0);

  useEffect(() => {
    if (w <= 0) return;
    x.value = 0;
    x.value = withRepeat(
      withTiming(-w, { duration: (w / speed) * 1000, easing: Easing.linear }),
      -1,
      false,
    );
    return () => cancelAnimation(x);
  }, [w, speed, x]);

  const anim = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  return (
    <View style={[styles.wrap, style]} pointerEvents="none">
      {/* Gizli ölçüm — yatay ScrollView içi kısıtsız → gerçek (doğal) genişlik */}
      <ScrollView
        horizontal
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        style={styles.measure}
      >
        <Text
          variant="caption"
          tone="inkSoft"
          style={[styles.text, textStyle]}
          onLayout={(e) => setW(Math.ceil(e.nativeEvent.layout.width))}
        >
          {text}
        </Text>
      </ScrollView>

      {w > 0 ? (
        <Animated.View style={[styles.track, anim]}>
          <Text variant="caption" tone="inkSoft" numberOfLines={1} style={[styles.text, { width: w }, textStyle]}>
            {text}
          </Text>
          <Text variant="caption" tone="inkSoft" numberOfLines={1} style={[styles.text, { width: w }, textStyle]}>
            {text}
          </Text>
        </Animated.View>
      ) : null}
    </View>
  );
}

const makeStyles = (_colors: ColorTokens) =>
  StyleSheet.create({
    wrap: { overflow: 'hidden' },
    track: { flexDirection: 'row' },
    text: { paddingRight: space(6), fontWeight: '600' },
    measure: { position: 'absolute', top: 0, left: 0, right: 0, opacity: 0 },
  });
