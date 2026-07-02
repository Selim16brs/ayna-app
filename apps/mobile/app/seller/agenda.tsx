import { useCallback, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import type { MessageKey } from '@ayna/i18n';
import { api } from '../../src/api';
import { type Appointment, type BookingStatus, formatPrice } from '../../src/data';
import { almatyDayStart, almatyParts, daysUntil, formatSlot, slotTime } from '../../src/datetime';
import { useLocale } from '../../src/locale';
import { useStore } from '../../src/store';
import { type ColorTokens, radius, space } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import { PressableScale, Screen, Segmented, StackHeader, Text } from '../../src/ui';

type DayRow = { type: 'free'; startMs: number; endMs: number } | { type: 'busy'; b: Appointment };
const OPEN_H = 10;
const CLOSE_H = 19;

// §4.6 uzman gün-ızgarası: açık pencere içinde boş aralıklar + randevu blokları
function buildDayRows(dayStart: number, dayBookings: Appointment[]): DayRow[] {
  const openStart = dayStart + OPEN_H * 3_600_000;
  const openEnd = dayStart + CLOSE_H * 3_600_000;
  const bs = dayBookings
    .filter((b) => b.status !== 'cancelled')
    .sort((a, b) => a.startMs - b.startMs);
  const rows: DayRow[] = [];
  let cursor = openStart;
  for (const b of bs) {
    const bStart = Math.max(b.startMs, openStart);
    if (bStart > cursor) rows.push({ type: 'free', startMs: cursor, endMs: bStart });
    rows.push({ type: 'busy', b });
    cursor = Math.max(cursor, b.startMs + b.durationMin * 60_000);
  }
  if (cursor < openEnd) rows.push({ type: 'free', startMs: cursor, endMs: openEnd });
  return rows;
}

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
  const [view, setView] = useState<'day' | 'list'>('day'); // §4.6 varsayılan: gün ajandası
  const [dayIdx, setDayIdx] = useState(0);

  // §4.6 — önümüzdeki 14 gün (gün seçici + kapalı işaretleme)
  const dayStrip = Array.from({ length: 14 }, (_, d) => almatyDayStart(Date.now(), d));
  const selectedDay = dayStrip[dayIdx] ?? dayStrip[0]!;
  const dayClosed = closedDays.includes(selectedDay);
  const dayBookings = items.filter((b) => almatyDayStart(b.startMs, 0) === selectedDay);
  const dayRows = buildDayRows(selectedDay, dayBookings);

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
        <View style={styles.toggleWrap}>
          <Segmented
            options={[
              { value: 'day', label: t('agenda.view.day') },
              { value: 'list', label: t('agenda.view.list') },
            ]}
            value={view}
            onChange={setView}
          />
        </View>

        {view === 'day' ? (
          <>
            {/* Gün seçici şeridi (kapalı günler kilitli) */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayStrip}>
              {dayStrip.map((dayMs, i) => {
                const p = almatyParts(dayMs);
                const on = i === dayIdx;
                const closed = closedDays.includes(dayMs);
                const has = items.some(
                  (b) => almatyDayStart(b.startMs, 0) === dayMs && b.status !== 'cancelled',
                );
                return (
                  <Pressable
                    key={dayMs}
                    onPress={() => setDayIdx(i)}
                    style={[styles.dayChip, on && styles.dayChipOn]}
                  >
                    <Text variant="caption" tone={on ? 'onAccent' : 'muted'} style={styles.closeWd}>
                      {t(`wd.${p.wd}` as 'wd.0')}
                    </Text>
                    <Text variant="bodyStrong" tone={on ? 'onAccent' : 'ink'} style={styles.closeNum}>
                      {p.day}
                    </Text>
                    {closed ? (
                      <Ionicons name="lock-closed" size={11} color={on ? colors.onAccent : colors.rose} />
                    ) : (
                      <View style={[styles.dayDot, has ? styles.dayDotOn : styles.dayDotOff]} />
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Seçili gün başlığı + Açık/Kapalı toggle */}
            <View style={styles.dayHeader}>
              <Text variant="bodyStrong" tone="ink">
                {formatSlot(selectedDay, t).split(' · ')[0]} · {almatyParts(selectedDay).day}
              </Text>
              <Pressable
                onPress={() => toggleClosedDay(selectedDay)}
                style={[styles.closeToggle, dayClosed && styles.closeToggleOn]}
              >
                <Ionicons
                  name={dayClosed ? 'lock-closed' : 'lock-open-outline'}
                  size={14}
                  color={dayClosed ? colors.onColor : colors.rose}
                />
                <Text variant="caption" tone={dayClosed ? 'onColor' : 'rose'} style={styles.closeToggleText}>
                  {dayClosed ? t('agenda.mark_open') : t('agenda.mark_closed')}
                </Text>
              </Pressable>
            </View>

            {dayClosed ? (
              <View style={styles.closedBanner}>
                <Ionicons name="calendar-clear-outline" size={22} color={colors.muted} />
                <Text variant="caption" tone="muted">
                  {t('agenda.closed_day')}
                </Text>
              </View>
            ) : (
              <View style={styles.timeline}>
                {dayRows.map((r, i) =>
                  r.type === 'free' ? (
                    <Pressable
                      key={`free-${i}`}
                      style={styles.freeRow}
                      onPress={() => router.push(`/seller/offline?start=${r.startMs}`)}
                    >
                      <Text variant="caption" tone="muted" style={styles.timeCol}>
                        {slotTime(r.startMs)}
                      </Text>
                      <View style={styles.freeBody}>
                        <Ionicons name="add-circle-outline" size={16} color={colors.rose} />
                        <Text variant="caption" tone="rose">
                          {t('agenda.free_add')} · {slotTime(r.startMs)}–{slotTime(r.endMs)}
                        </Text>
                      </View>
                    </Pressable>
                  ) : (
                    <Pressable
                      key={r.b.id}
                      style={styles.busyRow}
                      onPress={() => router.push(`/booking/${r.b.id}`)}
                    >
                      <Text variant="caption" tone="ink" style={styles.timeCol}>
                        {slotTime(r.b.startMs)}
                      </Text>
                      <View style={styles.rowBody}>
                        <Text variant="bodyStrong" tone="ink" numberOfLines={1}>
                          {r.b.service}
                        </Text>
                        <Text variant="caption" tone="muted" numberOfLines={1}>
                          {r.b.customerName ? `${r.b.customerName} · ` : ''}
                          {r.b.uzmanName ?? r.b.proName}
                        </Text>
                      </View>
                      <StatusPill status={r.b.status} />
                    </Pressable>
                  ),
                )}
              </View>
            )}
          </>
        ) : groups.length === 0 ? (
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
    toggleWrap: { marginTop: space(1), marginBottom: space(1.5) },
    dayStrip: { gap: space(1), paddingVertical: space(0.5) },
    dayChip: {
      width: 50,
      paddingVertical: space(1),
      borderRadius: radius.md,
      backgroundColor: colors.surfaceMuted,
      alignItems: 'center',
      gap: 2,
    },
    dayChipOn: { backgroundColor: colors.accent },
    dayDot: { width: 5, height: 5, borderRadius: 3 },
    dayDotOn: { backgroundColor: colors.rose },
    dayDotOff: { backgroundColor: 'transparent' },
    closeWd: { textTransform: 'uppercase', letterSpacing: 0.4 },
    closeNum: { fontSize: 16 },
    dayHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: space(2),
      marginBottom: space(1),
    },
    closeToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(0.5),
      paddingHorizontal: space(1.25),
      paddingVertical: space(0.75),
      borderRadius: radius.pill,
      backgroundColor: colors.surfaceMuted,
    },
    closeToggleOn: { backgroundColor: colors.rose },
    closeToggleText: { fontWeight: '700' },
    closedBanner: {
      alignItems: 'center',
      gap: space(1),
      paddingVertical: space(5),
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
    },
    timeline: { gap: space(0.75) },
    freeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1),
      paddingVertical: space(1.25),
      paddingHorizontal: space(1.5),
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.line,
      borderStyle: 'dashed',
    },
    freeBody: { flexDirection: 'row', alignItems: 'center', gap: space(0.75) },
    busyRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1),
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      padding: space(1.5),
    },
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
