import { useEffect, useMemo, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
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
import { useStore } from '../src/store';
import { useLocale } from '../src/locale';
import { type ColorTokens, radius, space } from '../src/theme';
import { useTheme, useThemedStyles } from '../src/theme-context';
import { PressableScale, Screen, StackHeader, TAB_BAR_CLEARANCE, Text } from '../src/ui';

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
  const { colors, shadow } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const { q } = useLocalSearchParams<{ q?: string }>();
  const [query, setQuery] = useState(typeof q === 'string' ? q : '');
  const inputRef = useRef<TextInput>(null);
  // Navigasyon animasyonu bitince klavyeyi güvenilir şekilde aç (autoFocus tek başına yetmiyor)
  useEffect(() => {
    const id = setTimeout(() => inputRef.current?.focus(), 350);
    return () => clearTimeout(id);
  }, []);
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>('recommended');
  const [showSort, setShowSort] = useState(false);
  const professionals = useProfessionals();
  // §5.1.4 — arama da şehre göre filtreli
  const city = useStore((s) => s.currentUser?.city) ?? 'Almatı';
  const recentSearches = useStore((s) => s.recentSearches);
  const addRecentSearch = useStore((s) => s.addRecentSearch);
  const isEmpty = query.trim().length === 0 && activeCat === null;

  const results = useMemo(() => {
    const q = lower(query.trim());
    const filtered = professionals.filter((p) => {
      if (p.city !== city) return false;
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
  }, [professionals, query, activeCat, sort, city, t]);

  const submit = () => addRecentSearch(query);

  return (
    <Screen edges={[]}>
      <StackHeader title={t('search.title')} />
      <View style={styles.searchRow}>
        <View style={[styles.searchBar, shadow.soft]}>
          <Ionicons name="search" size={19} color={colors.muted} />
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder={t('search.placeholder')}
            placeholderTextColor={colors.muted}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={submit}
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
          style={[styles.tune, (showSort || sort !== 'recommended') && styles.tuneOn, shadow.soft]}
        >
          <Ionicons
            name="options-outline"
            size={20}
            color={showSort || sort !== 'recommended' ? colors.onAccent : colors.inkSoft}
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
                <Text variant="caption" tone={on ? 'onAccent' : 'inkSoft'} style={on ? styles.chipOnText : undefined}>
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
          <Text
            variant="caption"
            tone={activeCat === null ? 'onAccent' : 'inkSoft'}
            style={activeCat === null ? styles.chipOnText : undefined}
          >
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
              <Text variant="caption" tone={on ? 'onAccent' : 'inkSoft'} style={on ? styles.chipOnText : undefined}>
                {t(cat.labelKey)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {isEmpty ? (
          /* §5.1.2 — boş kutu: son aramalar + popüler kategoriler */
          <View style={styles.emptyBox}>
            {recentSearches.length > 0 ? (
              <>
                <Text variant="label" tone="rose" style={styles.blockLabel}>
                  {t('search.recent')}
                </Text>
                <View style={styles.wrapChips}>
                  {recentSearches.map((r) => (
                    <Pressable key={r} style={styles.recentChip} onPress={() => setQuery(r)}>
                      <Ionicons name="time-outline" size={13} color={colors.inkSoft} />
                      <Text variant="caption" tone="inkSoft">
                        {r}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </>
            ) : null}
            <Text variant="label" tone="rose" style={styles.blockLabel}>
              {t('search.popular')}
            </Text>
            <View style={styles.wrapChips}>
              {CATEGORIES.map((cat) => (
                <Pressable key={cat.id} style={styles.popChip} onPress={() => setActiveCat(cat.id)}>
                  <Ionicons name={cat.icon as keyof typeof Ionicons.glyphMap} size={14} color={colors.rose} />
                  <Text variant="caption" tone="ink">
                    {t(cat.labelKey)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : (
          <>
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
                onPress={() => {
                  submit();
                  router.push('/professional/' + p.id);
                }}
              />
            ))}
          </View>
        )}
          </>
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
          <Text variant="bodyStrong" tone="ink" numberOfLines={1} style={styles.rowName}>
            {pro.name}
          </Text>
          <View style={styles.rowRating}>
            <Ionicons name="star" size={13} color={colors.gold} />
            <Text variant="caption" tone="ink" style={styles.rowRatingText}>
              {pro.rating.toFixed(1)}
            </Text>
          </View>
          <Text variant="caption" tone="muted" numberOfLines={1} style={styles.rowMeta}>
            {pro.specialty}
          </Text>
        </View>
        {right ?? (
          <View style={styles.rowRight}>
            <View style={styles.pricePill}>
              <Text variant="caption" tone="onAccent" style={styles.priceText}>
                {formatPrice(pro.priceFrom)}
              </Text>
            </View>
          </View>
        )}
      </PressableScale>
    </Animated.View>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    searchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1.25),
      paddingHorizontal: space(3),
      paddingTop: space(2),
    },
    tune: {
      width: 52,
      height: 52,
      borderRadius: radius.pill,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    tuneOn: { backgroundColor: colors.accent },
    searchBar: {
      flex: 1,
      height: 52,
      backgroundColor: colors.surface,
      borderRadius: radius.pill,
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1.25),
      paddingHorizontal: space(2.5),
    },
    input: { flex: 1, color: colors.ink, fontSize: 15 },
    // Yatay ScrollView dikey eksende büyümesin (dik kolon içinde doğrudan çocuk)
    chipBar: { flexGrow: 0, flexShrink: 0 },
    chips: {
      paddingHorizontal: space(3),
      gap: space(1),
      paddingVertical: space(1.5),
      alignItems: 'center',
    },
    chip: {
      alignSelf: 'center',
      paddingHorizontal: space(2),
      paddingVertical: space(1.1),
      borderRadius: radius.pill,
      backgroundColor: colors.surfaceMuted,
    },
    chipOn: { backgroundColor: colors.accent },
    chipOnText: { fontWeight: '700' },
    content: { paddingHorizontal: space(3), paddingTop: space(1), paddingBottom: TAB_BAR_CLEARANCE },
    count: { marginBottom: space(1.5), marginLeft: space(0.5) },
    emptyBox: { gap: space(1), paddingTop: space(1) },
    blockLabel: { marginTop: space(2), marginBottom: space(0.5), marginLeft: space(0.5) },
    wrapChips: { flexDirection: 'row', flexWrap: 'wrap', gap: space(1) },
    recentChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(0.5),
      paddingHorizontal: space(1.5),
      paddingVertical: space(1),
      borderRadius: radius.pill,
      backgroundColor: colors.surfaceMuted,
    },
    popChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(0.75),
      paddingHorizontal: space(1.5),
      paddingVertical: space(1),
      borderRadius: radius.pill,
      backgroundColor: colors.roseSoft,
    },
    list: { gap: space(1.5) },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1.5),
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: space(1.25),
    },
    thumb: { width: 84, height: 84, borderRadius: radius.md, backgroundColor: colors.bgSunken },
    rowBody: { flex: 1, gap: 4 },
    rowName: { fontSize: 16, fontWeight: '800', letterSpacing: -0.2 },
    rowRating: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    rowRatingText: { fontWeight: '800' },
    rowMeta: {},
    rowRight: { alignItems: 'flex-end', justifyContent: 'center', paddingRight: space(0.5) },
    pricePill: {
      backgroundColor: colors.accent,
      paddingHorizontal: space(1.75),
      paddingVertical: space(1),
      borderRadius: radius.pill,
    },
    priceText: { fontWeight: '800' },
    empty: { alignItems: 'center', paddingTop: space(8), gap: space(1) },
    emptyIcon: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: colors.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: space(1),
    },
    emptyTitle: {},
  });
