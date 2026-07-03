import { useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import {
  type DemandOffer,
  type OfferSort,
  formatPrice,
  sortOffers,
} from '../../src/data';
import { slotTime, formatSlot } from '../../src/datetime';
import { useLocale } from '../../src/locale';
import { useStore } from '../../src/store';
import { type ColorTokens, radius, space } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import { Screen, StackHeader, TAB_BAR_CLEARANCE, Text } from '../../src/ui';

const SORTS: { key: OfferSort; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'recommended', label: 'Önerilen', icon: 'sparkles' },
  { key: 'price', label: 'Fiyat', icon: 'pricetag' },
  { key: 'distance', label: 'Mesafe', icon: 'location' },
  { key: 'rating', label: 'Puan', icon: 'star' },
];

export default function QuoteResultsScreen() {
  const { t } = useLocale();
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { id } = useLocalSearchParams<{ id?: string }>();
  const demand = useStore((s) => s.demands.find((d) => d.id === id));
  const selectOffer = useStore((s) => s.selectOffer);
  const [sort, setSort] = useState<OfferSort>('recommended');

  const offers = useMemo(() => (demand ? sortOffers(demand.offers, sort) : []), [demand, sort]);

  const remainMin = demand
    ? Math.max(0, Math.round((demand.expiresAt - Date.now()) / 60_000))
    : 0;
  const collecting = demand?.status === 'collecting';

  function pick(offer: DemandOffer, slotMs: number) {
    if (!demand) return;
    const bookingId = selectOffer(demand.id, offer.id, slotMs);
    if (bookingId) router.replace(`/booking/${bookingId}`);
  }

  if (!demand) {
    return (
      <Screen edges={[]}>
        <StackHeader title={t('quotes.title')} />
        <View style={styles.empty}>
          <Ionicons name="pricetags-outline" size={30} color={colors.muted} />
          <Text variant="caption" tone="muted">
            {t('quotes.none')}
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen edges={[]}>
      <StackHeader title={t('quotes.title')} />

      {/* Durum + geri sayım */}
      <View style={styles.statusRow}>
        <Text variant="caption" tone="muted">
          {demand.offers.length} {t('quotes.count')}
        </Text>
        {demand.status === 'booked' ? (
          <View style={[styles.statusPill, { backgroundColor: colors.successSoft }]}>
            <Text variant="caption" style={{ color: colors.success, fontWeight: '700' }}>
              {t('quotes.booked')}
            </Text>
          </View>
        ) : collecting ? (
          <View style={[styles.statusPill, { backgroundColor: colors.goldSoft }]}>
            <Ionicons name="time-outline" size={12} color={colors.gold} />
            <Text variant="caption" style={{ color: colors.gold, fontWeight: '700' }}>
              {remainMin} {t('quotes.remain')}
            </Text>
          </View>
        ) : (
          <View style={[styles.statusPill, { backgroundColor: colors.surfaceMuted }]}>
            <Text variant="caption" tone="muted">
              {t('quotes.expired')}
            </Text>
          </View>
        )}
      </View>

      {/* Sıralama */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sortRow}>
        {SORTS.map((s) => {
          const on = s.key === sort;
          return (
            <Pressable key={s.key} onPress={() => setSort(s.key)} style={[styles.sortChip, on && styles.sortChipOn]}>
              <Ionicons name={s.icon} size={13} color={on ? colors.onAccent : colors.inkSoft} />
              <Text variant="caption" tone={on ? 'onAccent' : 'inkSoft'}>
                {s.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {offers.map((o) => (
          <OfferCard key={o.id} offer={o} disabled={demand.status !== 'collecting'} onPick={(slot) => pick(o, slot)} />
        ))}
      </ScrollView>
    </Screen>
  );
}

function OfferCard({
  offer,
  disabled,
  onPick,
}: {
  offer: DemandOffer;
  disabled: boolean;
  onPick: (slotMs: number) => void;
}) {
  const { t } = useLocale();
  const { colors, shadow } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={[styles.card, shadow.card]}>
      <View style={styles.cardTop}>
        <Image source={{ uri: offer.proImage }} style={styles.thumb} />
        <View style={styles.info}>
          <Text variant="bodyStrong" tone="ink" numberOfLines={1}>
            {offer.proName}
          </Text>
          <View style={styles.metaRow}>
            <View style={styles.metaChip}>
              <Ionicons name="star" size={11} color={colors.gold} />
              <Text variant="caption" tone="inkSoft">
                {offer.rating.toFixed(1)} · {offer.reviewCount}
              </Text>
            </View>
            <View style={[styles.metaChip, { backgroundColor: colors.blueSoft }]}>
              <Ionicons name="location" size={11} color={colors.blue} />
              <Text variant="caption" style={{ color: colors.blue }}>
                {offer.distanceKm} km
              </Text>
            </View>
          </View>
          <Text variant="caption" tone="muted" style={styles.eta}>
            {offer.etaMin} {t('pro.min')} · {t('quotes.eta')}
          </Text>
        </View>
        <Text variant="h2" tone="ink">
          {formatPrice(offer.price)}
        </Text>
      </View>

      {offer.note ? (
        <Text variant="caption" tone="inkSoft" style={styles.note}>
          “{offer.note}”
        </Text>
      ) : null}

      {/* Uzmanın önerdiği müsait saatler — dokun = teklifi seç + saati netleştir */}
      <Text variant="caption" tone="muted" style={styles.slotLabel}>
        {t('quotes.slots')}
      </Text>
      <View style={styles.slotRow}>
        {offer.slots.map((s) => (
          <Pressable
            key={s}
            disabled={disabled}
            onPress={() => onPick(s)}
            style={[styles.slotChip, disabled && styles.slotChipOff]}
          >
            <Text variant="caption" tone={disabled ? 'muted' : 'onAccent'} style={styles.slotText}>
              {formatSlot(s, t).split(' · ')[0]} {slotTime(s)}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space(1) },
    statusRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: space(3),
      paddingBottom: space(1),
    },
    statusPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: space(1.25),
      paddingVertical: 4,
      borderRadius: radius.pill,
    },
    sortRow: { paddingHorizontal: space(3), gap: space(1), paddingBottom: space(1.5) },
    sortChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: space(1.75),
      paddingVertical: space(1),
      borderRadius: radius.pill,
      backgroundColor: colors.surfaceMuted,
      height: 36,
    },
    sortChipOn: { backgroundColor: colors.accent },
    list: { paddingHorizontal: space(3), paddingBottom: TAB_BAR_CLEARANCE, gap: space(2) },
    card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: space(2), gap: space(1.25) },
    cardTop: { flexDirection: 'row', gap: space(1.5), alignItems: 'center' },
    thumb: { width: 64, height: 64, borderRadius: radius.md, backgroundColor: colors.bgSunken },
    info: { flex: 1 },
    metaRow: { flexDirection: 'row', gap: space(0.75), marginTop: space(0.5) },
    metaChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: colors.goldSoft,
      paddingHorizontal: space(1),
      paddingVertical: 3,
      borderRadius: radius.pill,
    },
    eta: { marginTop: space(0.5) },
    note: { fontStyle: 'italic', lineHeight: 18 },
    slotLabel: { marginTop: space(0.5) },
    slotRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space(1) },
    slotChip: {
      paddingHorizontal: space(1.75),
      paddingVertical: space(1),
      borderRadius: radius.pill,
      backgroundColor: colors.accent,
    },
    slotChipOff: { backgroundColor: colors.surfaceMuted },
    slotText: { fontWeight: '700' },
  });
