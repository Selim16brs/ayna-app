import { useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import type { ApiQuote } from '../../src/api';
import { formatPrice, INCOMING_QUOTES, PROFESSIONALS } from '../../src/data';
import { useLocale } from '../../src/locale';
import { type ColorTokens, radius, space } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import { Screen, StackHeader, TAB_BAR_CLEARANCE, Text } from '../../src/ui';

type Sort = 'rating' | 'price';

export default function QuoteResultsScreen() {
  const { t } = useLocale();
  const router = useRouter();
  const styles = useThemedStyles(makeStyles);
  const [sort, setSort] = useState<Sort>('rating');
  // Fotoğrafla teklif YALNIZCA bağımsız uzmanlara (independent) gider — salonlar hariç
  const incoming = useMemo(
    () =>
      INCOMING_QUOTES.filter(
        (q) => PROFESSIONALS.find((p) => p.id === q.proId)?.kind === 'independent',
      ),
    [],
  );

  const quotes = useMemo(() => {
    const list = [...incoming];
    return sort === 'rating'
      ? list.sort((a, b) => b.rating - a.rating)
      : list.sort((a, b) => a.price - b.price);
  }, [incoming, sort]);

  return (
    <Screen edges={[]}>
      <StackHeader title={t('quotes.title')} />
      <View style={styles.subtitleRow}>
        <Text variant="caption" tone="muted">
          {incoming.length} {t('quotes.count')}
        </Text>
        <View style={styles.sort}>
          <SortChip
            label={t('quotes.filter.rating')}
            icon="star"
            active={sort === 'rating'}
            onPress={() => setSort('rating')}
          />
          <SortChip
            label={t('quotes.filter.price')}
            icon="pricetag"
            active={sort === 'price'}
            onPress={() => setSort('price')}
          />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {quotes.map((q) => (
          <QuoteCard
            key={q.id}
            quote={q}
            onPick={() =>
              router.push({
                pathname: '/booking/schedule',
                params: { proId: q.proId, source: 'photo_quote' },
              })
            }
          />
        ))}
      </ScrollView>
    </Screen>
  );
}

function SortChip({
  label,
  icon,
  active,
  onPress,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  active: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <Pressable onPress={onPress} style={[styles.sortChip, active && styles.sortChipActive]}>
      <Ionicons name={icon} size={13} color={active ? colors.onAccent : colors.inkSoft} />
      <Text variant="caption" tone={active ? 'onAccent' : 'inkSoft'}>
        {label}
      </Text>
    </Pressable>
  );
}

function QuoteCard({ quote, onPick }: { quote: ApiQuote; onPick: () => void }) {
  const { t } = useLocale();
  const { colors, shadow } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={[styles.card, shadow.card]}>
      <Image source={{ uri: quote.image }} style={styles.thumb} />
      <View style={styles.info}>
        <Text variant="bodyStrong" tone="ink" numberOfLines={1}>
          {quote.name}
        </Text>
        <View style={styles.metaRow}>
          <View style={styles.metaChip}>
            <Ionicons name="star" size={11} color={colors.gold} />
            <Text variant="caption" tone="inkSoft">
              {quote.rating.toFixed(1)} · {quote.reviewCount}
            </Text>
          </View>
          {quote.friends ? (
            <View style={[styles.metaChip, { backgroundColor: colors.lavenderSoft }]}>
              <Ionicons name="people" size={11} color={colors.lavender} />
              <Text variant="caption" style={{ color: colors.lavender }}>
                {quote.friends}
              </Text>
            </View>
          ) : null}
        </View>
        <Text variant="caption" tone="muted" style={styles.eta}>
          {quote.etaMin} {t('pro.min')} · {t('quotes.eta')}
        </Text>
      </View>
      <View style={styles.right}>
        <Text variant="h2" tone="ink">
          {formatPrice(quote.price)}
        </Text>
        <Pressable style={styles.pick} onPress={onPick}>
          <Text variant="caption" tone="onAccent" style={styles.pickText}>
            {t('quotes.pick')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    subtitleRow: {
      paddingHorizontal: space(3),
      paddingBottom: space(1.5),
      gap: space(1.25),
    },
    sort: { flexDirection: 'row', gap: space(1) },
    sortChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: space(1.75),
      paddingVertical: space(1),
      borderRadius: radius.pill,
      backgroundColor: colors.surfaceMuted,
    },
    sortChipActive: { backgroundColor: colors.accent },
    list: { paddingHorizontal: space(3), paddingBottom: TAB_BAR_CLEARANCE, gap: space(2) },
    card: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: space(2),
      gap: space(1.75),
      alignItems: 'center',
    },
    thumb: { width: 76, height: 76, borderRadius: radius.md, backgroundColor: colors.bgSunken },
    info: { flex: 1 },
    metaRow: { flexDirection: 'row', gap: space(0.75), marginTop: space(0.75) },
    metaChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: colors.goldSoft,
      paddingHorizontal: space(1),
      paddingVertical: 3,
      borderRadius: radius.pill,
    },
    eta: { marginTop: space(0.75) },
    right: { alignItems: 'flex-end', gap: space(1.25) },
    pick: {
      backgroundColor: colors.accent,
      paddingHorizontal: space(2),
      paddingVertical: space(1),
      borderRadius: radius.pill,
    },
    pickText: { fontWeight: '800' },
  });
