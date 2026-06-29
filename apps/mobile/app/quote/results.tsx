import { useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { api, type ApiQuote } from '../../src/api';
import { formatPrice } from '../../src/data';
import { useLocale } from '../../src/locale';
import { colors, radius, shadow, space } from '../../src/theme';
import { Screen, StackHeader, Text } from '../../src/ui';

type Sort = 'rating' | 'price';

export default function QuoteResultsScreen() {
  const { t } = useLocale();
  const router = useRouter();
  const [sort, setSort] = useState<Sort>('rating');
  const { data: incoming = [] } = useQuery({ queryKey: ['quotes'], queryFn: api.quotes });

  const quotes = useMemo(() => {
    const list = [...incoming];
    return sort === 'rating'
      ? list.sort((a, b) => b.rating - a.rating)
      : list.sort((a, b) => a.price - b.price);
  }, [incoming, sort]);

  return (
    <Screen edges={['top']}>
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
          <QuoteCard key={q.id} quote={q} onPick={() => router.push(`/professional/${q.proId}`)} />
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
  return (
    <Pressable onPress={onPress} style={[styles.sortChip, active && styles.sortChipActive]}>
      <Ionicons name={icon} size={13} color={active ? colors.onColor : colors.inkSoft} />
      <Text variant="caption" tone={active ? 'onColor' : 'inkSoft'}>
        {label}
      </Text>
    </Pressable>
  );
}

function QuoteCard({ quote, onPick }: { quote: ApiQuote; onPick: () => void }) {
  const { t } = useLocale();
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
            <View style={[styles.metaChip, { backgroundColor: colors.roseSoft }]}>
              <Ionicons name="people" size={11} color={colors.rose} />
              <Text variant="caption" style={{ color: colors.rose }}>
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
          <Text variant="caption" tone="onColor">
            {t('quotes.pick')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
    paddingHorizontal: space(1.5),
    paddingVertical: space(0.75),
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  sortChipActive: { backgroundColor: colors.rose, borderColor: colors.rose },
  list: { paddingHorizontal: space(3), paddingBottom: space(4), gap: space(1.5) },
  card: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: space(1.5),
    gap: space(1.5),
    alignItems: 'center',
  },
  thumb: { width: 64, height: 64, borderRadius: radius.md, backgroundColor: colors.bgSunken },
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
  right: { alignItems: 'flex-end', gap: space(1) },
  pick: {
    backgroundColor: colors.rose,
    paddingHorizontal: space(1.75),
    paddingVertical: space(1),
    borderRadius: radius.pill,
  },
});
