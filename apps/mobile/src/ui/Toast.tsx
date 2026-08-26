import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { type ColorTokens, radius, space } from '../theme';
import { useThemedStyles } from '../theme-context';
import { Text } from './Text';

/**
 * Polish 5.5 — sessiz onay bandı: "kaydedildi" tipi geri bildirim için
 * sistem Alert'i yerine 180ms'de beliren, 2.2sn sonra sönen ince şerit.
 * Akışı kesmez, dokunuş istemez. Hata/onay SORULARI için Alert kalır.
 *
 * Kullanım:
 *   const toast = useToast();
 *   ... toast.show(t('seller.calperm.saved'));
 *   return (<Screen>...{toast.node}</Screen>);
 */
export function useToast() {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((text: string) => {
    setMessage(text);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMessage(null), 2200);
  }, []);

  useEffect(() => () => (timer.current ? clearTimeout(timer.current) : undefined), []);

  return { show, node: <Toast message={message} /> };
}

function Toast({ message }: { message: string | null }) {
  const styles = useThemedStyles(makeStyles);
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fade, {
      toValue: message ? 1 : 0,
      duration: 180, // 200ms altı — fark edilir ama dikkat çekmez
      useNativeDriver: true,
    }).start();
  }, [message, fade]);

  if (!message) return null;
  return (
    <Animated.View
      style={[styles.wrap, { opacity: fade }]}
      pointerEvents="none"
      accessibilityLiveRegion="polite"
    >
      <Text variant="caption" tone="onColor" style={styles.text}>
        {message}
      </Text>
    </Animated.View>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    wrap: {
      position: 'absolute',
      left: space(3),
      right: space(3),
      bottom: space(5),
      backgroundColor: colors.ink,
      borderRadius: radius.md,
      paddingVertical: space(1.5),
      paddingHorizontal: space(2),
    },
    text: { textAlign: 'center' },
  });
