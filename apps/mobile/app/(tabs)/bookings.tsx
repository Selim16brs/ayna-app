import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import {
  APPOINTMENTS,
  type Appointment,
  type BookingSource,
  type BookingStatus,
  formatPrice,
} from '../../src/data';
import { useLocale } from '../../src/locale';
import type { MessageKey } from '@ayna/i18n';
import { colors, radius, shadow, space } from '../../src/theme';
import { Screen, Text } from '../../src/ui';

const TABS: {
  source: BookingSource;
  labelKey: MessageKey;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { source: 'direct', labelKey: 'bookings.tab.direct', icon: 'search-outline' },
  { source: 'photo_quote', labelKey: 'bookings.tab.photo', icon: 'camera-outline' },
  { source: 'demand', labelKey: 'bookings.tab.demand', icon: 'pricetag-outline' },
];

const STATUS: Record<BookingStatus, { key: MessageKey; bg: string; fg: string }> = {
  confirmed: { key: 'booking.status.confirmed', bg: '#E4F2EA', fg: colors.success },
  pending: { key: 'booking.status.pending', bg: colors.goldSoft, fg: colors.gold },
  completed: { key: 'booking.status.completed', bg: colors.surfaceMuted, fg: colors.inkSoft },
};

export default function BookingsScreen() {
  const { t } = useLocale();
  const [active, setActive] = useState<BookingSource>('direct');
  const list = APPOINTMENTS.filter((a) => a.source === active);

  return (
    <Screen edges={['top']}>
      <Text variant="title" tone="ink" style={styles.title}>
        {t('nav.bookings')}
      </Text>

      <View style={styles.tabs}>
        {TABS.map((tab) => {
          const on = tab.source === active;
          return (
            <Pressable
              key={tab.source}
              onPress={() => setActive(tab.source)}
              style={[styles.tab, on && styles.tabActive]}
            >
              <Ionicons name={tab.icon} size={15} color={on ? colors.onColor : colors.inkSoft} />
              <Text variant="caption" tone={on ? 'onColor' : 'inkSoft'}>
                {t(tab.labelKey)}
              </Text>
            </Pressable>
          );
        })}
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
  const st = STATUS[appt.status];
  return (
    <View style={[styles.card, shadow.card]}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  title: { paddingHorizontal: space(3), paddingTop: space(1), marginBottom: space(2) },
  tabs: {
    flexDirection: 'row',
    gap: space(1),
    paddingHorizontal: space(3),
    marginBottom: space(2),
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: space(1.25),
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  tabActive: { backgroundColor: colors.rose, borderColor: colors.rose },
  list: { paddingHorizontal: space(3), paddingBottom: space(4), gap: space(1.5) },
  empty: { alignItems: 'center', justifyContent: 'center', paddingTop: space(8), gap: space(1.5) },
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
