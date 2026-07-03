import { useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { ALMATY, distanceKm, proCoords } from '../src/data';
import { useProfessionals } from '../src/catalog';
import { useStore } from '../src/store';
import { useLocale } from '../src/locale';
import { type ColorTokens, radius, space } from '../src/theme';
import { useTheme, useThemedStyles } from '../src/theme-context';
import { Screen, StackHeader, TAB_BAR_CLEARANCE, Text } from '../src/ui';
import { ProRow } from './search';

// §5.1.8 — Sana Yakın "Tümü": şehirdeki tüm salonlar; premium önce, kendi içinde mesafeye göre.
export default function NearbyScreen() {
  const { t } = useLocale();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const all = useProfessionals();
  const city = useStore((s) => s.currentUser?.city) ?? 'Almatı';

  const salons = useMemo(() => {
    const dist = (id: string) => distanceKm(ALMATY, proCoords(id));
    return all
      .filter((p) => p.city === city && p.kind === 'salon')
      .sort(
        (a, b) => Number(b.isPremium) - Number(a.isPremium) || dist(a.id) - dist(b.id),
      );
  }, [all, city]);

  return (
    <Screen edges={[]}>
      <StackHeader title={t('home.nearby')} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {salons.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="location-outline" size={30} color={colors.muted} />
            <Text variant="caption" tone="muted">
              {t('nearby.empty')}
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {salons.map((p, i) => (
              <ProRow
                key={p.id}
                pro={p}
                index={i}
                onPress={() => router.push('/professional/' + p.id)}
                right={
                  p.isPremium ? (
                    <View style={styles.premiumTag}>
                      <Ionicons name="star" size={11} color={colors.onAccent} />
                      <Text variant="caption" tone="onAccent" style={styles.premiumText}>
                        {t('nearby.premium')}
                      </Text>
                    </View>
                  ) : undefined
                }
              />
            ))}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    content: { paddingHorizontal: space(3), paddingTop: space(2), paddingBottom: TAB_BAR_CLEARANCE },
    list: { gap: space(1.5) },
    empty: { alignItems: 'center', paddingTop: space(8), gap: space(1) },
    premiumTag: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      backgroundColor: colors.accent,
      paddingHorizontal: space(1),
      paddingVertical: 4,
      borderRadius: radius.pill,
      alignSelf: 'center',
    },
    premiumText: { fontWeight: '800' },
  });
