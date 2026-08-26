import { useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { almatyDayStart, almatyParts } from '../datetime';
import { useLocale } from '../locale';
import { useStore } from '../store';
import { radius, space, type ColorTokens } from '../theme';
import { useTheme, useThemedStyles } from '../theme-context';
import { Text } from './Text';

/**
 * KOLTUK DOLULUK ŞERİDİ — salon sahibinin gerçek işi: boş koltuğu doldurmak.
 *
 * GERÇEK VERİDEN hesaplanır: bugünün randevuları saat saat sayılır. Uydurma
 * yüzde YOK (seller/staff.tsx'te `60 + bookings % 38` diye bir sayı vardı,
 * kaldırıldı). Bugün hiç randevu yoksa grafik çizilmez, sebebi yazılır —
 * boş grafik "doluluk sıfır" demek değildir, "veri yok" demektir.
 */

const OPEN_HOUR = 10;
const CLOSE_HOUR = 20;

export function OccupancyStrip({ salonName }: { salonName: string }) {
  const { t } = useLocale();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const bookings = useStore((s) => s.bookings);

  const { hours, peak, freeHours, total } = useMemo(() => {
    const dayStart = almatyDayStart(Date.now(), 0);
    const dayEnd = dayStart + 24 * 3_600_000;
    const dead = ['cancelled', 'expired', 'no_show'];
    const todays = bookings.filter(
      (b) =>
        b.proName === salonName &&
        !dead.includes(b.status) &&
        b.startMs >= dayStart &&
        b.startMs < dayEnd,
    );
    const counts = new Array(CLOSE_HOUR - OPEN_HOUR).fill(0) as number[];
    for (const b of todays) {
      // Randevu süresi boyunca kapladığı her saati işaretle
      const startH = almatyParts(b.startMs).h;
      const endH = almatyParts(b.startMs + Math.max(1, b.durationMin) * 60_000 - 1).h;
      for (let h = startH; h <= endH; h++) {
        const i = h - OPEN_HOUR;
        if (i >= 0 && i < counts.length) counts[i] = (counts[i] ?? 0) + 1;
      }
    }
    const max = Math.max(1, ...counts);
    const free = counts
      .map((c, i) => ({ c, h: i + OPEN_HOUR }))
      .filter((x) => x.c === 0)
      .map((x) => x.h);
    return { hours: counts, peak: max, freeHours: free, total: todays.length };
  }, [bookings, salonName]);

  if (total === 0) {
    return (
      <View style={styles.card}>
        <Text variant="label" tone="muted">
          {t('salon.occupancy.title')}
        </Text>
        <Text variant="caption" tone="muted">
          {t('salon.occupancy.empty')}
        </Text>
      </View>
    );
  }

  // Ardışık boş saatleri "15–17" gibi aralığa çevir — tek tek liste okunmaz.
  const freeLabel = freeHours.length
    ? freeHours
        .reduce<number[][]>((acc, h) => {
          const last = acc[acc.length - 1];
          if (last && h === last[last.length - 1]! + 1) last.push(h);
          else acc.push([h]);
          return acc;
        }, [])
        .map((g) => (g.length > 1 ? `${g[0]}:00–${g[g.length - 1]! + 1}:00` : `${g[0]}:00`))
        .join(' · ')
    : '';

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Text variant="label" tone="muted" style={styles.flex}>
          {t('salon.occupancy.title')}
        </Text>
        <Text numeric variant="meta" tone="ink">
          {total}
        </Text>
      </View>

      <View style={styles.bars}>
        {hours.map((c, i) => (
          <View key={i} style={styles.barCol}>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.bar,
                  { height: `${Math.round((c / peak) * 100)}%` },
                  c === 0 && styles.barEmpty,
                ]}
              />
            </View>
            <Text numeric variant="micro" tone={c === 0 ? 'danger' : 'muted'} style={styles.hour}>
              {i + OPEN_HOUR}
            </Text>
          </View>
        ))}
      </View>

      {freeLabel ? (
        <View style={styles.free}>
          <Ionicons name="alert-circle-outline" size={15} color={colors.gold} />
          <Text variant="caption" tone="inkSoft" style={styles.flex}>
            {t('salon.occupancy.free')}: {freeLabel}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: space(2),
      gap: space(1.25),
    },
    head: { flexDirection: 'row', alignItems: 'center', gap: space(1) },
    flex: { flex: 1 },
    bars: { flexDirection: 'row', gap: 4, alignItems: 'flex-end' },
    barCol: { flex: 1, alignItems: 'center', gap: 4 },
    barTrack: { height: 56, width: '100%', justifyContent: 'flex-end' },
    bar: { width: '100%', borderRadius: 5, backgroundColor: colors.accent, minHeight: 4 },
    barEmpty: { backgroundColor: colors.dangerSoft, height: 6 },
    hour: { fontSize: 10 },
    free: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: space(1),
      backgroundColor: colors.goldSoft,
      borderRadius: radius.md,
      padding: space(1.25),
    },
  });
