import { useCallback, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import type { MessageKey } from '@ayna/i18n';
import { api } from '../../src/api';
import { type Appointment, type BookingStatus, formatPrice } from '../../src/data';
import { almatyDayStart, almatyParts, daysUntil, formatSlot } from '../../src/datetime';
import { useLocale } from '../../src/locale';
import { useStore } from '../../src/store';
import { type ColorTokens, radius, space } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import { PressableScale, Screen, StackHeader, Text } from '../../src/ui';

type GroupKey = 'past' | 'today' | 'tomorrow' | 'week' | 'later';
const GROUP_ORDER: GroupKey[] = ['today', 'tomorrow', 'week', 'later', 'past'];
const GROUP_LABEL: Record<GroupKey, MessageKey> = {
  past: 'agenda.group.past',
  today: 'agenda.group.today',
  tomorrow: 'agenda.group.tomorrow',
  week: 'agenda.group.week',
  later: 'agenda.group.later',
};

function bucket(inDays: number): GroupKey {
  if (inDays < 0) return 'past';
  if (inDays === 0) return 'today';
  if (inDays === 1) return 'tomorrow';
  if (inDays <= 7) return 'week';
  return 'later';
}

const STATUS_LABEL: Record<BookingStatus, MessageKey> = {
  confirmed: 'booking.status.confirmed',
  pending: 'booking.status.pending',
  completed: 'booking.status.completed',
  cancelled: 'booking.status.cancelled',
  awaiting_provider: 'booking.status.awaiting',
  alternative_proposed: 'booking.status.alternative',
  deposit_pending: 'booking.status.deposit_pending',
  deposit_submitted: 'booking.status.deposit_submitted',
  refund_pending: 'booking.status.refund_pending',
  refund_submitted: 'booking.status.refund_submitted',
  disputed: 'booking.status.disputed',
  no_show: 'booking.status.no_show',
  waitlist: 'booking.status.waitlist',
};

export default function AgendaScreen() {
  const { t } = useLocale();
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const storeBookings = useStore((s) => s.bookings);
  const closedDays = useStore((s) => s.closedDays);
  const toggleClosedDay = useStore((s) => s.toggleClosedDay);
  const [items, setItems] = useState<Appointment[]>([]);

  // §4.6 — önümüzdeki 14 günün "kapalı işaretle" şeridi (izin/tatil)
  const closeStrip = Array.from({ length: 14 }, (_, d) => almatyDayStart(Date.now(), d));

  // Ekran her odaklandığında tazele (offline ekleme sonrası geri dönünce güncel)
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      api
        .bookings()
        .then((b) => alive && setItems(b))
        .catch(() => alive && setItems(storeBookings)); // çevrimdışı: yerel veriler
      return () => {
        alive = false;
      };
    }, [storeBookings]),
  );

  const now = Date.now();
  const groups = GROUP_ORDER.map((key) => ({
    key,
    rows: items
      .filter((b) => bucket(daysUntil(b.startMs, now)) === key)
      .sort((a, b) => a.startMs - b.startMs),
  })).filter((g) => g.rows.length > 0);

  return (
    <Screen edges={[]}>
      <StackHeader title={t('agenda.title')} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* §4.6 — Kapalı günler (izin/tatil): kullanıcı tarafında bu günler slot göstermez */}
        <View style={styles.closeSection}>
          <View style={styles.closeHead}>
            <Ionicons name="calendar-clear-outline" size={16} color={colors.rose} />
            <Text variant="label" tone="rose">
              {t('agenda.closed_title')}
            </Text>
          </View>
          <Text variant="caption" tone="muted" style={styles.closeHint}>
            {t('agenda.closed_hint')}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.closeStrip}>
            {closeStrip.map((dayMs) => {
              const p = almatyParts(dayMs);
              const closed = closedDays.includes(dayMs);
              return (
                <Pressable
                  key={dayMs}
                  onPress={() => toggleClosedDay(dayMs)}
                  style={[styles.closeChip, closed && styles.closeChipOn]}
                >
                  <Text variant="caption" tone={closed ? 'onColor' : 'muted'} style={styles.closeWd}>
                    {t(`wd.${p.wd}` as 'wd.0')}
                  </Text>
                  <Text variant="bodyStrong" tone={closed ? 'onColor' : 'ink'} style={styles.closeNum}>
                    {p.day}
                  </Text>
                  {closed ? (
                    <Ionicons name="lock-closed" size={11} color={colors.onColor} />
                  ) : null}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {groups.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="calendar-outline" size={30} color={colors.muted} />
            <Text variant="caption" tone="muted">
              {t('agenda.empty')}
            </Text>
          </View>
        ) : (
          groups.map((g) => (
            <View key={g.key} style={styles.group}>
              <Text variant="label" tone="rose" style={styles.groupTitle}>
                {t(GROUP_LABEL[g.key])} · {g.rows.length}
              </Text>
              <View style={styles.list}>
                {g.rows.map((b) => (
                  <Pressable
                    key={b.id}
                    style={styles.row}
                    onPress={() => router.push(`/booking/${b.id}`)}
                  >
                    <View style={styles.timeCol}>
                      <Text variant="caption" tone="muted" numberOfLines={1}>
                        {formatSlot(b.startMs, t)}
                      </Text>
                    </View>
                    <View style={styles.rowBody}>
                      <View style={styles.serviceRow}>
                        <Text variant="bodyStrong" tone="ink" numberOfLines={1} style={styles.flexShrink}>
                          {b.service}
                        </Text>
                        {b.bookingKind === 'group' ? (
                          <View style={styles.kindTag}>
                            <Text variant="caption" style={styles.kindText}>
                              {t('agenda.group')}
                              {b.groupSize ? ` ${b.groupSize}` : ''}
                            </Text>
                          </View>
                        ) : b.bookingKind === 'express' ? (
                          <View style={styles.kindTag}>
                            <Text variant="caption" style={styles.kindText}>
                              {t('agenda.express')}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                      <Text variant="caption" tone="muted" numberOfLines={1}>
                        {b.customerName ? `${b.customerName} · ` : ''}
                        {b.uzmanName ?? b.proName}
                      </Text>
                    </View>
                    <View style={styles.rowRight}>
                      <StatusPill status={b.status} />
                      <Text variant="caption" tone="inkSoft">
                        {formatPrice(b.price)}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Offline randevu ekle (§2.2) */}
      <View style={styles.fabWrap}>
        <PressableScale style={styles.fab} onPress={() => router.push('/seller/offline')}>
          <Ionicons name="add" size={20} color={colors.onColor} />
          <Text variant="bodyStrong" tone="onColor">
            {t('agenda.add_offline')}
          </Text>
        </PressableScale>
      </View>
    </Screen>
  );
}

function StatusPill({ status }: { status: BookingStatus }) {
  const { t } = useLocale();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const tone =
    status === 'cancelled' || status === 'no_show'
      ? { bg: colors.dangerSoft, fg: colors.danger }
      : status === 'completed'
        ? { bg: colors.surfaceMuted, fg: colors.inkSoft }
        : status === 'confirmed'
          ? { bg: colors.successSoft, fg: colors.success }
          : { bg: colors.goldSoft, fg: colors.gold };
  return (
    <View style={[styles.pill, { backgroundColor: tone.bg }]}>
      <Text variant="caption" style={{ color: tone.fg, fontWeight: '600' }}>
        {t(STATUS_LABEL[status])}
      </Text>
    </View>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    content: { paddingHorizontal: space(2.5), paddingBottom: space(12) },
    closeSection: {
      marginTop: space(1),
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: space(2),
      gap: space(1),
    },
    closeHead: { flexDirection: 'row', alignItems: 'center', gap: space(0.75) },
    closeHint: { marginTop: -space(0.5) },
    closeStrip: { gap: space(1), paddingTop: space(0.5) },
    closeChip: {
      width: 48,
      paddingVertical: space(1),
      borderRadius: radius.md,
      backgroundColor: colors.surfaceMuted,
      alignItems: 'center',
      gap: 1,
    },
    closeChipOn: { backgroundColor: colors.rose },
    closeWd: { textTransform: 'uppercase', letterSpacing: 0.4 },
    closeNum: { fontSize: 16 },
    empty: { alignItems: 'center', paddingTop: space(8), gap: space(1) },
    group: { marginTop: space(2) },
    groupTitle: { marginBottom: space(1), marginLeft: space(0.5) },
    list: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.line,
      overflow: 'hidden',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1.25),
      paddingHorizontal: space(1.75),
      paddingVertical: space(1.5),
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.line,
    },
    timeCol: { width: 72 },
    rowBody: { flex: 1, gap: 2 },
    serviceRow: { flexDirection: 'row', alignItems: 'center', gap: space(0.75) },
    flexShrink: { flexShrink: 1 },
    kindTag: {
      backgroundColor: colors.lavenderSoft,
      paddingHorizontal: space(0.75),
      paddingVertical: 2,
      borderRadius: radius.pill,
    },
    kindText: { color: colors.lavender, fontWeight: '700', fontSize: 10 },
    rowRight: { alignItems: 'flex-end', gap: 4 },
    pill: {
      paddingHorizontal: space(1),
      paddingVertical: 3,
      borderRadius: radius.pill,
    },
    fabWrap: { position: 'absolute', left: 0, right: 0, bottom: space(2.5), alignItems: 'center' },
    fab: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(0.75),
      backgroundColor: colors.rose,
      paddingHorizontal: space(2.5),
      paddingVertical: space(1.5),
      borderRadius: radius.pill,
    },
  });
