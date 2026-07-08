import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { radius, space, type ColorTokens } from '../theme';
import { useThemedStyles } from '../theme-context';
import { Text } from './Text';

/**
 * Sekme ekranları için ortak lime hero başlık (Keşfet tasarım dili):
 * lime zemin, dev başlık, alt köşeler yuvarlak. `right` sağ üst aksiyon, `children` alt içerik.
 */
export function TabHero({
  title,
  subtitle,
  right,
  children,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  children?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={[styles.hero, { paddingTop: insets.top + space(1.5) }]}>
      <View style={styles.row}>
        <View style={styles.textCol}>
          <Text variant="display" tone="ink" style={styles.title}>
            {title}
          </Text>
          {subtitle ? (
            <Text variant="caption" tone="inkSoft" style={styles.sub}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {right ?? null}
      </View>
      {children}
    </View>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    hero: {
      backgroundColor: colors.accent,
      paddingHorizontal: space(3),
      paddingBottom: space(2.5),
      borderBottomLeftRadius: radius.xl,
      borderBottomRightRadius: radius.xl,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      gap: space(1.5),
    },
    textCol: { flex: 1 },
    title: { fontSize: 30, lineHeight: 34, fontWeight: '800', letterSpacing: -0.6 },
    sub: { marginTop: space(0.75) },
  });
