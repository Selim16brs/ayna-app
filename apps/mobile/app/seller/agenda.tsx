import { useCallback, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import type { MessageKey } from '@ayna/i18n';
import { api } from '../../src/api';
import { type Appointment, type BookingStatus, formatPrice } from '../../src/data';
import { almatyDayStart, almatyParts, daysUntil, formatSlot, slotTime } from '../../src/datetime';
import { useLocale } from '../../src/locale';
import { useStore } from '../../src/store';
import { type ColorTokens, radius, space } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import { useSalonStaff } from '../../src/staff';
import { PressableScale, Screen, Segmented, StackHeader, Text } from '../../src/ui';

type DayRow = { type: 'free'; startMs: number; endMs: number } | { type: 'busy'; b: Appointment };
const OPEN_H = 10;
const CLOSE_H = 19;
// Takvimde SLOT'U TUTAN durumlar: onaylı + tamamlanan + uzman onayı sonrası depozito bekleyenler.
const CALENDAR_STATUSES: BookingStatus[] = [
  'confirmed',
  'completed',
  'deposit_pending',
  'deposit_submitted',
];

// §4.6 uzman gün-ızgarası: açık pencere içinde boş aralıklar + randevu blokları
function buildDayRows(dayStart: number, dayBookings: Appointment[]): DayRow[] {
  const openStart = dayStart + OPEN_H * 3_600_000;
  const openEnd = dayStart + CLOSE_H * 3_600_000;
  // §4.1/§4.6 — takvimde SLOT'U TUTAN randevular: onaylı + tamamlanan + uzman ONAYLADIKTAN sonra
  // depozito bekleyenler (deposit_pending/submitted). Uzman kabul edince slot HEMEN takvimde görünür
  // (gold=bekliyor). Yalnız onay-ÖNCESİ (awaiting_provider) ayrı "Bekleyen Talepler" şeridindedir.
  const bs = dayBookings
    .filter((b) => CALENDAR_STATUSES.includes(b.status))
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
  reassigned_pending: 'booking.status.reassigned_pending',
  no_show: 'booking.status.no_show',
  waitlist: 'booking.status.waitlist',
};

export default function AgendaScreen() {
  const { t } = useLocale();
  const router = useRouter();
  const { colors, shadow } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const storeBookings = useStore((s) => s.bookings);
  // MD_000 §4.2 — takvim açıkken yeni talep kendiliğinden düşer: odakta hemen +
  // 30 sn'de bir buluttan tazele (push tetiklemesi _layout'ta ayrıca var)
  const hydrateBookings = useStore((s) => s.hydrateBookings);
  useFocusEffect(
    useCallback(() => {
      void hydrateBookings();
      const timer = setInterval(() => void hydrateBookings(), 30_000);
      return () => clearInterval(timer);
    }, [hydrateBookings]),
  );
  const approveBooking = useStore((s) => s.approveBooking);
  const rejectBooking = useStore((s) => s.rejectBooking);
  const closedDays = useStore((s) => s.closedDays);
  const toggleClosedDay = useStore((s) => s.toggleClosedDay);
  const isSalon = useStore((s) => s.currentUser?.role === 'salon');
  const [items, setItems] = useState<Appointment[]>([]);
  // §4.6/§10.2 — salon varsayılanı uzman-sütunlu görünüm; uzman varsayılanı dikey gün ajandası
  const [view, setView] = useState<'day' | 'list' | 'salon'>(isSalon ? 'salon' : 'day');
  const [dayIdx, setDayIdx] = useState(0);

  // §4.6 salon tarafı — uzman sütunları (mock; gerçekte salonun kadrosu)
  const { staff } = useSalonStaff(); // Faz C — GERÇEK kadro (mock değil)

  // §4.6 — önümüzdeki 14 gün (gün seçici + kapalı işaretleme)
  // §10.2 — salon takviminde uzman filtresi (null = tümü)
  const [staffFilter, setStaffFilter] = useState<string | null>(null);
  const shownStaff = staffFilter ? staff.filter((u) => u.name === staffFilter) : staff;
  // §9.4 — bekleyen talepler (uzman onayı bekleyen randevular): takvim üstünde şerit
  const pending = storeBookings.filter((b) => b.status === 'awaiting_provider');
  const dayStrip = Array.from({ length: 14 }, (_, d) => almatyDayStart(Date.now(), d));
  const selectedDay = dayStrip[dayIdx] ?? dayStrip[0]!;
  const dayClosed = closedDays.includes(selectedDay);
  // §4.2 — takvim kaynağı: API polling (items) + YEREL store birleşir; aynı id'de YEREL kazanır
  // (uzman onayı anında yansısın; polling'in stale hali onayı ezmesin).
  const calBookings = useMemo(() => {
    const map = new Map<string, Appointment>();
    for (const b of items) map.set(b.id, b);
    for (const b of storeBookings) map.set(b.id, b);
    return [...map.values()];
  }, [items, storeBookings]);
  const dayBookings = calBookings.filter((b) => almatyDayStart(b.startMs, 0) === selectedDay);
  const dayRows = buildDayRows(selectedDay, dayBookings);
  // Gün özeti: kesinleşmiş randevu sayısı + günün cirosu
  const dayBusy = dayRows.filter((r): r is { type: 'busy'; b: Appointment } => r.type === 'busy');
  const dayTotal = dayBusy.reduce((s, r) => s + r.b.price, 0);
  // §4.6 renk kodu (sol şerit): tamamlanan → nötr, onaylı → lime, diğer → altın
  const barColor = (b: Appointment) =>
    b.status === 'completed'
      ? colors.muted
      : b.status === 'confirmed'
        ? colors.accent
        : colors.gold;
  const endTime = (b: Appointment) => slotTime(b.startMs + b.durationMin * 60_000);

  // §4.2 — ekran odaklıyken takvimi otomatik tazele (near-realtime; her 20 sn sunucudan çek).
  // Gerçek push/websocket ayrı faz; polling yeni randevuları yenileme gerekmeden getirir.
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      const pull = () =>
        api
          .bookings()
          .then((b) => alive && setItems(b))
          .catch(() => alive && setItems(storeBookings)); // çevrimdışı: yerel veriler
      void pull();
      const timer = setInterval(pull, 20_000);
      return () => {
        alive = false;
        clearInterval(timer);
      };
    }, [storeBookings]),
  );

  const now = Date.now();
  const groups = GROUP_ORDER.map((key) => ({
    key,
    rows: calBookings
      .filter((b) => bucket(daysUntil(b.startMs, now)) === key)
      .sort((a, b) => a.startMs - b.startMs),
  })).filter((g) => g.rows.length > 0);

  return (
    <Screen edges={[]}>
      <StackHeader title={t(isSalon ? 'agenda.title' : 'agenda.title_own')} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.toggleWrap}>
          <Segmented
            options={[
              { value: 'day', label: t('agenda.view.day') },
              ...(isSalon ? [{ value: 'salon' as const, label: t('agenda.view.salon') }] : []),
              { value: 'list', label: t('agenda.view.list') },
            ]}
            value={view}
            onChange={setView}
          />
        </View>

        {/* §9.4 — Bekleyen Talepler şeridi: Kabul / Alternatif / Reddet */}
        {pending.length > 0 ? (
          <View style={styles.pendingWrap}>
            <View style={styles.pendingHead}>
              <Ionicons name="hourglass-outline" size={15} color={colors.accentFg} />
              <Text variant="label" tone="accentFg">
                {t('agenda.pending.title')}
              </Text>
              <View style={styles.pendingBadge}>
                <Text style={styles.pendingBadgeText}>{pending.length}</Text>
              </View>
            </View>
            {pending.map((b) => (
              <View key={b.id} style={styles.pendingCard}>
                <Pressable
                  style={styles.pendingInfo}
                  onPress={() => router.push(`/booking/${b.id}`)}
                >
                  <Text variant="bodyStrong" tone="ink" numberOfLines={1}>
                    {b.service}
                  </Text>
                  <Text variant="caption" tone="muted" numberOfLines={1}>
                    {formatSlot(b.startMs, t)} · {formatPrice(b.price)}
                  </Text>
                </Pressable>
                <View style={styles.pendingActions}>
                  <Pressable
                    style={[styles.pendingBtn, styles.pendingAccept]}
                    onPress={() => approveBooking(b.id)}
                  >
                    <Ionicons name="checkmark" size={18} color={colors.onAccent} />
                  </Pressable>
                  <Pressable
                    style={styles.pendingBtn}
                    onPress={() => router.push(`/booking/${b.id}`)}
                  >
                    <Ionicons name="time-outline" size={17} color={colors.accentFg} />
                  </Pressable>
                  <Pressable style={styles.pendingBtn} onPress={() => rejectBooking(b.id)}>
                    <Ionicons name="close" size={18} color={colors.danger} />
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        ) : null}

        {view === 'day' ? (
          <>
            {/* Gün seçici şeridi (kapalı günler kilitli) */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.dayStrip}
            >
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
                    <Text
                      variant="bodyStrong"
                      tone={on ? 'onAccent' : 'ink'}
                      style={styles.closeNum}
                    >
                      {p.day}
                    </Text>
                    {closed ? (
                      <Ionicons
                        name="lock-closed"
                        size={11}
                        color={on ? colors.onAccent : colors.accentFg}
                      />
                    ) : (
                      <View style={[styles.dayDot, has ? styles.dayDotOn : styles.dayDotOff]} />
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Seçili gün özeti + Açık/Kapalı toggle. §4.6: salon uzmanın izin gününe DOKUNAMAZ. */}
            <View style={styles.dayHeader}>
              <View style={styles.flexShrink}>
                <Text variant="bodyStrong" tone="ink">
                  {formatSlot(selectedDay, t).split(' · ')[0]} · {almatyParts(selectedDay).day}
                </Text>
                <Text variant="caption" tone="muted">
                  {dayClosed
                    ? t('hours.closed')
                    : `${dayBusy.length} ${t('agenda.count')}${dayTotal > 0 ? ` · ${formatPrice(dayTotal)}` : ''}`}
                </Text>
              </View>
              {isSalon ? (
                dayClosed ? (
                  <View style={styles.closedTag}>
                    <Ionicons name="lock-closed" size={13} color={colors.muted} />
                    <Text variant="caption" tone="muted">
                      {t('hours.closed')}
                    </Text>
                  </View>
                ) : null
              ) : (
                <Pressable
                  onPress={() => toggleClosedDay(selectedDay)}
                  style={[styles.closeToggle, dayClosed && styles.closeToggleOn]}
                >
                  <Ionicons
                    name={dayClosed ? 'lock-closed' : 'lock-open-outline'}
                    size={14}
                    color={dayClosed ? colors.onColor : colors.accentFg}
                  />
                  <Text
                    variant="caption"
                    tone={dayClosed ? 'onColor' : 'accentFg'}
                    style={styles.closeToggleText}
                  >
                    {dayClosed ? t('agenda.mark_open') : t('agenda.mark_closed')}
                  </Text>
                </Pressable>
              )}
            </View>

            {dayClosed ? (
              <View style={styles.closedBanner}>
                <Ionicons name="calendar-clear-outline" size={26} color={colors.muted} />
                <Text variant="caption" tone="muted">
                  {t('agenda.closed_day')}
                </Text>
              </View>
            ) : dayBusy.length === 0 ? (
              <Pressable
                style={styles.dayEmpty}
                onPress={() =>
                  router.push(`/seller/offline?start=${selectedDay + OPEN_H * 3_600_000}`)
                }
              >
                <View style={styles.dayEmptyIcon}>
                  <Ionicons name="calendar-outline" size={26} color={colors.accentFg} />
                </View>
                <Text variant="bodyStrong" tone="ink">
                  {t('agenda.day_empty')}
                </Text>
                <View style={styles.dayEmptyCta}>
                  <Ionicons name="add" size={15} color={colors.accentFg} />
                  <Text variant="caption" tone="accentFg" style={styles.closeToggleText}>
                    {t('agenda.add_offline')}
                  </Text>
                </View>
              </Pressable>
            ) : (
              <View style={styles.timeline}>
                {dayRows.map((r, i) =>
                  r.type === 'free' ? (
                    <Pressable
                      key={`free-${i}`}
                      style={styles.freeSlot}
                      onPress={() => router.push(`/seller/offline?start=${r.startMs}`)}
                    >
                      <Text variant="caption" tone="muted" style={styles.freeTime}>
                        {slotTime(r.startMs)}
                      </Text>
                      <View style={styles.freeDivider} />
                      <Ionicons name="add" size={13} color={colors.accentFg} />
                      <Text variant="caption" tone="accentFg">
                        {t('agenda.free_add')}
                      </Text>
                    </Pressable>
                  ) : (
                    <Pressable
                      key={r.b.id}
                      style={[styles.apptCard, shadow.soft]}
                      onPress={() => router.push(`/booking/${r.b.id}`)}
                    >
                      <View style={[styles.apptBar, { backgroundColor: barColor(r.b) }]} />
                      <View style={styles.apptTime}>
                        <Text variant="bodyStrong" tone="ink" style={styles.apptStart}>
                          {slotTime(r.b.startMs)}
                        </Text>
                        <Text variant="caption" tone="muted">
                          {endTime(r.b)}
                        </Text>
                      </View>
                      <View style={styles.apptBody}>
                        <View style={styles.serviceRow}>
                          <Text
                            variant="bodyStrong"
                            tone="ink"
                            numberOfLines={1}
                            style={styles.flexShrink}
                          >
                            {r.b.service}
                          </Text>
                          {/* §4.6 — kaynak ayrımı: offline (elle) vs AYNA (online) */}
                          <View
                            style={[
                              styles.srcTag,
                              r.b.customerName ? styles.srcOffline : styles.srcAyna,
                            ]}
                          >
                            <Ionicons
                              name={r.b.customerName ? 'walk-outline' : 'phone-portrait-outline'}
                              size={9}
                              color={r.b.customerName ? colors.inkSoft : colors.accentFg}
                            />
                            <Text
                              variant="caption"
                              style={[
                                styles.srcText,
                                { color: r.b.customerName ? colors.inkSoft : colors.accentFg },
                              ]}
                            >
                              {t(r.b.customerName ? 'agenda.src.offline' : 'agenda.src.ayna')}
                            </Text>
                          </View>
                          {r.b.bookingKind === 'group' ? (
                            <View style={styles.kindTag}>
                              <Text variant="caption" style={styles.kindText}>
                                {t('agenda.group')}
                                {r.b.groupSize ? ` ${r.b.groupSize}` : ''}
                              </Text>
                            </View>
                          ) : null}
                        </View>
                        <View style={styles.apptMeta}>
                          <Ionicons name="person-outline" size={11} color={colors.muted} />
                          <Text
                            variant="caption"
                            tone="muted"
                            numberOfLines={1}
                            style={styles.flexShrink}
                          >
                            {r.b.customerName ?? r.b.uzmanName ?? r.b.proName}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.apptRight}>
                        <StatusPill status={r.b.status} />
                        <Text variant="caption" tone="inkSoft" style={styles.apptPrice}>
                          {formatPrice(r.b.price)}
                        </Text>
                      </View>
                    </Pressable>
                  ),
                )}
              </View>
            )}
          </>
        ) : view === 'salon' ? (
          <>
            {/* §4.6 salon — gün seçici (yalnızca seçim; salon gün kapatamaz) */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.dayStrip}
            >
              {dayStrip.map((dayMs, i) => {
                const p = almatyParts(dayMs);
                const on = i === dayIdx;
                return (
                  <Pressable
                    key={dayMs}
                    onPress={() => setDayIdx(i)}
                    style={[styles.dayChip, on && styles.dayChipOn]}
                  >
                    <Text variant="caption" tone={on ? 'onAccent' : 'muted'} style={styles.closeWd}>
                      {t(`wd.${p.wd}` as 'wd.0')}
                    </Text>
                    <Text
                      variant="bodyStrong"
                      tone={on ? 'onAccent' : 'ink'}
                      style={styles.closeNum}
                    >
                      {p.day}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* §10.2 — uzman filtresi */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterRow}
            >
              <Pressable
                onPress={() => setStaffFilter(null)}
                style={[styles.filterChip, staffFilter === null && styles.filterChipOn]}
              >
                <Text variant="caption" tone={staffFilter === null ? 'onAccent' : 'inkSoft'}>
                  {t('agenda.filter.all')}
                </Text>
              </Pressable>
              {staff.map((u) => {
                const on = staffFilter === u.name;
                return (
                  <Pressable
                    key={u.name}
                    onPress={() => setStaffFilter(on ? null : u.name)}
                    style={[styles.filterChip, on && styles.filterChipOn]}
                  >
                    <Text variant="caption" tone={on ? 'onAccent' : 'inkSoft'} numberOfLines={1}>
                      {u.name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Uzman sütunları (yan yana, yatay kaydırma) */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.columns}
            >
              {shownStaff.map((u) => {
                const uRows = buildDayRows(
                  selectedDay,
                  dayBookings.filter((b) => (b.uzmanName ?? '') === u.name),
                );
                return (
                  <View key={u.name} style={styles.column}>
                    <View style={styles.colHead}>
                      <Image source={{ uri: u.image }} style={styles.colAvatar} />
                      <Text
                        variant="caption"
                        tone="ink"
                        numberOfLines={1}
                        style={styles.flexShrink}
                      >
                        {u.name}
                      </Text>
                    </View>
                    <View style={styles.colBody}>
                      {uRows.map((r, i) =>
                        r.type === 'free' ? (
                          <Pressable
                            key={`f-${i}`}
                            style={styles.colFree}
                            onPress={() =>
                              router.push(
                                `/seller/offline?start=${r.startMs}&uzman=${encodeURIComponent(u.name)}`,
                              )
                            }
                          >
                            <Ionicons name="add" size={13} color={colors.accentFg} />
                            <Text variant="caption" tone="accentFg">
                              {slotTime(r.startMs)}
                            </Text>
                          </Pressable>
                        ) : (
                          <Pressable
                            key={r.b.id}
                            style={styles.colBusy}
                            onPress={() => router.push(`/booking/${r.b.id}`)}
                          >
                            <Text variant="caption" tone="ink" numberOfLines={1}>
                              {slotTime(r.b.startMs)}
                            </Text>
                            <Text variant="caption" tone="muted" numberOfLines={1}>
                              {r.b.service}
                            </Text>
                          </Pressable>
                        ),
                      )}
                    </View>
                  </View>
                );
              })}
            </ScrollView>
            <View style={styles.salonNote}>
              <Ionicons name="information-circle-outline" size={14} color={colors.muted} />
              <Text variant="caption" tone="muted" style={styles.flexShrink}>
                {t('agenda.salon_note')}
              </Text>
            </View>
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
              <Text variant="label" tone="accentFg" style={styles.groupTitle}>
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
                        <Text
                          variant="bodyStrong"
                          tone="ink"
                          numberOfLines={1}
                          style={styles.flexShrink}
                        >
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
    // §4.6 kaynak etiketi (offline/AYNA)
    srcTag: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      paddingHorizontal: space(0.75),
      paddingVertical: 2,
      borderRadius: radius.pill,
    },
    srcOffline: { backgroundColor: colors.surfaceMuted },
    srcAyna: { backgroundColor: colors.accentSoft },
    srcText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.2 },
    // §9.4 bekleyen talepler şeridi
    pendingWrap: {
      backgroundColor: colors.accentSoft,
      borderRadius: radius.lg,
      padding: space(1.5),
      gap: space(1),
      marginBottom: space(1.5),
    },
    pendingHead: { flexDirection: 'row', alignItems: 'center', gap: space(0.75) },
    pendingBadge: {
      minWidth: 20,
      height: 20,
      borderRadius: 10,
      paddingHorizontal: 6,
      backgroundColor: colors.accentFg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pendingBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
    pendingCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1),
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      padding: space(1.25),
    },
    pendingInfo: { flex: 1, gap: 2 },
    pendingActions: { flexDirection: 'row', gap: space(0.75) },
    pendingBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      borderWidth: 1,
      borderColor: colors.line,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
    },
    pendingAccept: { backgroundColor: colors.accent, borderColor: colors.accent },
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
    dayDotOn: { backgroundColor: colors.accentFg },
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
    closeToggleOn: { backgroundColor: colors.accentFg },
    closeToggleText: { fontWeight: '700' },
    closedTag: { flexDirection: 'row', alignItems: 'center', gap: space(0.5) },
    closedBanner: {
      alignItems: 'center',
      gap: space(1),
      paddingVertical: space(5),
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
    },
    filterRow: { gap: space(0.75), paddingVertical: space(1) },
    filterChip: {
      paddingHorizontal: space(1.5),
      paddingVertical: space(0.75),
      borderRadius: radius.pill,
      borderWidth: 1.25,
      borderColor: colors.line,
      backgroundColor: colors.surface,
      maxWidth: 130,
    },
    filterChipOn: { backgroundColor: colors.accent, borderColor: colors.accent },
    columns: { gap: space(1.25), paddingVertical: space(0.5) },
    column: { width: 132 },
    colHead: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(0.75),
      backgroundColor: colors.surfaceMuted,
      borderRadius: radius.md,
      paddingHorizontal: space(1),
      paddingVertical: space(0.75),
      marginBottom: space(0.75),
    },
    colAvatar: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.bgSunken },
    colBody: { gap: space(0.5) },
    colFree: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 3,
      paddingVertical: space(1),
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: colors.line,
      borderStyle: 'dashed',
    },
    colBusy: {
      backgroundColor: colors.accentSoft,
      borderRadius: radius.sm,
      paddingVertical: space(0.75),
      paddingHorizontal: space(1),
      gap: 1,
    },
    salonNote: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(0.75),
      marginTop: space(1.5),
    },
    timeline: { gap: space(1) },
    // Boş slot — ince, sade ekleme satırı
    freeSlot: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(0.75),
      paddingVertical: space(0.75),
      paddingHorizontal: space(0.5),
    },
    freeTime: { width: 44 },
    freeDivider: {
      flex: 1,
      height: 1,
      borderBottomWidth: 1,
      borderColor: colors.line,
      borderStyle: 'dashed',
    },
    // Randevu kartı — sol renk şeridi + saat aralığı + içerik + durum/fiyat
    apptCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      paddingRight: space(1.75),
      overflow: 'hidden',
      gap: space(1.25),
    },
    apptBar: { width: 5, alignSelf: 'stretch' },
    apptTime: { width: 46, alignItems: 'center', paddingVertical: space(1.5) },
    apptStart: { fontSize: 15 },
    apptBody: { flex: 1, gap: 3, paddingVertical: space(1.5) },
    apptMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    apptRight: { alignItems: 'flex-end', gap: 5, paddingVertical: space(1.5) },
    apptPrice: { fontWeight: '700' },
    // Boş gün — dostane durum
    dayEmpty: {
      alignItems: 'center',
      gap: space(1),
      paddingVertical: space(5),
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
    },
    dayEmptyIcon: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: colors.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: space(0.5),
    },
    dayEmptyCta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: colors.accentSoft,
      paddingHorizontal: space(1.5),
      paddingVertical: space(0.75),
      borderRadius: radius.pill,
      marginTop: space(0.5),
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
      backgroundColor: colors.accentFg,
      paddingHorizontal: space(2.5),
      paddingVertical: space(1.5),
      borderRadius: radius.pill,
    },
  });
