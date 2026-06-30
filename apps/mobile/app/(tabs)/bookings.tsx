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
import { useLocale } from '../../src/locale';
import { useStore } from '../../src/store';
import type { MessageKey } from '@ayna/i18n';
import { radius, space, type ColorTokens } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import { Screen, Segmented, Text } from '../../src/ui';

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
});

export default function BookingsScreen() {
  const { t } = useLocale();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [active, setActive] = useState<BookingSource>('direct');
  const bookings = useStore((s) => s.bookings);
  const list = bookings.filter((a) => a.source === active);

  return (
    <Screen edges={['top']}>
      <Text variant="title" tone="ink" style={styles.title}>
        {t('nav.bookings')}
      </Text>

      <View style={styles.segmentWrap}>
        <Segmented
          options={TABS.map((tab) => ({ value: tab.source, label: t(tab.labelKey) }))}
          value={active}
          onChange={setActive}
        />
      </View>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {list.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="calendar-outline" size={32} color={colors.muted} />
            <Text variant="caption" tone="muted" style={styles.emptyText}>
              {t('bookings.empty')}
            </Text>
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
      style={[styles.card, shadow.card]}
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
              {appt.dateLabel}
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
    segmentWrap: { paddingHorizontal: space(3), marginBottom: space(2) },
    list: { paddingHorizontal: space(3), paddingBottom: space(4), gap: space(1.5) },
    empty: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: space(8),
      gap: space(1.5),
    },
    emptyText: {},
    card: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.line,
      padding: space(1.5),
      gap: space(1.5),
    },
    thumb: { width: 64, height: 64, borderRadius: radius.md, backgroundColor: colors.bgSunken },
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
  });
