import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import {
  type Appointment,
  type BookingSource,
  type BookingStatus,
  formatPrice,
} from '../../src/data';
import { formatSlot } from '../../src/datetime';
import { useLocale } from '../../src/locale';
import { useStore } from '../../src/store';
import type { MessageKey } from '@ayna/i18n';
import { radius, space, type ColorTokens } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import { Screen, Segmented, TabHero, Text } from '../../src/ui';

const TABS: { source: BookingSource; labelKey: MessageKey }[] = [
  { source: 'direct', labelKey: 'bookings.tab.direct' },
  { source: 'photo_quote', labelKey: 'bookings.tab.photo' },
  { source: 'demand', labelKey: 'bookings.tab.demand' },
];

const makeStatus = (
  colors: ColorTokens,
): Record<BookingStatus, { key: MessageKey; bg: string; fg: string }> => ({
  confirmed: { key: 'booking.status.confirmed', bg: colors.successSoft, fg: colors.success },
  pending: { key: 'booking.status.pending', bg: colors.goldSoft, fg: colors.gold },
  completed: { key: 'booking.status.completed', bg: colors.surfaceMuted, fg: colors.inkSoft },
  cancelled: { key: 'booking.status.cancelled', bg: colors.dangerSoft, fg: colors.danger },
  awaiting_provider: { key: 'booking.status.awaiting', bg: colors.goldSoft, fg: colors.gold },
  alternative_proposed: { key: 'booking.status.alternative', bg: colors.blueSoft, fg: colors.blue },
  no_show: { key: 'booking.status.no_show', bg: colors.dangerSoft, fg: colors.danger },
  waitlist: { key: 'booking.status.waitlist', bg: colors.blueSoft, fg: colors.blue },
});

export default function BookingsScreen() {
  const { t } = useLocale();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const [active, setActive] = useState<BookingSource>('direct');
  const bookings = useStore((s) => s.bookings);
  const list = bookings.filter((a) => a.source === active);
  // Değerlendirme bekleyen: tamamlanmış ama henüz yorumlanmamış randevular (tüm kaynaklar)
  const pendingReview = bookings.filter((a) => a.status === 'completed' && !a.reviewed);

  return (
    <Screen edges={[]}>
      <TabHero title={t('nav.bookings')} />

      <View style={styles.segmentWrap}>
        <Segmented
          options={TABS.map((tab) => ({ value: tab.source, label: t(tab.labelKey) }))}
          value={active}
          onChange={setActive}
        />
      </View>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {pendingReview.length > 0 ? (
          <Pressable
            style={styles.reviewPrompt}
            onPress={() => router.push('/review/new?id=' + pendingReview[0]!.id)}
          >
            <View style={styles.reviewIcon}>
              <Ionicons name="star" size={20} color={colors.gold} />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="bodyStrong" tone="ink">
                {t('bookings.review_prompt.title')}
                {pendingReview.length > 1 ? ` (${pendingReview.length})` : ''}
              </Text>
              <Text variant="caption" tone="muted">
                {t('bookings.review_prompt.desc')}
              </Text>
            </View>
            <View style={styles.reviewCta}>
              <Text variant="caption" tone="onColor" style={styles.reviewCtaText}>
                {t('bookings.review_prompt.cta')}
              </Text>
            </View>
          </Pressable>
        ) : null}
        {list.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Ionicons name="calendar-outline" size={28} color={colors.rose} />
            </View>
            <Text variant="bodyStrong" tone="ink">
              {t('bookings.empty')}
            </Text>
            <Pressable style={styles.emptyCta} onPress={() => router.push('/discover')}>
              <Text variant="caption" tone="onColor" style={styles.emptyCtaText}>
                {t('bookings.empty_cta')}
              </Text>
            </Pressable>
          </View>
        ) : (
          list.map((a) => <BookingCard key={a.id} appt={a} />)
        )}
      </ScrollView>
    </Screen>
  );
}

function BookingCard({ appt }: { appt: Appointment }) {
  const { t } = useLocale();
  const { colors, shadow } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const st = makeStatus(colors)[appt.status];
  return (
    <Pressable
      style={[styles.card, shadow.soft]}
      onPress={() => router.push('/booking/' + appt.id)}
    >
      <Image source={{ uri: appt.proImage }} style={styles.thumb} />
      <View style={styles.body}>
        <View style={styles.topRow}>
          <Text variant="bodyStrong" tone="ink" numberOfLines={1} style={styles.service}>
            {appt.service}
          </Text>
          <View style={[styles.status, { backgroundColor: st.bg }]}>
            <Text variant="caption" style={[styles.statusText, { color: st.fg }]}>
              {t(st.key)}
            </Text>
          </View>
        </View>
        <View style={styles.metaRow}>
          <Ionicons name="person-outline" size={13} color={colors.muted} />
          <Text variant="caption" tone="inkSoft">
            {appt.proName}
          </Text>
        </View>
        <View style={styles.bottomRow}>
          <View style={styles.metaRow}>
            <Ionicons name="time-outline" size={13} color={colors.muted} />
            <Text variant="caption" tone="inkSoft">
              {formatSlot(appt.startMs, t)}
            </Text>
          </View>
          <Text variant="bodyStrong" tone="ink">
            {formatPrice(appt.price)}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    title: { paddingHorizontal: space(3), paddingTop: space(1), marginBottom: space(2) },
    segmentWrap: { paddingHorizontal: space(3), marginTop: space(2.5), marginBottom: space(2) },
    list: { paddingHorizontal: space(3), paddingBottom: space(13), gap: space(1.5) },
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
      backgroundColor: colors.roseSoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: space(0.5),
    },
    emptyCta: {
      backgroundColor: colors.rose,
      paddingHorizontal: space(2.5),
      paddingVertical: space(1.25),
      borderRadius: radius.pill,
      marginTop: space(0.5),
    },
    emptyCtaText: { fontWeight: '600' },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: space(1.75),
      gap: space(1.75),
    },
    thumb: { width: 72, height: 72, borderRadius: radius.md, backgroundColor: colors.bgSunken },
    body: { flex: 1 },
    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: space(1),
    },
    service: { flex: 1 },
    status: { paddingHorizontal: space(1), paddingVertical: 3, borderRadius: radius.pill },
    statusText: { fontSize: 11 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: space(0.75) },
    bottomRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: space(0.75),
    },
    reviewPrompt: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1.25),
      backgroundColor: colors.goldSoft,
      borderRadius: radius.lg,
      padding: space(1.5),
      marginBottom: space(1.5),
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
      backgroundColor: colors.gold,
      paddingHorizontal: space(1.5),
      paddingVertical: space(0.75),
      borderRadius: radius.pill,
    },
    reviewCtaText: { fontSize: 12, fontWeight: '700' },
  });
