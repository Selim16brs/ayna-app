import type { ReactNode } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { type ColorTokens, radius, space } from '../theme';
import { useTheme, useThemedStyles } from '../theme-context';
import { Text } from './Text';

/**
 * Alt sayfa başlığı — Keşfet tasarım dili: lime hero bant, beyaz yuvarlak geri butonu,
 * dev başlık, alt köşeler yuvarlak. Üst güvenli alanı kendisi ekler (Screen edges={[]}).
 */
export function StackHeader({ title, right }: { title: string; right?: ReactNode }) {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(makeStyles);
  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/discover');
  };
  return (
    <View style={[styles.hero, { paddingTop: insets.top + space(1) }]}>
      <View style={styles.topRow}>
        <Pressable style={styles.back} onPress={goBack} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={colors.ink} />
        </Pressable>
        {right ?? null}
      </View>
      {title ? (
        <Text variant="display" tone="ink" numberOfLines={1} style={styles.title}>
          {title}
        </Text>
      ) : null}
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
    topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    back: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
    },
    title: { fontSize: 28, lineHeight: 32, fontWeight: '800', letterSpacing: -0.5, marginTop: space(1.5) },
  });
