import { useCallback, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { type DemandOffer, type OfferSort, formatPrice, sortOffers } from '../../src/data';
import { slotTime, formatSlot } from '../../src/datetime';
import type { MessageKey } from '@ayna/i18n';
import { fillParams, useLocale } from '../../src/locale';
import { useStore } from '../../src/store';
import { type ColorTokens, radius, space, font } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import {
  ListSkeleton,
  PriceSpread,
  Screen,
  StackHeader,
  TAB_BAR_CLEARANCE,
  Text,
} from '../../src/ui';

// Etiketler i18n anahtarı üzerinden — sabit Türkçe metin RU/KK'da kırılırdı.
const SORTS: { key: OfferSort; labelKey: MessageKey; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'recommended', labelKey: 'quotes.filter.recommended', icon: 'sparkles' },
  { key: 'price', labelKey: 'quotes.filter.price', icon: 'pricetag' },
  { key: 'distance', labelKey: 'quotes.filter.distance', icon: 'location' },
  { key: 'rating', labelKey: 'quotes.filter.rating', icon: 'star' },
];

export default function QuoteResultsScreen() {
  const { t } = useLocale();
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { id } = useLocalSearchParams<{ id?: string }>();
  const demand = useStore((s) => s.demands.find((d) => d.id === id));
  const selectOffer = useStore((s) => s.selectOffer);
  const hydrateDemands = useStore((s) => s.hydrateDemands);
  const [sort, setSort] = useState<OfferSort>('recommended');
  const [picking, setPicking] = useState(false);

  // §5.2 Faz A — teklifler BULUTTAN gelir: ekran odaklıyken 15 sn'de bir tazele
  // (uzman teklif verdikçe liste kendiliğinden dolar).
  useFocusEffect(
    useCallback(() => {
      void hydrateDemands();
      const timer = setInterval(() => void hydrateDemands(), 15_000);
      return () => clearInterval(timer);
    }, [hydrateDemands]),
  );

  const offers = useMemo(() => (demand ? sortOffers(demand.offers, sort) : []), [demand, sort]);

  // Rozetler SIRALAMADAN BAĞIMSIZ hesaplanır — kullanıcı sıralamayı değiştirince
  // "en iyi denge" başka bir teklife atlarsa güven kaybolur.
  const { balanceId, cheapestId } = useMemo(() => {
    const all = demand?.offers ?? [];
    // İki teklifte "en iyisi" demek anlamsız; rozet yalnız 3+ teklifte.
    if (all.length < 3) return { balanceId: null, cheapestId: null };
    const balance = sortOffers(all, 'recommended')[0] ?? null;
    const cheapest = [...all].sort((a, b) => a.price - b.price)[0] ?? null;
    return {
      balanceId: balance?.id ?? null,
      // En ucuz zaten "denge" rozetini aldıysa ikinci rozet gürültü olur.
      cheapestId: cheapest && cheapest.id !== balance?.id ? cheapest.id : null,
    };
  }, [demand?.offers]);

  const remainMin = demand ? Math.max(0, Math.round((demand.expiresAt - Date.now()) / 60_000)) : 0;
  const collecting = demand?.status === 'collecting';

  function pick(offer: DemandOffer, slotMs: number) {
    if (!demand || picking) return;
    // §4.1 — dokunuş = onay DEĞİL: önce açık onay sor (yanlışlıkla randevu oluşmasın)
    Alert.alert(
      t('quotes.confirm_t'),
      fillParams(t('quotes.confirm_b'), {
        pro: offer.proName,
        slot: formatSlot(slotMs, t),
        price: formatPrice(offer.price),
      }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('quotes.confirm_cta'), onPress: () => void doPick(offer, slotMs) },
      ],
    );
  }

  async function doPick(offer: DemandOffer, slotMs: number) {
    if (!demand || picking) return;
    setPicking(true);
    try {
      const bookingId = await selectOffer(demand.id, offer.id, slotMs);
      if (bookingId) router.replace(`/booking/${bookingId}`);
      else Alert.alert(t('common.error'), t('quotes.pick_err'));
    } finally {
      setPicking(false);
    }
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
            <Text variant="caption" style={{ color: colors.success, fontFamily: font.semibold }}>
              {t('quotes.booked')}
            </Text>
          </View>
        ) : collecting ? (
          <View style={[styles.statusPill, { backgroundColor: colors.goldSoft }]}>
            <Ionicons name="time-outline" size={12} color={colors.gold} />
            <Text variant="caption" style={{ color: colors.gold, fontFamily: font.semibold }}>
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
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.sortRow}
      >
        {SORTS.map((s) => {
          const on = s.key === sort;
          return (
            <Pressable
              key={s.key}
              onPress={() => setSort(s.key)}
              style={[styles.sortChip, on && styles.sortChipOn]}
            >
              <Ionicons name={s.icon} size={13} color={on ? colors.onAccent : colors.inkSoft} />
              <Text variant="caption" tone={on ? 'onAccent' : 'inkSoft'}>
                {t(s.labelKey)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {/* FİYAT ARALIĞI — "bu fiyat ucuz mu?" tahmine kalmasın. 3+ teklifte görünür. */}
        <PriceSpread prices={demand.offers.map((o) => o.price)} format={formatPrice} />

        {offers.length === 0 && collecting ? (
          // Polish 2.3 — teklifler TOPLANIYOR: ölü ekran yerine canlı iskelet + açıklama
          <>
            <Text variant="caption" tone="muted" style={styles.collectingNote}>
              {t('quotes.empty_collecting')}
            </Text>
            <ListSkeleton rows={3} />
          </>
        ) : offers.length === 0 ? (
          // §5.2 — süre doldu: "uzat/bütçeyi gözden geçir"
          <View style={styles.listEmpty}>
            <Ionicons
              name={collecting ? 'time-outline' : 'sad-outline'}
              size={34}
              color={colors.muted}
            />
            <Text variant="body" tone="muted" style={styles.listEmptyText}>
              {t(collecting ? 'quotes.empty_collecting' : 'quotes.empty_expired')}
            </Text>
            {!collecting && demand.status !== 'booked' ? (
              <Pressable style={styles.listEmptyCta} onPress={() => router.push('/demand/new')}>
                <Text variant="bodyStrong" tone="onAccent">
                  {t('quotes.empty_cta')}
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : (
          offers.map((o) => (
            <OfferCard
              key={o.id}
              offer={o}
              disabled={demand.status !== 'collecting'}
              badge={o.id === balanceId ? 'balance' : o.id === cheapestId ? 'cheapest' : null}
              onPick={(slot) => pick(o, slot)}
            />
          ))
        )}

        {/* PARA KURALI — seçim ekranının en altında, karar anından hemen önce.
            İkinci cümle gerçek bir yükü kaldırıyor: reddetme zorunluluğu bizde. */}
        {offers.length > 0 ? (
          <View style={styles.moneyNote}>
            <Ionicons name="shield-checkmark-outline" size={15} color={colors.success} />
            <Text variant="caption" tone="inkSoft" style={styles.moneyNoteText}>
              {t('quotes.money_note')}
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

/** Yorum sayısı bu eşiğin altındaki uzman "yeni" sayılır ve bu AÇIKÇA yazılır. */
const NEW_PRO_REVIEWS = 30;

function OfferCard({
  offer,
  disabled,
  badge,
  onPick,
}: {
  offer: DemandOffer;
  disabled: boolean;
  /** Sıralamadan bağımsız rozet; sebebi kartın üstünde yazılı. */
  badge?: 'balance' | 'cheapest' | null;
  onPick: (slotMs: number) => void;
}) {
  const router = useRouter();
  const { t } = useLocale();
  const { colors, shadow } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const isNewPro = offer.reviewCount < NEW_PRO_REVIEWS;

  return (
    <View style={[styles.card, shadow.card, badge === 'balance' && styles.cardBest]}>
      {/* ROZET — neden öne çıktığı YAZILI; gizli algoritma yok */}
      {badge ? (
        <View style={[styles.badgeRow, badge === 'balance' && styles.badgeRowBest]}>
          <Ionicons
            name={badge === 'balance' ? 'ribbon' : 'pricetag'}
            size={13}
            color={badge === 'balance' ? colors.onAccent : colors.success}
          />
          <Text variant="micro" tone={badge === 'balance' ? 'onAccent' : 'sage'} numberOfLines={1}>
            {t(badge === 'balance' ? 'quotes.badge.balance' : 'quotes.badge.cheapest')}
          </Text>
        </View>
      ) : null}

      {/* Uzman başlığı = profil butonu (yalnız keşif kartı olan uzmanda) — ticari
          veri İÇERMEYEN public profile gider */}
      <Pressable
        style={styles.cardTop}
        disabled={!offer.profileId}
        onPress={() => offer.profileId && router.push(`/professional/${offer.profileId}`)}
      >
        <Image source={{ uri: offer.proImage }} style={styles.thumb} />
        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text variant="bodyStrong" tone="ink" numberOfLines={1} style={styles.nameText}>
              {offer.proName}
            </Text>
            {offer.profileId ? (
              <Ionicons name="chevron-forward" size={15} color={colors.muted} />
            ) : null}
          </View>
          <View style={styles.metaRow}>
            <View style={styles.metaChip}>
              <Ionicons name="star" size={11} color={colors.gold} />
              <Text variant="caption" tone="inkSoft">
                {offer.rating.toFixed(1)} · {offer.reviewCount}
              </Text>
            </View>
            {/* Mesafe bir UYARI ya da BİLGİ durumu değil; mavi bilgi rengi
                buraya ait değildi. Keşfetteki zaman rozetiyle aynı dil. */}
            <View style={[styles.metaChip, { backgroundColor: colors.accentSoft }]}>
              <Ionicons name="location" size={11} color={colors.accent} />
              <Text variant="caption" style={{ color: colors.accent }}>
                {offer.distanceKm} km
              </Text>
            </View>
          </View>
          <Text variant="caption" tone="muted" style={styles.eta}>
            {offer.etaMin} {t('pro.min')} · {t('quotes.eta')}
          </Text>
        </View>
        <View style={styles.priceCol}>
          {/* §A2 — ⚡Fırsat teklifi (sakin saat/son dakika indirimi) */}
          {(offer.discountPercent ?? 0) > 0 ? (
            <View style={styles.dealBadge}>
              <Ionicons name="flash" size={11} color={colors.onAccent} />
              <Text variant="caption" tone="onAccent" style={styles.dealText}>
                {t('quotes.deal')} -%{offer.discountPercent}
              </Text>
            </View>
          ) : null}
          <Text variant="h2" tone="ink">
            {formatPrice(offer.price)}
          </Text>
        </View>
      </Pressable>

      {/* YENİ UZMAN — saklamıyoruz, açıklıyoruz. Ne gizle ne cezalandır:
          kullanıcı bilerek seçsin. */}
      {isNewPro ? (
        <View style={styles.newPro}>
          <Ionicons name="information-circle-outline" size={15} color={colors.gold} />
          <View style={styles.newProText}>
            <Text variant="captionStrong" style={{ color: colors.gold }}>
              {t('quotes.new_pro')}
            </Text>
            <Text variant="caption" tone="inkSoft">
              {fillParams(t('quotes.new_pro_note'), { n: String(offer.reviewCount) })}
            </Text>
          </View>
        </View>
      ) : null}

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
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.line,
      height: 36,
    },
    sortChipOn: { backgroundColor: colors.accent },
    list: { paddingHorizontal: space(3), paddingBottom: TAB_BAR_CLEARANCE, gap: space(2) },
    collectingNote: { textAlign: 'center', paddingHorizontal: space(3), paddingTop: space(2) },
    listEmpty: {
      alignItems: 'center',
      gap: space(1.5),
      paddingTop: space(8),
      paddingHorizontal: space(4),
    },
    listEmptyText: { textAlign: 'center' },
    listEmptyCta: {
      marginTop: space(1),
      backgroundColor: colors.accent,
      borderRadius: radius.pill,
      paddingHorizontal: space(3),
      paddingVertical: space(1.5),
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: space(2),
      gap: space(1.25),
    },
    cardBest: { borderWidth: 2, borderColor: colors.accent },
    badgeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(0.75),
      alignSelf: 'flex-start',
      paddingHorizontal: space(1.25),
      paddingVertical: space(0.625),
      borderRadius: radius.pill,
      backgroundColor: colors.successSoft,
    },
    badgeRowBest: { backgroundColor: colors.accent },
    newPro: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: space(1),
      backgroundColor: colors.goldSoft,
      borderRadius: radius.md,
      padding: space(1.25),
    },
    newProText: { flex: 1, gap: 2 },
    moneyNote: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: space(1),
      paddingHorizontal: space(0.5),
      paddingTop: space(1),
    },
    moneyNoteText: { flex: 1 },
    cardTop: { flexDirection: 'row', gap: space(1.5), alignItems: 'center' },
    thumb: { width: 64, height: 64, borderRadius: radius.md, backgroundColor: colors.bgSunken },
    info: { flex: 1 },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
    nameText: { flexShrink: 1 },
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
    priceCol: { alignItems: 'flex-end', gap: 4 },
    dealBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      backgroundColor: colors.accentFg,
      paddingHorizontal: space(1),
      paddingVertical: 3,
      borderRadius: radius.pill,
    },
    dealText: { fontFamily: font.semibold },
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
    slotText: { fontFamily: font.semibold },
  });
