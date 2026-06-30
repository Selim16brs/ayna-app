import { Ionicons } from '@expo/vector-icons';
import { ImageBackground, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  CARE_ROUTINES,
  type CareRoutine,
  LIFE_ARTICLES,
  MOMENTS,
  type Moment,
  PERSONAL_LOGS,
  type PersonalTone,
  QUICK_ADD,
} from '../../src/data';
import { useLocale } from '../../src/locale';
import { radius, space, type ColorTokens } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import { Screen, Text } from '../../src/ui';

type IoniconName = keyof typeof Ionicons.glyphMap;

const makeTone = (colors: ColorTokens): Record<PersonalTone, { bg: string; fg: string }> => ({
  rose: { bg: colors.roseSoft, fg: colors.rose },
  sage: { bg: colors.sageSoft, fg: colors.sage },
  lavender: { bg: colors.lavenderSoft, fg: colors.lavender },
  blue: { bg: colors.blueSoft, fg: colors.blue },
});

export default function BenimIcinScreen() {
  const { t } = useLocale();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const TONE = makeTone(colors);

  return (
    <Screen edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text variant="title" tone="ink">
            {t('benim.title')}
          </Text>
          <Text variant="caption" tone="muted" style={styles.subtitle}>
            {t('benim.subtitle')}
          </Text>
        </View>

        {/* Hızlı ekle */}
        <View style={styles.quickRow}>
          {QUICK_ADD.map((q) => {
            const c = TONE[q.tone];
            return (
              <Pressable key={q.id} style={styles.quick}>
                <View style={[styles.quickIcon, { backgroundColor: c.bg }]}>
                  <Ionicons name={q.icon as IoniconName} size={22} color={c.fg} />
                </View>
                <Text variant="caption" tone="inkSoft" style={styles.quickLabel}>
                  {t(q.labelKey)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Kişisel kayıtlar */}
        <Text variant="label" tone="rose" style={styles.section}>
          {t('benim.section.records')}
        </Text>
        <View style={styles.group}>
          {PERSONAL_LOGS.map((p, i) => {
            const c = TONE[p.tone];
            return (
              <View
                key={p.id}
                style={[styles.row, i < PERSONAL_LOGS.length - 1 && styles.rowBorder]}
              >
                <View style={[styles.iconChip, { backgroundColor: c.bg }]}>
                  <Ionicons name={p.icon as IoniconName} size={19} color={c.fg} />
                </View>
                <View style={styles.rowText}>
                  <Text variant="bodyStrong" tone="ink" numberOfLines={1}>
                    {p.title}
                  </Text>
                  <Text variant="caption" tone="muted">
                    {p.dateLabel}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Bakım takvimi */}
        <Text variant="label" tone="rose" style={styles.section}>
          {t('benim.section.care')}
        </Text>
        <View style={styles.group}>
          {CARE_ROUTINES.map((r, i) => (
            <RoutineRow key={r.id} routine={r} border={i < CARE_ROUTINES.length - 1} />
          ))}
        </View>

        {/* Özel günler */}
        <Text variant="label" tone="rose" style={styles.section}>
          {t('benim.section.moments')}
        </Text>
        <View style={styles.group}>
          {MOMENTS.map((m, i) => (
            <MomentRow key={m.id} moment={m} border={i < MOMENTS.length - 1} />
          ))}
        </View>

        {/* AYNA Life */}
        <Text variant="label" tone="rose" style={styles.section}>
          {t('benim.section.life')}
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.life}
        >
          {LIFE_ARTICLES.map((a) => (
            <ImageBackground
              key={a.id}
              source={{ uri: a.image }}
              style={styles.lifeCard}
              imageStyle={styles.lifeImage}
            >
              <LinearGradient
                colors={['rgba(0,0,0,0.05)', 'rgba(0,0,0,0.82)']}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.lifeTag}>
                <Text variant="caption" tone="onColor" style={styles.lifeTagText}>
                  {a.tag}
                </Text>
              </View>
              <View style={styles.lifeBody}>
                <Text variant="bodyStrong" tone="onColor" numberOfLines={2}>
                  {a.title}
                </Text>
                <Text variant="caption" tone="onColor" style={styles.lifeRead}>
                  {a.readMin} {t('life.read')}
                </Text>
              </View>
            </ImageBackground>
          ))}
        </ScrollView>
      </ScrollView>
    </Screen>
  );
}

function dueLabel(days: number, t: (k: 'care.due_in' | 'care.overdue' | 'care.today') => string) {
  if (days < 0) return { text: `${Math.abs(days)} ${t('care.overdue')}`, danger: true };
  if (days === 0) return { text: t('care.today'), danger: false };
  return { text: `${days} ${t('care.due_in')}`, danger: false };
}

function RoutineRow({ routine, border }: { routine: CareRoutine; border: boolean }) {
  const { t } = useLocale();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const due = dueLabel(routine.dueDays, t);
  return (
    <View style={[styles.row, border && styles.rowBorder]}>
      <View style={[styles.iconChip, { backgroundColor: colors.sageSoft }]}>
        <Ionicons name={routine.icon as IoniconName} size={19} color={colors.sage} />
      </View>
      <Text variant="bodyStrong" tone="ink" style={styles.rowText} numberOfLines={1}>
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

function MomentRow({ moment, border }: { moment: Moment; border: boolean }) {
  const { t } = useLocale();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={[styles.row, border && styles.rowBorder]}>
      <View style={[styles.iconChip, { backgroundColor: colors.lavenderSoft }]}>
        <Ionicons name={moment.icon as IoniconName} size={19} color={colors.lavender} />
      </View>
      <View style={styles.rowText}>
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

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    content: { paddingBottom: space(4) },
    header: { paddingHorizontal: space(3), paddingTop: space(1), marginBottom: space(2) },
    subtitle: { marginTop: 2 },
    quickRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: space(3),
    },
    quick: { alignItems: 'center', width: 72 },
    quickIcon: {
      width: 56,
      height: 56,
      borderRadius: radius.lg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    quickLabel: { marginTop: space(0.75), textAlign: 'center' },
    section: {
      paddingHorizontal: space(3),
      marginTop: space(3),
      marginBottom: space(1.5),
    },
    group: {
      marginHorizontal: space(3),
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.line,
      overflow: 'hidden',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1.5),
      paddingHorizontal: space(1.75),
      paddingVertical: space(1.5),
    },
    rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.line },
    iconChip: {
      width: 44,
      height: 44,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowText: { flex: 1 },
    duePill: {
      backgroundColor: colors.surfaceMuted,
      paddingHorizontal: space(1.25),
      paddingVertical: space(0.75),
      borderRadius: radius.pill,
    },
    dueDanger: { backgroundColor: colors.dangerSoft },
    life: { paddingHorizontal: space(3), gap: space(1.5), paddingBottom: space(1) },
    lifeCard: {
      width: 220,
      height: 150,
      borderRadius: radius.lg,
      overflow: 'hidden',
      justifyContent: 'flex-end',
    },
    lifeImage: { borderRadius: radius.lg },
    lifeTag: {
      position: 'absolute',
      top: space(1.5),
      left: space(1.5),
      backgroundColor: colors.accent,
      paddingHorizontal: space(1),
      paddingVertical: 3,
      borderRadius: radius.pill,
    },
    lifeTagText: { fontWeight: '600' },
    lifeBody: { padding: space(1.75) },
    lifeRead: { opacity: 0.9, marginTop: 2 },
  });
