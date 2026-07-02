import { useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import type { DaySlot } from '@ayna/domain';
import { useLocale } from '../locale';
import { radius, space, type ColorTokens } from '../theme';
import { useTheme, useThemedStyles } from '../theme-context';
import { Text } from './Text';

// Almatı sabit UTC+5 (Kazakistan 2024'ten beri tek saat dilimi, DST yok).
// Backend UTC; kullanıcıya Almatı saatiyle gösterilir (CLAUDE.md).
const ALMATY_OFFSET_MS = 5 * 60 * 60_000;

function parts(ms: number) {
  const d = new Date(ms + ALMATY_OFFSET_MS);
  return { wd: d.getUTCDay(), day: d.getUTCDate(), h: d.getUTCHours(), m: d.getUTCMinutes() };
}
const two = (n: number) => String(n).padStart(2, '0');
const timeLabel = (ms: number) => {
  const p = parts(ms);
  return `${two(p.h)}:${two(p.m)}`;
};

export type PickerDay = { dateMs: number; slots: DaySlot[] };

/**
 * Kullanıcı tarafı slot seçici (master §4.6): üstte yatay gün şeridi, altında o günün
 * müsait saatleri chip olarak. Dolu/geçmiş saatler soluk ve tıklanamaz. İki dokunuşta randevu.
 * Sunumsaldır — slotlar @ayna/domain computeDaySlots ile hazırlanıp prop olarak verilir.
 */
export function SlotPicker({
  days,
  selected,
  onSelect,
}: {
  days: PickerDay[];
  selected: number | null;
  onSelect: (startMs: number) => void;
}) {
  const { t } = useLocale();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  // Varsayılan aktif gün: seçili slotun günü, yoksa ilk gün.
  const initialDay = useMemo(() => {
    if (selected != null) {
      const idx = days.findIndex((d) => d.slots.some((s) => s.startMs === selected));
      if (idx >= 0) return idx;
    }
    return 0;
  }, [days, selected]);
  const [dayIdx, setDayIdx] = useState(initialDay);

  const active = days[dayIdx];

  return (
    <View style={styles.wrap}>
      <View style={styles.tzRow}>
        <Ionicons name="time-outline" size={14} color={colors.muted} />
        <Text variant="caption" tone="muted">
          {t('slots.tz')}
        </Text>
      </View>

      {/* Gün şeridi */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.dayStrip}
      >
        {days.map((d, i) => {
          const p = parts(d.dateMs);
          const on = i === dayIdx;
          const hasFree = d.slots.some((s) => s.available);
          return (
            <Pressable key={d.dateMs} style={[styles.dayChip, on && styles.dayChipOn]} onPress={() => setDayIdx(i)}>
              <Text variant="caption" tone={on ? 'onAccent' : 'muted'} style={styles.dayWd}>
                {t(`wd.${p.wd}` as 'wd.0')}
              </Text>
              <Text variant="bodyStrong" tone={on ? 'onAccent' : 'ink'} style={styles.dayNum}>
                {p.day}
              </Text>
              <View style={[styles.dot, hasFree ? (on ? styles.dotOnFree : styles.dotFree) : styles.dotNone]} />
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Saat chip'leri */}
      {!active || active.slots.length === 0 || !active.slots.some((s) => s.available) ? (
        <View style={styles.empty}>
          <Ionicons name="calendar-outline" size={22} color={colors.muted} />
          <Text variant="caption" tone="muted">
            {t('slots.empty')}
          </Text>
        </View>
      ) : (
        <View style={styles.times}>
          {active.slots.map((s) => {
            const on = s.startMs === selected;
            return (
              <Pressable
                key={s.startMs}
                disabled={!s.available}
                onPress={() => onSelect(s.startMs)}
                style={[
                  styles.timeChip,
                  !s.available && styles.timeChipOff,
                  on && styles.timeChipOn,
                ]}
              >
                <Text
                  variant="bodyStrong"
                  tone={on ? 'onAccent' : s.available ? 'ink' : 'muted'}
                  style={styles.timeText}
                >
                  {timeLabel(s.startMs)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    wrap: { gap: space(1.5) },
    tzRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    dayStrip: { gap: space(1), paddingVertical: space(0.5) },
    dayChip: {
      width: 56,
      paddingVertical: space(1.25),
      borderRadius: radius.lg,
      backgroundColor: colors.surfaceMuted,
      alignItems: 'center',
      gap: 2,
    },
    dayChipOn: { backgroundColor: colors.accent },
    dayWd: { textTransform: 'uppercase', letterSpacing: 0.5 },
    dayNum: { fontSize: 18 },
    dot: { width: 5, height: 5, borderRadius: 3, marginTop: 2 },
    dotFree: { backgroundColor: colors.accent },
    dotOnFree: { backgroundColor: colors.onAccent },
    dotNone: { backgroundColor: 'transparent' },
    times: { flexDirection: 'row', flexWrap: 'wrap', gap: space(1) },
    timeChip: {
      paddingHorizontal: space(2),
      paddingVertical: space(1.25),
      borderRadius: radius.pill,
      backgroundColor: colors.surfaceMuted,
      minWidth: 72,
      alignItems: 'center',
    },
    timeChipOn: { backgroundColor: colors.accent },
    timeChipOff: { opacity: 0.4 },
    timeText: { fontVariant: ['tabular-nums'] },
    empty: { alignItems: 'center', gap: space(1), paddingVertical: space(4) },
  });
