import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { type ColorTokens, radius, space } from '../theme';
import { useLocale } from '../locale';
import { useThemedStyles } from '../theme-context';

/**
 * Polish 2.1 — TEK yükleme dili: veri gelmeden "boş" gösterme yasağı.
 * Nabız animasyonu 900ms döngü (dekoratif değil, "çalışıyor" sinyali);
 * prefers-reduced-motion benzeri bir tercih RN'de yok, bu yüzden opaklık
 * aralığı dar tutuldu (0.35→0.7) — sakin, göz yormayan.
 */
export function ListSkeleton({ rows = 3, avatar = true }: { rows?: number; avatar?: boolean }) {
  const { t } = useLocale();
  const styles = useThemedStyles(makeStyles);
  const pulse = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.7, duration: 450, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.35, duration: 450, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <View
      style={styles.wrap}
      accessibilityRole="progressbar"
      accessibilityLabel={t('common.loading_a11y')}
    >
      {Array.from({ length: rows }, (_, i) => (
        <Animated.View key={i} style={[styles.row, { opacity: pulse }]}>
          {avatar ? <View style={styles.avatar} /> : null}
          <View style={styles.lines}>
            <View style={[styles.line, styles.lineWide]} />
            <View style={[styles.line, styles.lineNarrow]} />
          </View>
        </Animated.View>
      ))}
    </View>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    wrap: { gap: space(1.5), paddingHorizontal: space(3), paddingTop: space(2) },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1.5),
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: space(2),
    },
    avatar: {
      width: 48,
      height: 48,
      borderRadius: radius.md,
      backgroundColor: colors.surfaceMuted,
    },
    lines: { flex: 1, gap: space(1) },
    line: { height: 12, borderRadius: radius.sm, backgroundColor: colors.surfaceMuted },
    lineWide: { width: '70%' },
    lineNarrow: { width: '40%' },
  });
