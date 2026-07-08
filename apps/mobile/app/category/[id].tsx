import { useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import type { MessageKey } from '@ayna/i18n';
import { categoryLabelKey } from '../../src/data';
import { useProfessionals } from '../../src/catalog';
import { useStore } from '../../src/store';
import { useLocale } from '../../src/locale';
import { type ColorTokens, radius, space } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import { Screen, ServiceCards, StackHeader, TAB_BAR_CLEARANCE, Text } from '../../src/ui';
import { ProRow } from '../search';

type SortKey = 'rating' | 'price';
const SORTS: { key: SortKey; label: MessageKey }[] = [
  { key: 'rating', label: 'category.sort.rating' },
  { key: 'price', label: 'category.sort.price' },
];

export default function CategoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useLocale();
  const { colors, gradients, shadow } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const [sort, setSort] = useState<SortKey>('rating');
  const [svc, setSvc] = useState<string | null>(null);
  const sector = id ?? '';
  const demandRoute = svc
    ? `/demand/new?category=${sector}&service=${svc}`
    : `/demand/new?category=${sector}`;
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
        {/* ── HİZMETLER ── */}
        <Text variant="label" tone="muted" style={styles.eyebrow}>
          {t('category.services_title')}
        </Text>
        <ServiceCards categoryId={sector} value={svc} onChange={setSvc} />

        {/* ── Talep akışı (BİRİNCİL yol) — premium lime gradient kart ── */}
        <Pressable
          style={[styles.demandCard, shadow.card]}
          onPress={() => router.push(demandRoute as never)}
        >
          <LinearGradient
            colors={gradients.gold}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.demandIcon}>
            <Ionicons name="sparkles" size={22} color={colors.onAccent} />
          </View>
          <View style={styles.demandText}>
            <Text variant="bodyStrong" tone="onAccent" style={styles.demandTitle}>
              {t('category.demand_title')}
            </Text>
            <Text variant="caption" tone="onAccent" style={styles.demandSub} numberOfLines={2}>
              {t('category.demand_sub')}
            </Text>
          </View>
          <View style={styles.demandArrow}>
            <Ionicons name="arrow-forward" size={18} color={colors.onAccent} />
          </View>
        </Pressable>

        {/* ── UZMANLAR ── */}
        <View style={styles.providersHead}>
          <Text variant="h2" tone="ink">
            {t('category.providers')}
          </Text>
          <Text variant="caption" tone="muted" style={styles.count}>
            {results.length} {t('category.browse.count')}
          </Text>
        </View>

        <View style={styles.sortRow}>
          {SORTS.map((s) => {
            const on = s.key === sort;
            return (
              <Pressable
                key={s.key}
                onPress={() => setSort(s.key)}
                style={[styles.sortChip, on && styles.sortChipOn]}
              >
                <Ionicons
                  name={s.key === 'rating' ? 'star' : 'pricetag'}
                  size={12}
                  color={on ? colors.onAccent : colors.muted}
                />
                <Text
                  variant="caption"
                  tone={on ? 'onAccent' : 'inkSoft'}
                  style={on ? styles.sortOnText : undefined}
                >
                  {t(s.label)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {results.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Ionicons name="sparkles-outline" size={30} color={colors.accentFg} />
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
    content: {
      paddingHorizontal: space(3),
      paddingTop: space(2.5),
      paddingBottom: TAB_BAR_CLEARANCE,
    },
    eyebrow: { marginBottom: space(1.25) },

    // Premium talep kartı (lime gradient)
    demandCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1.5),
      borderRadius: radius.lg,
      padding: space(2),
      marginTop: space(2.5),
      marginBottom: space(3.5),
      overflow: 'hidden',
    },
    demandIcon: {
      width: 46,
      height: 46,
      borderRadius: 23,
      backgroundColor: 'rgba(255,255,255,0.35)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    demandText: { flex: 1, gap: 2 },
    demandTitle: { fontSize: 16, letterSpacing: -0.2 },
    demandSub: { opacity: 0.85, lineHeight: 17 },
    demandArrow: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: 'rgba(255,255,255,0.35)',
      alignItems: 'center',
      justifyContent: 'center',
    },

    // Uzmanlar başlığı + sayı
    providersHead: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: space(1),
      marginBottom: space(1.5),
    },
    count: {},

    sortRow: { flexDirection: 'row', gap: space(1), marginBottom: space(2) },
    sortChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: space(1.5),
      paddingVertical: space(1),
      borderRadius: radius.pill,
      backgroundColor: colors.surface,
      borderWidth: 1.25,
      borderColor: colors.line,
    },
    sortChipOn: { backgroundColor: colors.accent, borderColor: colors.accent },
    sortOnText: { fontWeight: '700' },

    list: { gap: space(1.5) },
    empty: { alignItems: 'center', paddingTop: space(8), gap: space(1) },
    emptyIcon: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: colors.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: space(1),
    },
  });
