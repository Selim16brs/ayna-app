import { useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import type { MessageKey } from '@ayna/i18n';
import { type Appointment, type BookingStatus, SELLER_DATA, formatPrice } from '../../src/data';
import { almatyDayStart, slotTime } from '../../src/datetime';
import { fillParams, useLocale } from '../../src/locale';
import { useStore } from '../../src/store';
import { type ColorTokens, radius, space } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import {
  Button,
  DateField,
  PressableScale,
  Screen,
  Segmented,
  StackHeader,
  TAB_BAR_CLEARANCE,
  Text,
  TextInput,
  formatTrDate,
} from '../../src/ui';

// §10.2 — SALON rezervasyon takvimi: üç sekme (Genel · Randevular · Ekle).
// Randevular kendi içinde onay bekleyen ↔ onaylanan olarak ayrılır.
const isPending = (s: BookingStatus) =>
  s === 'awaiting_provider' || s === 'deposit_pending' || s === 'deposit_submitted';

const STATUS_KEY: Partial<Record<BookingStatus, MessageKey>> = {
  confirmed: 'booking.status.confirmed',
  completed: 'booking.status.completed',
  awaiting_provider: 'booking.status.awaiting',
  deposit_pending: 'booking.status.awaiting',
  deposit_submitted: 'booking.status.awaiting',
};

export default function SalonAgendaScreen() {
  const { t, locale } = useLocale();
  const { colors, shadow } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();

  const bookings = useStore((s) => s.bookings);
  const salonAddOffline = useStore((s) => s.salonAddOffline);
  const salonName = useStore((s) => s.currentUser?.name) ?? 'Salon';
  const staff = SELLER_DATA.month.staff;

  const [tab, setTab] = useState<'all' | 'list' | 'add'>('all');
  const [listSub, setListSub] = useState<'pending' | 'confirmed'>('pending');

  const groupByDay = (list: Appointment[]) => {
    const active = list.filter((b) => b.status !== 'cancelled').sort((a, b) => a.startMs - b.startMs);
    const map = new Map<number, Appointment[]>();
    for (const b of active) {
      const d = almatyDayStart(b.startMs, 0);
      const arr = map.get(d);
      if (arr) arr.push(b);
      else map.set(d, [b]);
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0]);
  };
  // YALNIZ BU SALONA ait randevular (başka salon/uzmanların işleri ASLA görünmez)
  const mine = useMemo(() => bookings.filter((b) => b.proName === salonName), [bookings, salonName]);
  // §10.2 GENEL — salonun TÜM uzmanlarının TÜM randevuları (operasyonel görünürlük; §10 gereği FİYATSIZ)
  const allGrouped = useMemo(() => groupByDay(mine), [mine]);
  // RANDEVULAR — yalnız salonun KENDİ aldığı offline randevular (fiyatlı; salon belirledi),
  // kendi içinde onay bekleyen ↔ onaylanan diye ayrılır
  const salonBookings = useMemo(() => mine.filter((b) => b.bySalon && b.status !== 'cancelled'), [mine]);
  const pendingList = useMemo(() => salonBookings.filter((b) => isPending(b.status)), [salonBookings]);
  const confirmedList = useMemo(() => salonBookings.filter((b) => !isPending(b.status)), [salonBookings]);
  const pendingGroups = useMemo(() => groupByDay(pendingList), [pendingList]);
  const confirmedGroups = useMemo(() => groupByDay(confirmedList), [confirmedList]);

  const statusTone = (s: BookingStatus) =>
    s === 'confirmed'
      ? colors.accent
      : s === 'completed'
        ? colors.muted
        : s === 'no_show' || s === 'cancelled'
          ? colors.danger
          : colors.gold; // awaiting/deposit → onay bekliyor

  const renderList = (groups: [number, Appointment[]][], showPrice: boolean, emptyKey: MessageKey) => (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {groups.length === 0 ? (
        <View style={[styles.card, shadow.soft]}>
          <Text variant="caption" tone="muted">
            {t(emptyKey)}
          </Text>
        </View>
      ) : (
        groups.map(([dayMs, rows]) => (
          <View key={dayMs} style={styles.dayGroup}>
            <Text variant="label" tone="accentFg" style={styles.dayHead}>
              {formatTrDate(new Date(dayMs), false)}
            </Text>
            {rows.map((b) => {
              const end = slotTime(b.startMs + b.durationMin * 60_000);
              const key = STATUS_KEY[b.status];
              return (
                <PressableScale
                  key={b.id}
                  style={[styles.appt, shadow.soft]}
                  onPress={() => router.push(`/booking/${b.id}`)}
                >
                  <View style={styles.apptTime}>
                    <Text variant="bodyStrong" tone="ink">
                      {slotTime(b.startMs)}
                    </Text>
                    <Text variant="caption" tone="muted">
                      {end}
                    </Text>
                  </View>
                  <View style={[styles.apptBar, { backgroundColor: statusTone(b.status) }]} />
                  <View style={styles.apptBody}>
                    <Text variant="bodyStrong" tone="ink" numberOfLines={1}>
                      {b.service}
                    </Text>
                    <View style={styles.apptMeta}>
                      <Ionicons name="person-outline" size={11} color={colors.muted} />
                      <Text variant="caption" tone="muted" numberOfLines={1}>
                        {b.uzmanName ?? '—'}
                        {/* Müşteri adı YALNIZ salonun kendi eklediği randevuda (uzmanın kendi müşterisi gizli) */}
                        {b.bySalon && b.customerName ? ` · ${b.customerName}` : ''}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.apptRight}>
                    {key ? (
                      <View style={[styles.badge, { backgroundColor: statusTone(b.status) }]}>
                        <Text style={styles.badgeText}>{t(key)}</Text>
                      </View>
                    ) : null}
                    {/* Fiyat YALNIZ salonun kendi aldığı randevularda (uzmanın işinin ücreti gizli) */}
                    {showPrice && b.price > 0 ? (
                      <Text variant="caption" tone="inkSoft">
                        {formatPrice(b.price)}
                      </Text>
                    ) : null}
                  </View>
                </PressableScale>
              );
            })}
          </View>
        ))
      )}
    </ScrollView>
  );

  return (
    <Screen edges={[]}>
      <StackHeader title={t('salon.nav.agenda')} />
      <View style={styles.segWrap}>
        <Segmented
          options={[
            { value: 'all', label: t('salon.cal.all') },
            { value: 'list', label: t('salon.cal.appointments') },
            { value: 'add', label: t('salon.cal.add_short') },
          ]}
          value={tab}
          onChange={setTab}
        />
      </View>

      {tab === 'add' ? (
        <AddTab
          staff={staff.map((u) => u.name)}
          salonName={salonName}
          onSubmit={(v) => {
            salonAddOffline({ salonName, ...v });
            Alert.alert(t('salon.add.sent_title'), fillParams(t('salon.add.sent_body'), { uzman: v.uzmanName }));
            setTab('list');
          }}
          locale={locale}
        />
      ) : tab === 'all' ? (
        renderList(allGrouped, false, 'salon.cal.all_empty')
      ) : (
        <>
          {/* Randevular içi ayrım: onay bekleyen ↔ onaylanan */}
          <View style={styles.subSegWrap}>
            <Segmented
              options={[
                {
                  value: 'pending',
                  label: `${t('salon.cal.sub_pending')}${pendingList.length ? ` (${pendingList.length})` : ''}`,
                },
                {
                  value: 'confirmed',
                  label: `${t('salon.cal.sub_confirmed')}${confirmedList.length ? ` (${confirmedList.length})` : ''}`,
                },
              ]}
              value={listSub}
              onChange={setListSub}
            />
          </View>
          {listSub === 'pending'
            ? renderList(pendingGroups, true, 'salon.cal.pending_empty')
            : renderList(confirmedGroups, true, 'salon.cal.confirmed_empty')}
        </>
      )}
    </Screen>
  );
}

function AddTab({
  staff,
  salonName: _salonName,
  onSubmit,
  locale: _locale,
}: {
  staff: string[];
  salonName: string;
  onSubmit: (v: {
    uzmanName: string;
    customerName: string;
    customerPhone: string;
    service: string;
    startMs: number;
    durationMin: number;
    price: number;
  }) => void;
  locale: string;
}) {
  const { t } = useLocale();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [uzman, setUzman] = useState(staff[0] ?? '');
  const [customer, setCustomer] = useState('');
  const [phone, setPhone] = useState('');
  const [service, setService] = useState('');
  const [when, setWhen] = useState<Date>(() => new Date(Date.now() + 3_600_000));
  const [dur, setDur] = useState('60');
  const [price, setPrice] = useState('');

  const canAdd = uzman && customer.trim().length > 1 && service.trim().length > 1;

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* §4.6 — salon eklemesi uzman onayına gider */}
      <View style={styles.noteBox}>
        <Ionicons name="information-circle-outline" size={16} color={colors.accentFg} />
        <Text variant="caption" tone="inkSoft" style={styles.flex}>
          {t('salon.add.note')}
        </Text>
      </View>

      <Text variant="label" tone="accentFg" style={styles.label}>
        {t('salon.add.uzman')}
      </Text>
      <View style={styles.uzmanRow}>
        {staff.map((name) => {
          const on = uzman === name;
          return (
            <Pressable
              key={name}
              onPress={() => setUzman(name)}
              style={[styles.uzmanChip, on && styles.uzmanChipOn]}
            >
              <Ionicons
                name={on ? 'person' : 'person-outline'}
                size={13}
                color={on ? colors.onAccent : colors.muted}
              />
              <Text variant="caption" tone={on ? 'onAccent' : 'inkSoft'}>
                {name}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Field label={t('offline.customer')}>
        <TextInput
          style={styles.input}
          value={customer}
          onChangeText={setCustomer}
          placeholder="Ayşe K."
          placeholderTextColor={colors.muted}
        />
      </Field>
      <Field label={t('salon.add.phone')}>
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={(v) => setPhone(v.replace(/[^0-9 +]/g, ''))}
          placeholder="+7 700 000 00 00"
          keyboardType="phone-pad"
          placeholderTextColor={colors.muted}
        />
      </Field>
      <Field label={t('offline.service')}>
        <TextInput
          style={styles.input}
          value={service}
          onChangeText={setService}
          placeholder="Saç kesimi & fön"
          placeholderTextColor={colors.muted}
        />
      </Field>
      <DateField label={t('offline.datetime')} value={when} onChange={setWhen} mode="datetime" />
      <View style={styles.row}>
        <Field label={t('offline.dur')} flex>
          <TextInput
            style={styles.input}
            value={dur}
            onChangeText={(v) => setDur(v.replace(/[^0-9]/g, ''))}
            keyboardType="number-pad"
            placeholderTextColor={colors.muted}
          />
        </Field>
        {/* Salon KENDİ aldığı randevuda ücreti belirler (uzman fee'yi bilir) */}
        <Field label={t('offline.price')} flex>
          <TextInput
            style={styles.input}
            value={price}
            onChangeText={(v) => setPrice(v.replace(/[^0-9]/g, ''))}
            keyboardType="number-pad"
            placeholder="9000"
            placeholderTextColor={colors.muted}
          />
        </Field>
      </View>

      <View style={styles.submit}>
        <Button
          label={t('salon.add.submit')}
          variant="primary"
          disabled={!canAdd}
          onPress={() =>
            onSubmit({
              uzmanName: uzman,
              customerName: customer.trim(),
              customerPhone: phone.trim(),
              service: service.trim(),
              startMs: when.getTime(),
              durationMin: Number(dur) || 60,
              price: Number(price) || 0,
            })
          }
        />
      </View>
    </ScrollView>
  );
}

function Field({ label, children, flex }: { label: string; children: React.ReactNode; flex?: boolean }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={[styles.field, flex && styles.flex]}>
      <Text variant="label" tone="accentFg" style={styles.label}>
        {label}
      </Text>
      {children}
    </View>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    segWrap: { paddingHorizontal: space(3), paddingTop: space(1.5), paddingBottom: space(1) },
    subSegWrap: { paddingHorizontal: space(3), paddingBottom: space(0.5) },
    content: { paddingHorizontal: space(3), paddingBottom: TAB_BAR_CLEARANCE + space(2), gap: space(1.25) },
    flex: { flex: 1 },
    card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: space(2) },
    dayGroup: { gap: space(1) },
    dayHead: { marginTop: space(1.5) },
    appt: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1),
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: space(1.5),
    },
    apptTime: { width: 52, gap: 1 },
    apptBar: { width: 4, alignSelf: 'stretch', borderRadius: 2 },
    apptBody: { flex: 1, gap: 3 },
    apptMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    apptRight: { alignItems: 'flex-end', gap: 4 },
    badge: { paddingHorizontal: space(1), paddingVertical: 2, borderRadius: radius.pill },
    badgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },
    // Randevu ekle
    noteBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1),
      backgroundColor: colors.accentSoft,
      borderRadius: radius.md,
      padding: space(1.5),
      marginTop: space(0.5),
    },
    label: { marginTop: space(1.25), marginBottom: space(0.5) },
    uzmanRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space(1) },
    uzmanChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: space(1.5),
      paddingVertical: space(1),
      borderRadius: radius.pill,
      borderWidth: 1.25,
      borderColor: colors.line,
      backgroundColor: colors.surface,
    },
    uzmanChipOn: { backgroundColor: colors.accent, borderColor: colors.accent },
    field: { gap: space(0.5) },
    row: { flexDirection: 'row', gap: space(1.5) },
    input: {
      backgroundColor: colors.surfaceMuted,
      borderRadius: radius.md,
      paddingHorizontal: space(1.75),
      paddingVertical: space(1.5),
      color: colors.ink,
      fontSize: 15,
    },
    submit: { marginTop: space(2.5) },
  });
