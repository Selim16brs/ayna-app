import { useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Image, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  ALMATY,
  CATEGORIES,
  categoryLabelKey,
  distanceKm,
  formatPrice,
  type Professional,
  proCoords,
} from '../src/data';
import type { MessageKey } from '@ayna/i18n';
import { useProfessionals } from '../src/catalog';
import { useLocale } from '../src/locale';
import { type ColorTokens, radius, space } from '../src/theme';
import { useTheme, useThemedStyles } from '../src/theme-context';
import { PressableScale, Screen, StackHeader, Text } from '../src/ui';

// Türkçe-duyarlı küçük harfe çevirme (İ/ı dahil)
const lower = (s: string) => s.replace(/İ/g, 'i').replace(/I/g, 'ı').toLocaleLowerCase('tr-TR');

// §7 — sıralama seçenekleri
type SortKey = 'recommended' | 'rating' | 'price' | 'distance' | 'popular';
const SORTS: { key: SortKey; label: MessageKey }[] = [
  { key: 'recommended', label: 'search.sort.recommended' },
  { key: 'rating', label: 'search.sort.rating' },
  { key: 'price', label: 'search.sort.price' },
  { key: 'distance', label: 'search.sort.distance' },
  { key: 'popular', label: 'search.sort.popular' },
];

export default function SearchScreen() {
  const { t } = useLocale();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>('recommended');
  const [showSort, setShowSort] = useState(false);
  const professionals = useProfessionals();

  const results = useMemo(() => {
    const q = lower(query.trim());
    const filtered = professionals.filter((p) => {
      if (activeCat && p.sector !== activeCat) return false;
      if (!q) return true;
      const sectorLabel = lower(t(categoryLabelKey(p.sector)));
      return lower(p.name).includes(q) || lower(p.specialty).includes(q) || sectorLabel.includes(q);
    });
    // §7 — sıralama
    const sorted = [...filtered];
    if (sort === 'rating') sorted.sort((a, b) => b.rating - a.rating);
    else if (sort === 'price') sorted.sort((a, b) => a.priceFrom - b.priceFrom);
    else if (sort === 'popular') sorted.sort((a, b) => b.reviewCount - a.reviewCount);
    else if (sort === 'distance')
      sorted.sort(
        (a, b) =>
          distanceKm(ALMATY, proCoords(a.id)) - distanceKm(ALMATY, proCoords(b.id)),
      );
    return sorted;
  }, [professionals, query, activeCat, sort, t]);

  return (
    <Screen edges={['top']}>
      <StackHeader title={t('search.title')} />
      <View style={styles.searchRow}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={19} color={colors.muted} />
          <TextInput
            style={styles.input}
            placeholder={t('search.placeholder')}
            placeholderTextColor={colors.muted}
            value={query}
            onChangeText={setQuery}
            autoFocus
            returnKeyType="search"
          />
          {query.length > 0 ? (
            <Pressable onPress={() => setQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={colors.muted} />
            </Pressable>
          ) : null}
        </View>
        {/* §7 — sıralama paneli aç/kapat */}
        <Pressable
          onPress={() => setShowSort((v) => !v)}
          style={[styles.tune, (showSort || sort !== 'recommended') && styles.tuneOn]}
        >
          <Ionicons
            name="options-outline"
            size={20}
            color={showSort || sort !== 'recommended' ? colors.onColor : colors.inkSoft}
          />
        </Pressable>
      </View>

      {/* §7 — sıralama çipleri */}
      {showSort ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipBar}
          contentContainerStyle={styles.chips}
        >
          {SORTS.map((s) => {
            const on = s.key === sort;
            return (
              <Pressable
                key={s.key}
                onPress={() => setSort(s.key)}
                style={[styles.chip, on && styles.chipOn]}
              >
                <Text variant="caption" tone={on ? 'onColor' : 'inkSoft'}>
                  {t(s.label)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}

      {/* Kategori daraltma */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipBar}
        contentContainerStyle={styles.chips}
      >
        <Pressable
          onPress={() => setActiveCat(null)}
          style={[styles.chip, activeCat === null && styles.chipOn]}
        >
          <Text variant="caption" tone={activeCat === null ? 'onColor' : 'inkSoft'}>
            {t('search.all_categories')}
          </Text>
        </Pressable>
        {CATEGORIES.map((cat) => {
          const on = activeCat === cat.id;
          return (
            <Pressable
              key={cat.id}
              onPress={() => setActiveCat(on ? null : cat.id)}
              style={[styles.chip, on && styles.chipOn]}
            >
              <Text variant="caption" tone={on ? 'onColor' : 'inkSoft'}>
                {t(cat.labelKey)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Text variant="caption" tone="muted" style={styles.count}>
          {results.length} {t('search.results')}
        </Text>
        {results.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Ionicons name="search-outline" size={30} color={colors.muted} />
            </View>
            <Text variant="bodyStrong" tone="ink" style={styles.emptyTitle}>
              {t('search.empty')}
            </Text>
            <Text variant="caption" tone="muted">
              {t('search.empty_sub')}
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

/** Yeniden kullanılabilir dikey uzman satırı (search/category/favorites ortak). */
export function ProRow({
  pro,
  onPress,
  right,
  index = 0,
}: {
  pro: Professional;
  onPress: () => void;
  right?: React.ReactNode;
  index?: number;
}) {
  const { colors, shadow } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <Animated.View entering={FadeInDown.duration(320).delay(Math.min(index, 8) * 50)}>
      <PressableScale style={[styles.row, shadow.soft]} onPress={onPress}>
        <Image source={{ uri: pro.image }} style={styles.thumb} />
        <View style={styles.rowBody}>
          <Text variant="bodyStrong" tone="ink" numberOfLines={1}>
            {pro.name}
          </Text>
          <Text variant="caption" tone="muted" numberOfLines={1} style={styles.rowMeta}>
            {pro.specialty}
          </Text>
          <View style={styles.rowFooter}>
            <Ionicons name="star" size={12} color={colors.gold} />
            <Text variant="caption" tone="inkSoft">
              {pro.rating.toFixed(1)}
            </Text>
            <Text variant="caption" tone="muted">
              ·
            </Text>
            <Text variant="caption" tone="inkSoft">
              {formatPrice(pro.priceFrom)}
            </Text>
          </View>
        </View>
        {right ?? <Ionicons name="chevron-forward" size={18} color={colors.muted} />}
      </PressableScale>
    </Animated.View>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    searchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1),
      paddingHorizontal: space(2),
    },
    tune: {
      width: 50,
      height: 50,
      borderRadius: radius.md,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.line,
      alignItems: 'center',
      justifyContent: 'center',
    },
    tuneOn: { backgroundColor: colors.rose, borderColor: colors.rose },
    searchBar: {
      flex: 1,
      height: 50,
      backgroundColor: colors.surface,
      borderRadius: radius.pill,
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1.25),
      paddingHorizontal: space(2.25),
      borderWidth: 1,
      borderColor: colors.line,
    },
    input: { flex: 1, color: colors.ink, fontSize: 15 },
    // Yatay ScrollView dikey eksende büyümesin (dik kolon içinde doğrudan çocuk)
    chipBar: { flexGrow: 0, flexShrink: 0 },
    chips: {
      paddingHorizontal: space(2),
      gap: space(1),
      paddingVertical: space(1.5),
      alignItems: 'center',
    },
    chip: {
      alignSelf: 'center',
      paddingHorizontal: space(1.75),
      paddingVertical: space(0.9),
      borderRadius: radius.pill,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.line,
    },
    chipOn: { backgroundColor: colors.rose, borderColor: colors.rose },
    content: { paddingHorizontal: space(2), paddingBottom: space(4) },
    count: { marginBottom: space(1.5), marginLeft: space(0.5) },
    list: { gap: space(1.25) },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1.5),
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.line,
      padding: space(1.25),
    },
    thumb: { width: 64, height: 64, borderRadius: radius.md, backgroundColor: colors.bgSunken },
    rowBody: { flex: 1 },
    rowMeta: { marginTop: 2 },
    rowFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(0.75),
      marginTop: space(0.75),
    },
    empty: { alignItems: 'center', paddingTop: space(8), gap: space(1) },
    emptyIcon: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: colors.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: space(1),
    },
    emptyTitle: {},
  });
