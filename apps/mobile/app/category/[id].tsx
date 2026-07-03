import { useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import type { MessageKey } from '@ayna/i18n';
import { categoryLabelKey } from '../../src/data';
import { useProfessionals } from '../../src/catalog';
import { useStore } from '../../src/store';
import { useLocale } from '../../src/locale';
import { type ColorTokens, radius, space } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import { Screen, StackHeader, TAB_BAR_CLEARANCE, Text } from '../../src/ui';
import { ProRow } from '../search';

type SortKey = 'rating' | 'price';
const SORTS: { key: SortKey; label: MessageKey }[] = [
  { key: 'rating', label: 'category.sort.rating' },
  { key: 'price', label: 'category.sort.price' },
];

export default function CategoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useLocale();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const [sort, setSort] = useState<SortKey>('rating');
  const sector = id ?? '';
  const professionals = useProfessionals();
  // §5.1.4 — şehir tüm listeyi filtreler (salona bağlı uzmanlar tek başına listelenmez: zaten staff)
  const city = useStore((s) => s.currentUser?.city) ?? 'Almatı';

  const results = useMemo(() => {
    const list = professionals.filter((p) => p.sector === sector && p.city === city);
    return [...list].sort((a, b) =>
      sort === 'rating' ? b.rating - a.rating : a.priceFrom - b.priceFrom,
    );
  }, [professionals, sector, city, sort]);

  return (
    <Screen edges={[]}>
      <StackHeader title={t(categoryLabelKey(sector))} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* §5.1.5 Anayasa şeridi — talep akışı BİRİNCİL yol, liste ikincil */}
        <Pressable style={styles.constBanner} onPress={() => router.push('/demand/new')}>
          <View style={styles.constIcon}>
            <Ionicons name="chatbubbles" size={20} color={colors.onAccent} />
          </View>
          <View style={styles.constText}>
            <Text variant="bodyStrong" tone="onAccent" numberOfLines={2}>
              {t('category.demand_cta')}
            </Text>
          </View>
          <Ionicons name="arrow-forward" size={20} color={colors.onAccent} />
        </Pressable>

        <View style={styles.filterRow}>
          {SORTS.map((s) => {
            const on = s.key === sort;
            return (
              <Pressable
                key={s.key}
                onPress={() => setSort(s.key)}
                style={[styles.filterChip, on && styles.filterChipOn]}
              >
                <Text
                  variant="caption"
                  tone={on ? 'onAccent' : 'inkSoft'}
                  style={on ? styles.filterChipOnText : undefined}
                >
                  {t(s.label)}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text variant="caption" tone="muted" style={styles.count}>
          {results.length} {t('category.browse.count')}
        </Text>
        {results.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Ionicons name="sparkles-outline" size={30} color={colors.rose} />
            </View>
            <Text variant="caption" tone="muted">
              {t('category.empty')}
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {results.map((p, i) => (
              <ProRow
                key={p.id}
                pro={p}
                index={i}
                onPress={() => router.push('/professional/' + p.id)}
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
    content: { paddingHorizontal: space(3), paddingTop: space(2.5), paddingBottom: TAB_BAR_CLEARANCE },
    constBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1.25),
      backgroundColor: colors.accent,
      borderRadius: radius.lg,
      padding: space(2),
      marginBottom: space(2.5),
    },
    constIcon: {
      width: 40,
      height: 40,
      borderRadius: radius.md,
      backgroundColor: 'rgba(0,0,0,0.12)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    constText: { flex: 1 },
    filterRow: { flexDirection: 'row', gap: space(1) },
    filterChip: {
      paddingHorizontal: space(2),
      paddingVertical: space(1.1),
      borderRadius: radius.pill,
      backgroundColor: colors.surfaceMuted,
    },
    filterChipOn: { backgroundColor: colors.accent },
    filterChipOnText: { fontWeight: '700' },
    count: { marginTop: space(2.5), marginBottom: space(1.5), marginLeft: space(0.5) },
    list: { gap: space(1.5) },
    empty: { alignItems: 'center', paddingTop: space(8), gap: space(1) },
    emptyIcon: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: colors.roseSoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: space(1),
    },
  });
