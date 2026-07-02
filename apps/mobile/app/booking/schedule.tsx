import { useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { computeDaySlots } from '@ayna/domain';
import type { BookingSource } from '../../src/data';
import { almatyDayStart, formatSlotTr } from '../../src/datetime';
import { useProfessionalDetail } from '../../src/catalog';
import { useLocale } from '../../src/locale';
import { useStore } from '../../src/store';
import { type ColorTokens, radius, space } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import { Button, Screen, SlotPicker, StackHeader, TAB_BAR_CLEARANCE, Text, type PickerDay } from '../../src/ui';

// Mock çalışma penceresi: 10:00–19:00 Almatı (gerçek uzman saatleri Faz 9 persistanslığıyla).
const OPEN_FROM_H = 10;
const OPEN_TO_H = 19;
const STEP_MIN = 30;
const LEAD_H = 2; // en erken 2 saat sonrası
const HORIZON_DAYS = 14;

export default function ScheduleScreen() {
  const router = useRouter();
  const { t } = useLocale();
  const { shadow } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const params = useLocalSearchParams<{
    proId?: string;
    source?: string;
    uzmanId?: string;
    service?: string;
  }>();
  const addBooking = useStore((s) => s.addBooking);
  const bookings = useStore((s) => s.bookings);
  const closedDays = useStore((s) => s.closedDays);
  const pro = useProfessionalDetail(params.proId ?? '1');
  const isSalon = pro.kind === 'salon' && pro.staff.length > 0;
  const [uzmanId, setUzmanId] = useState<string>(params.uzmanId ?? pro.staff[0]?.id ?? '');
  const [selectedStartMs, setSelectedStartMs] = useState<number | null>(null);

  const uzman = pro.staff.find((u) => u.id === uzmanId);

  // Seçili hizmet → süre (slot motorunun temel girdisi §4.2)
  const chosenService = pro.services.find((sv) => sv.name === params.service);
  const durationMin = chosenService?.durationMin ?? pro.services[0]?.durationMin ?? 60;

  // Bu uzmanın mevcut (iptal olmayan) randevuları = meşgul aralıklar
  const busy = useMemo(
    () =>
      bookings
        .filter(
          (b) =>
            b.proId === pro.id &&
            (uzman?.name ? b.uzmanName === uzman.name : true) &&
            b.status !== 'cancelled',
        )
        .map((b) => ({ startMs: b.startMs, endMs: b.startMs + b.durationMin * 60_000 })),
    [bookings, pro.id, uzman?.name],
  );

  // Slot motorunu her gün için çalıştır → müsait/dolu slotlar (uzmanId/hizmet değişince yeniden)
  const days: PickerDay[] = useMemo(() => {
    const now = Date.now();
    const out: PickerDay[] = [];
    for (let d = 0; d < HORIZON_DAYS; d++) {
      const dayStart = almatyDayStart(now, d);
      // §4.6 — kapalı (izin/tatil) gün: hiç pencere yok → slot gösterilmez
      const openWindows = closedDays.includes(dayStart)
        ? []
        : [{ startMs: dayStart + OPEN_FROM_H * 3_600_000, endMs: dayStart + OPEN_TO_H * 3_600_000 }];
      const slots = computeDaySlots({
        openWindows,
        busy,
        serviceDurationMs: durationMin * 60_000,
        stepMs: STEP_MIN * 60_000,
        nowMs: now,
        minLeadMs: LEAD_H * 3_600_000,
      });
      out.push({ dateMs: dayStart + OPEN_FROM_H * 3_600_000, slots });
    }
    return out;
  }, [busy, durationMin, closedDays]);

  function confirm() {
    if (selectedStartMs == null) return;
    const source = (params.source as BookingSource) ?? 'direct';
    const serviceName =
      chosenService?.name ?? params.service ?? pro.services[0]?.name ?? pro.specialty;
    const price = chosenService?.price ?? pro.services[0]?.price ?? Number(pro.priceFrom);

    const id = addBooking({
      source,
      service: serviceName,
      proId: pro.id,
      proName: pro.name,
      proImage: pro.image,
      ...(uzman?.name ? { uzmanName: uzman.name } : {}),
      startMs: selectedStartMs,
      durationMin,
      price,
    });

    router.replace({
      pathname: '/booking/confirmed',
      params: {
        id,
        proId: pro.id,
        source,
        slot: formatSlotTr(selectedStartMs),
        uzmanName: uzman?.name ?? '',
      },
    });
  }

  return (
    <Screen edges={['bottom']}>
      <StackHeader title={t('booking.schedule.title')} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.proCard, shadow.soft]}>
          <Image source={{ uri: pro.image }} style={styles.proImage} />
          <View style={styles.proBody}>
            <Text variant="bodyStrong" tone="ink" numberOfLines={1}>
              {pro.name}
            </Text>
            <Text variant="caption" tone="muted" numberOfLines={1}>
              {isSalon && uzman ? `${pro.specialty} · ${uzman.name}` : pro.specialty}
            </Text>
          </View>
        </View>

        {/* Uzman seçimi (salonlarda) */}
        {isSalon ? (
          <>
            <Text variant="h2" tone="ink" style={styles.label}>
              {t('booking.schedule.uzman')}
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.staffRow}
            >
              {pro.staff.map((u) => {
                const on = u.id === uzmanId;
                return (
                  <Pressable
                    key={u.id}
                    onPress={() => setUzmanId(u.id)}
                    style={[styles.staffCard, shadow.soft, on && styles.staffActive]}
                  >
                    <View style={[styles.staffAvatarWrap, on && styles.staffAvatarOn]}>
                      <Image source={{ uri: u.image }} style={styles.staffAvatar} />
                    </View>
                    <Text variant="caption" tone="ink" numberOfLines={1}>
                      {u.name}
                    </Text>
                    <Text variant="caption" tone="muted" numberOfLines={1}>
                      {u.role}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </>
        ) : null}

        <Text variant="h2" tone="ink" style={styles.label}>
          {t('booking.schedule.time')}
        </Text>
        <SlotPicker days={days} selected={selectedStartMs} onSelect={setSelectedStartMs} />
      </ScrollView>

      <View style={styles.footer}>
        <Button
          label={t('booking.schedule.confirm')}
          variant={selectedStartMs != null ? 'primary' : 'secondary'}
          disabled={selectedStartMs == null}
          onPress={confirm}
        />
      </View>
    </Screen>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    content: { paddingHorizontal: space(3), paddingBottom: space(4) },
    proCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1.5),
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: space(1.75),
    },
    proImage: {
      width: 60,
      height: 60,
      borderRadius: radius.md,
      backgroundColor: colors.bgSunken,
    },
    proBody: { flex: 1, gap: 3 },
    label: { marginTop: space(3), marginBottom: space(1.5) },
    staffRow: { gap: space(1.5), paddingRight: space(3), paddingVertical: space(0.5) },
    staffCard: {
      width: 112,
      alignItems: 'center',
      gap: 3,
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: space(1.75),
    },
    staffActive: { backgroundColor: colors.accentSoft },
    staffAvatarWrap: {
      width: 60,
      height: 60,
      borderRadius: 30,
      padding: 3,
      marginBottom: space(0.75),
      borderWidth: 2,
      borderColor: 'transparent',
    },
    staffAvatarOn: { borderColor: colors.accent },
    staffAvatar: {
      width: '100%',
      height: '100%',
      borderRadius: 27,
      backgroundColor: colors.bgSunken,
    },
    row: { flexDirection: 'row', gap: space(1), flexWrap: 'wrap' },
    dayChip: {
      paddingHorizontal: space(2.25),
      paddingVertical: space(1.5),
      borderRadius: radius.pill,
      backgroundColor: colors.surfaceMuted,
    },
    times: { flexDirection: 'row', flexWrap: 'wrap', gap: space(1.25) },
    timeChip: {
      width: '31%',
      alignItems: 'center',
      paddingVertical: space(1.75),
      borderRadius: radius.md,
      backgroundColor: colors.surfaceMuted,
    },
    active: { backgroundColor: colors.accent },
    footer: {
      paddingHorizontal: space(3),
      paddingTop: space(1.5),
      paddingBottom: TAB_BAR_CLEARANCE,
    },
  });
