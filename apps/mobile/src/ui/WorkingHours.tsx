import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocale } from '../locale';
import { radius, space, type ColorTokens } from '../theme';
import { useTheme, useThemedStyles } from '../theme-context';
import { Text } from './Text';

export type DayHours = { wd: number; open: boolean; from: string; to: string };

// Facebook işletme dili: gün gün açık/kapalı + saat aralığı. Pazartesi–Pazar sırası.
const ORDER = [1, 2, 3, 4, 5, 6, 0];

const TIMES: string[] = (() => {
  const out: string[] = [];
  for (let h = 0; h < 24; h++)
    for (const m of [0, 30]) out.push(`${String(h).padStart(2, '0')}:${m === 0 ? '00' : '30'}`);
  return out;
})();

export function defaultHours(): DayHours[] {
  return ORDER.map((wd) => ({ wd, open: wd !== 0, from: '10:00', to: '20:00' }));
}

/**
 * Yeniden kullanılabilir çalışma saatleri editörü (Facebook işletme sayfası gibi):
 * her gün için açık/kapalı + başlangıç–bitiş saati (modal saat seçici).
 */
export function WorkingHours({
  value,
  onChange,
}: {
  value: DayHours[];
  onChange: (v: DayHours[]) => void;
}) {
  const { t } = useLocale();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(makeStyles);
  const [picker, setPicker] = useState<{ idx: number; field: 'from' | 'to' } | null>(null);

  const patch = (idx: number, p: Partial<DayHours>) =>
    onChange(value.map((d, i) => (i === idx ? { ...d, ...p } : d)));

  const applyAll = (idx: number) => {
    const src = value[idx]!;
    onChange(value.map((d) => ({ ...d, open: src.open, from: src.from, to: src.to })));
  };

  return (
    <View style={styles.wrap}>
      {value.map((d, idx) => (
        <View key={d.wd} style={styles.dayRow}>
          <Text variant="bodyStrong" tone="ink" style={styles.dayName}>
            {t(`wd.${d.wd}` as 'wd.0')}
          </Text>

          <Pressable
            style={[styles.toggle, d.open ? styles.toggleOn : styles.toggleOff]}
            onPress={() => patch(idx, { open: !d.open })}
          >
            <Text variant="caption" tone={d.open ? 'onAccent' : 'muted'} style={styles.toggleText}>
              {d.open ? t('hours.open') : t('hours.closed')}
            </Text>
          </Pressable>

          {d.open ? (
            <View style={styles.times}>
              <Pressable style={styles.timeChip} onPress={() => setPicker({ idx, field: 'from' })}>
                <Text variant="caption" tone="ink" style={styles.timeText}>
                  {d.from}
                </Text>
              </Pressable>
              <Text variant="caption" tone="muted">
                –
              </Text>
              <Pressable style={styles.timeChip} onPress={() => setPicker({ idx, field: 'to' })}>
                <Text variant="caption" tone="ink" style={styles.timeText}>
                  {d.to}
                </Text>
              </Pressable>
              <Pressable onPress={() => applyAll(idx)} hitSlop={8} style={styles.copy}>
                <Ionicons name="copy-outline" size={16} color={colors.muted} />
              </Pressable>
            </View>
          ) : (
            <Text variant="caption" tone="muted" style={styles.closedFill}>
              {t('hours.closed')}
            </Text>
          )}
        </View>
      ))}

      <Modal
        visible={picker !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setPicker(null)}
      >
        <View style={styles.backdrop}>
          <View style={[styles.sheet, { paddingBottom: insets.bottom + space(2) }]}>
            <View style={styles.sheetHead}>
              <Text variant="h2" tone="ink" style={styles.sheetTitle}>
                {t('expert.reg.hours')}
              </Text>
              <Pressable onPress={() => setPicker(null)} hitSlop={8} style={styles.close}>
                <Ionicons name="close" size={22} color={colors.ink} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.timeList}>
              {TIMES.map((tm) => {
                const cur = picker ? value[picker.idx]![picker.field] : '';
                const on = tm === cur;
                return (
                  <Pressable
                    key={tm}
                    style={[styles.timeRow, on && styles.timeRowOn]}
                    onPress={() => {
                      if (picker) patch(picker.idx, { [picker.field]: tm });
                      setPicker(null);
                    }}
                  >
                    <Text variant="bodyStrong" tone={on ? 'onAccent' : 'ink'}>
                      {tm}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    wrap: {
      gap: space(1),
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: space(2),
    },
    dayRow: { flexDirection: 'row', alignItems: 'center', gap: space(1), minHeight: 40 },
    dayName: { width: 40 },
    toggle: {
      paddingHorizontal: space(1.5),
      paddingVertical: space(0.75),
      borderRadius: radius.pill,
      width: 70,
      alignItems: 'center',
    },
    toggleOn: { backgroundColor: colors.accent },
    toggleOff: { backgroundColor: colors.surfaceMuted },
    toggleText: { fontWeight: '700' },
    times: { flexDirection: 'row', alignItems: 'center', gap: space(1), flex: 1 },
    timeChip: {
      paddingHorizontal: space(1.5),
      paddingVertical: space(0.75),
      borderRadius: radius.md,
      backgroundColor: colors.surfaceMuted,
    },
    timeText: { fontWeight: '700' },
    copy: { marginLeft: 'auto' },
    closedFill: { flex: 1 },
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    sheet: {
      backgroundColor: colors.bg,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      paddingHorizontal: space(3),
      paddingTop: space(2.5),
      maxHeight: '70%',
    },
    sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    sheetTitle: { fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },
    close: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    timeList: { paddingVertical: space(1.5), gap: space(0.5) },
    timeRow: {
      paddingVertical: space(1.5),
      paddingHorizontal: space(2),
      borderRadius: radius.md,
      backgroundColor: colors.surface,
      alignItems: 'center',
    },
    timeRowOn: { backgroundColor: colors.accent },
  });
