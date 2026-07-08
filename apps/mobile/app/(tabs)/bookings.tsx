import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import {
  type Appointment,
  type BookingStatus,
  CATEGORIES,
  type DemandRequest,
  formatPrice,
} from '../../src/data';
import { formatSlot } from '../../src/datetime';
import { useLocale } from '../../src/locale';
import { useStore } from '../../src/store';
import type { MessageKey } from '@ayna/i18n';
import { radius, space, type ColorTokens } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import { Screen, TabHero, Text } from '../../src/ui';

// §5.3 — üst segment: Taleplerim | Randevularım | Geçmiş
type Seg = 'requests' | 'upcoming' | 'past';
const SEGS: { value: Seg; labelKey: MessageKey }[] = [
  { value: 'requests', labelKey: 'bookings.seg.requests' },
  { value: 'upcoming', labelKey: 'bookings.seg.upcoming' },
  { value: 'past', labelKey: 'bookings.seg.past' },
];

const catLabel = (id: string): MessageKey =>
  (CATEGORIES.find((c) => c.id === id)?.labelKey ?? 'nav.bookings') as MessageKey;

const makeStatus = (
  colors: ColorTokens,
): Record<BookingStatus, { key: MessageKey; bg: string; fg: string }> => ({
  confirmed: { key: 'booking.status.confirmed', bg: colors.successSoft, fg: colors.success },
  pending: { key: 'booking.status.pending', bg: colors.goldSoft, fg: colors.gold },
  completed: { key: 'booking.status.completed', bg: colors.surfaceMuted, fg: colors.inkSoft },
  cancelled: { key: 'booking.status.cancelled', bg: colors.dangerSoft, fg: colors.danger },
  awaiting_provider: { key: 'booking.status.awaiting', bg: colors.goldSoft, fg: colors.gold },
  alternative_proposed: { key: 'booking.status.alternative', bg: colors.blueSoft, fg: colors.blue },
  deposit_pending: { key: 'booking.status.deposit_pending', bg: colors.goldSoft, fg: colors.gold },
  deposit_submitted: {
    key: 'booking.status.deposit_submitted',
    bg: colors.blueSoft,
    fg: colors.blue,
  },
  refund_pending: { key: 'booking.status.refund_pending', bg: colors.goldSoft, fg: colors.gold },
  refund_submitted: {
    key: 'booking.status.refund_submitted',
    bg: colors.blueSoft,
    fg: colors.blue,
  },
  disputed: { key: 'booking.status.disputed', bg: colors.dangerSoft, fg: colors.danger },
  reassigned_pending: {
    key: 'booking.status.reassigned_pending',
    bg: colors.blueSoft,
    fg: colors.blue,
  },
  no_show: { key: 'booking.status.no_show', bg: colors.dangerSoft, fg: colors.danger },
  waitlist: { key: 'booking.status.waitlist', bg: colors.blueSoft, fg: colors.blue },
});

export default function BookingsScreen() {
  const { t } = useLocale();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const [active, setActive] = useState<Seg>('upcoming');
  const bookings = useStore((s) => s.bookings);
  const allDemands = useStore((s) => s.demands);
  // §5.2 — randevuya DÖNÜŞEN (booked) talep artık talep değildir: Randevular'da yaşar
  const demands = allDemands.filter((d) => !d.seeded && d.status !== 'booked');
  const now = Date.now();

  const isUpcoming = (a: Appointment) =>
    a.startMs >= now && !['completed', 'cancelled', 'no_show'].includes(a.status);
  const upcoming = bookings.filter(isUpcoming).sort((a, b) => a.startMs - b.startMs);
  const past = bookings.filter((a) => !isUpcoming(a)).sort((a, b) => b.startMs - a.startMs);
  const pendingReview = bookings.filter((a) => a.status === 'completed' && !a.reviewed);

  const showEmpty =
    (active === 'requests' && demands.length === 0) ||
    (active === 'upcoming' && upcoming.length === 0) ||
    (active === 'past' && past.length === 0);

  return (
    <Screen edges={[]}>
      {/* Diğer sekmelerle tutarlı yeşil hero başlık */}
      <TabHero title={t('nav.bookings')} />

      {/* Alt-çizgili sekmeler */}
      <View style={styles.tabs}>
        {SEGS.map((s) => {
          const on = s.value === active;
          return (
            <Pressable key={s.value} style={styles.tab} onPress={() => setActive(s.value)}>
              <Text
                variant="bodyStrong"
                style={[styles.tabText, on ? styles.tabOn : styles.tabOff]}
              >
                {t(s.labelKey)}
              </Text>
              {on ? <View style={styles.tabBar} /> : null}
            </Pressable>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {active === 'past' && pendingReview.length > 0 ? (
          <Pressable
            style={styles.reviewPrompt}
            onPress={() => router.push('/review/new?id=' + pendingReview[0]!.id)}
          >
            <View style={styles.reviewIcon}>
              <Ionicons name="star" size={20} color={colors.gold} />
            </View>
            <View style={styles.flex}>
              <Text variant="bodyStrong" tone="ink">
                {t('bookings.review_prompt.title')}
                {pendingReview.length > 1 ? ` (${pendingReview.length})` : ''}
              </Text>
              <Text variant="caption" tone="muted">
                {t('bookings.review_prompt.desc')}
              </Text>
            </View>
            <View style={styles.reviewCta}>
              <Text variant="caption" tone="onAccent" style={styles.reviewCtaText}>
                {t('bookings.review_prompt.cta')}
              </Text>
            </View>
          </Pressable>
        ) : null}

        {showEmpty ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name={active === 'requests' ? 'pricetags-outline' : 'calendar-outline'}
                size={30}
                color={colors.inkSoft}
              />
            </View>
            <Text variant="bodyStrong" tone="ink">
              {t(active === 'requests' ? 'bookings.requests_empty' : 'bookings.empty')}
            </Text>
            <Pressable
              style={styles.emptyCta}
              onPress={() => router.push(active === 'requests' ? '/quote' : '/discover')}
            >
              <Text variant="bodyStrong" tone="onAccent">
                {t('bookings.empty_cta')}
              </Text>
            </Pressable>
          </View>
        ) : active === 'requests' ? (
          demands.map((d) => <DemandCard key={d.id} demand={d} />)
        ) : active === 'upcoming' ? (
          upcoming.map((a) => <BookingCard key={a.id} appt={a} upcoming />)
        ) : (
          past.map((a) => <BookingCard key={a.id} appt={a} />)
        )}
      </ScrollView>
    </Screen>
  );
}

// VELOURA "My Booking" kartı: üst satır tarih·saat + durum pili → thumbnail + ad/hizmet/fiyat → aksiyonlar
function BookingCard({ appt, upcoming }: { appt: Appointment; upcoming?: boolean }) {
  const { t } = useLocale();
  const { colors, shadow } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const st = makeStatus(colors)[appt.status];
  const toDetail = () => router.push('/booking/' + appt.id);
  return (
    <View style={[styles.card, shadow.soft]}>
      <View style={styles.cardHead}>
        <Text variant="caption" tone="inkSoft" style={styles.cardDate}>
          {formatSlot(appt.startMs, t)}
        </Text>
        <View style={[styles.status, { backgroundColor: st.bg }]}>
          <Text variant="caption" style={[styles.statusText, { color: st.fg }]}>
            {t(st.key)}
          </Text>
        </View>
      </View>
      <View style={styles.divider} />
      <Pressable style={styles.cardMain} onPress={toDetail}>
        <Image source={{ uri: appt.proImage }} style={styles.thumb} />
        <View style={styles.flex}>
          <Text variant="bodyStrong" tone="ink" numberOfLines={1}>
            {appt.proName}
          </Text>
          <Text variant="caption" tone="muted" numberOfLines={1} style={styles.cardSub}>
            {appt.service}
          </Text>
          {appt.uzmanName ? (
            <Text variant="caption" tone="inkSoft" numberOfLines={1} style={styles.cardSub}>
              {appt.uzmanName}
            </Text>
          ) : null}
          <Text variant="bodyStrong" tone="ink" style={styles.cardPrice}>
            {formatPrice(appt.price)}
          </Text>
        </View>
      </Pressable>
      {upcoming ? (
        <View style={styles.actions}>
          <Pressable style={[styles.btn, styles.btnOutline]} onPress={toDetail}>
            <Text variant="caption" style={[styles.btnText, { color: colors.danger }]}>
              {t('common.cancel')}
            </Text>
          </Pressable>
          <Pressable style={[styles.btn, styles.btnFilled]} onPress={toDetail}>
            <Text variant="caption" tone="onAccent" style={styles.btnText}>
              {t('bookings.action.detail')}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

// §5.3 Taleplerim — talep kartı: kategori + durum (geri sayım / X teklif / süre doldu / dönüştü)
function DemandCard({ demand }: { demand: DemandRequest }) {
  const { t } = useLocale();
  const { colors, shadow } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const remainMin = Math.max(0, Math.round((demand.expiresAt - Date.now()) / 60_000));
  const collecting = demand.status === 'collecting';

  const badge =
    demand.status === 'booked'
      ? { text: t('quotes.booked'), bg: colors.successSoft, fg: colors.success }
      : demand.status === 'expired'
        ? { text: t('quotes.expired'), bg: colors.surfaceMuted, fg: colors.inkSoft }
        : { text: `${remainMin} ${t('quotes.remain')}`, bg: colors.goldSoft, fg: colors.gold };

  return (
    <Pressable
      style={[styles.card, styles.cardPad, shadow.soft]}
      onPress={() => router.push(`/quote/results?id=${demand.id}`)}
    >
      <View style={styles.demandRow}>
        <View style={styles.demandIcon}>
          <Ionicons
            name={demand.mode === 'photo' ? 'image-outline' : 'chatbubble-ellipses-outline'}
            size={22}
            color={colors.ink}
          />
        </View>
        <View style={styles.flex}>
          <View style={styles.cardHead}>
            <Text variant="bodyStrong" tone="ink" numberOfLines={1} style={styles.flex}>
              {t(catLabel(demand.category))}
            </Text>
            <View style={[styles.status, { backgroundColor: badge.bg }]}>
              <Text variant="caption" style={[styles.statusText, { color: badge.fg }]}>
                {badge.text}
              </Text>
            </View>
          </View>
          <View style={styles.demandMeta}>
            <View style={styles.metaRow}>
              <Ionicons name="pricetags-outline" size={13} color={colors.muted} />
              <Text variant="caption" tone="inkSoft">
                {demand.offers.length} {t('quotes.count')}
              </Text>
            </View>
            {collecting ? (
              <Text variant="caption" style={styles.demandCta}>
                {t('demand.card.view')}
              </Text>
            ) : null}
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    flex: { flex: 1 },
    tabs: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.line,
      paddingHorizontal: space(2),
    },
    tab: { flex: 1, alignItems: 'center', paddingVertical: space(1.5), gap: space(1) },
    tabText: { fontSize: 15 },
    tabOn: { color: '#6F8C1B' },
    tabOff: { color: colors.muted },
    tabBar: {
      position: 'absolute',
      bottom: -StyleSheet.hairlineWidth,
      height: 2.5,
      width: '60%',
      borderRadius: 2,
      backgroundColor: '#6F8C1B',
    },
    list: { padding: space(2.5), paddingBottom: space(13), gap: space(2) },

    card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: space(2) },
    cardPad: {},
    cardHead: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: space(1),
    },
    cardDate: { fontSize: 12.5 },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.line,
      marginVertical: space(1.5),
    },
    cardMain: { flexDirection: 'row', gap: space(1.75), alignItems: 'center' },
    thumb: { width: 76, height: 76, borderRadius: radius.md, backgroundColor: colors.bgSunken },
    cardSub: { marginTop: 2 },
    cardPrice: { marginTop: space(0.75) },
    status: { paddingHorizontal: space(1.25), paddingVertical: 4, borderRadius: radius.pill },
    statusText: { fontSize: 11, fontWeight: '600' },

    actions: { flexDirection: 'row', gap: space(1.25), marginTop: space(1.75) },
    btn: {
      flex: 1,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    btnOutline: { borderWidth: 1.25, borderColor: colors.line },
    btnFilled: { backgroundColor: colors.accent },
    btnText: { fontSize: 13.5, fontWeight: '700' },

    demandRow: { flexDirection: 'row', gap: space(1.5), alignItems: 'center' },
    demandIcon: {
      width: 52,
      height: 52,
      borderRadius: radius.md,
      backgroundColor: colors.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    demandMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: space(0.75),
    },
    demandCta: { fontWeight: '700', color: '#6F8C1B' },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },

    empty: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: space(9),
      gap: space(1.5),
    },
    emptyIcon: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: colors.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyCta: {
      backgroundColor: colors.accent,
      paddingHorizontal: space(3),
      paddingVertical: space(1.5),
      borderRadius: radius.pill,
      marginTop: space(0.5),
    },
    reviewPrompt: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1.25),
      backgroundColor: colors.goldSoft,
      borderRadius: radius.lg,
      padding: space(1.75),
    },
    reviewIcon: {
      width: 40,
      height: 40,
      borderRadius: radius.pill,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    reviewCta: {
      backgroundColor: colors.accent,
      paddingHorizontal: space(1.75),
      paddingVertical: space(0.9),
      borderRadius: radius.pill,
    },
    reviewCtaText: { fontSize: 12, fontWeight: '700' },
  });
