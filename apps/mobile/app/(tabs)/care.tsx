import { Ionicons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, View } from 'react-native';
import { CARE_ROUTINES, type CareRoutine, MOMENTS, type Moment } from '../../src/data';
import { useLocale } from '../../src/locale';
import { colors, radius, shadow, space } from '../../src/theme';
import { Screen, Text } from '../../src/ui';

type IoniconName = keyof typeof Ionicons.glyphMap;

export default function CareScreen() {
  const { t } = useLocale();

  return (
    <Screen edges={['top']}>
      <View style={styles.header}>
        <Text variant="title" tone="ink">
          {t('care.title')}
        </Text>
        <Text variant="caption" tone="muted" style={styles.subtitle}>
          {t('care.subtitle')}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text variant="label" tone="rose" style={styles.section}>
          {t('care.section.routines')}
        </Text>
        <View style={styles.group}>
          {CARE_ROUTINES.map((r) => (
            <RoutineRow key={r.id} routine={r} />
          ))}
        </View>

        <Text variant="label" tone="rose" style={styles.section}>
          {t('care.section.moments')}
        </Text>
        <View style={styles.group}>
          {MOMENTS.map((m) => (
            <MomentRow key={m.id} moment={m} />
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}

function dueLabel(days: number, t: (k: 'care.due_in' | 'care.overdue' | 'care.today') => string) {
  if (days < 0) return { text: `${Math.abs(days)} ${t('care.overdue')}`, danger: true };
  if (days === 0) return { text: t('care.today'), danger: false };
  return { text: `${days} ${t('care.due_in')}`, danger: false };
}

function RoutineRow({ routine }: { routine: CareRoutine }) {
  const { t } = useLocale();
  const due = dueLabel(routine.dueDays, t);
  return (
    <View style={[styles.row, shadow.soft]}>
      <View style={styles.iconChip}>
        <Ionicons name={routine.icon as IoniconName} size={20} color={colors.rose} />
      </View>
      <Text variant="bodyStrong" tone="ink" style={styles.rowTitle} numberOfLines={1}>
        {routine.name}
      </Text>
      <View style={[styles.duePill, due.danger && styles.dueDanger]}>
        <Text variant="caption" style={{ color: due.danger ? colors.danger : colors.inkSoft }}>
          {due.text}
        </Text>
      </View>
    </View>
  );
}

function MomentRow({ moment }: { moment: Moment }) {
  const { t } = useLocale();
  return (
    <View style={[styles.row, shadow.soft]}>
      <View style={[styles.iconChip, { backgroundColor: colors.goldSoft }]}>
        <Ionicons name={moment.icon as IoniconName} size={20} color={colors.gold} />
      </View>
      <View style={styles.rowTitle}>
        <Text variant="bodyStrong" tone="ink" numberOfLines={1}>
          {moment.title}
        </Text>
        <Text variant="caption" tone="muted">
          {moment.dateLabel}
        </Text>
      </View>
      <View style={styles.duePill}>
        <Text variant="caption" tone="inkSoft">
          {moment.daysLeft} {t('care.due_in')}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: space(3), paddingTop: space(1), marginBottom: space(2) },
  subtitle: { marginTop: 2 },
  content: { paddingHorizontal: space(3), paddingBottom: space(4) },
  section: { marginTop: space(2), marginBottom: space(1.5) },
  group: { gap: space(1.25) },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(1.5),
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: space(1.75),
  },
  iconChip: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.roseSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: { flex: 1 },
  duePill: {
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: space(1.25),
    paddingVertical: space(0.75),
    borderRadius: radius.pill,
  },
  dueDanger: { backgroundColor: colors.dangerSoft },
});
