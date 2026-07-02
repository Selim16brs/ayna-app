import { useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { buildUpcomingEvents, type UpcomingEvent, whenShort } from '../src/data';
import { useLocale } from '../src/locale';
import { useStore } from '../src/store';
import type { MessageKey } from '@ayna/i18n';
import { type ColorTokens, radius, space } from '../src/theme';
import { useTheme, useThemedStyles } from '../src/theme-context';
import { Screen, SectionHeader, StackHeader, TAB_BAR_CLEARANCE, Text } from '../src/ui';

type IoniconName = keyof typeof Ionicons.glyphMap;

const GROUPS: { key: MessageKey; match: (d: number) => boolean }[] = [
  { key: 'events.group.today', match: (d) => d <= 0 },
  { key: 'events.group.week', match: (d) => d >= 1 && d <= 7 },
  { key: 'events.group.later', match: (d) => d > 7 },
];

export default function EventsScreen() {
  const { t } = useLocale();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const bookings = useStore((s) => s.bookings);
  const moments = useStore((s) => s.moments);
  const routines = useStore((s) => s.careRoutines);
  const events = useMemo(
    () => buildUpcomingEvents(bookings, moments, routines),
    [bookings, moments, routines],
  );

  return (
    <Screen edges={[]}>
      <StackHeader title={t('events.title')} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {events.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="calendar-outline" size={32} color={colors.muted} />
            <Text variant="caption" tone="muted" style={styles.emptyText}>
              {t('events.empty')}
            </Text>
          </View>
        ) : (
          GROUPS.map((g) => {
            const items = events.filter((e) => g.match(e.inDays));
            if (items.length === 0) return null;
            return (
              <View key={g.key}>
                <SectionHeader title={t(g.key)} />
                <View style={styles.group}>
                  {items.map((e) => (
                    <Row key={e.id} event={e} />
                  ))}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </Screen>
  );
}

function Row({ event }: { event: UpcomingEvent }) {
  const { colors, shadow } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const isAppointment = event.kind === 'appointment';
  const tileBg = event.tone === 'rose' ? colors.roseSoft : colors.goldSoft;
  const tileInk = event.tone === 'rose' ? colors.rose : colors.gold;

  const inner = (
    <>
      <View style={[styles.icon, { backgroundColor: tileBg }]}>
        <Ionicons name={event.icon as IoniconName} size={20} color={tileInk} />
      </View>
      <View style={styles.body}>
        <Text variant="bodyStrong" tone="ink" numberOfLines={1} style={styles.rowTitle}>
          {event.title}
        </Text>
        <Text variant="caption" tone="muted" numberOfLines={1}>
          {event.subtitle}
        </Text>
      </View>
      {isAppointment ? (
        <View style={styles.chevron}>
          <Ionicons name="chevron-forward" size={16} color={colors.inkSoft} />
        </View>
      ) : (
        <View style={styles.whenPill}>
          <Text variant="caption" tone="inkSoft" style={styles.whenText}>
            {whenShort(event.inDays)}
          </Text>
        </View>
      )}
    </>
  );

  if (isAppointment) {
    return (
      <Pressable
        style={({ pressed }) => [styles.row, shadow.soft, pressed && styles.rowPressed]}
        onPress={() => router.push('/booking/' + event.refId)}
      >
        {inner}
      </Pressable>
    );
  }

  return <View style={[styles.row, shadow.soft]}>{inner}</View>;
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    content: { paddingHorizontal: space(3), paddingTop: space(0.5), paddingBottom: TAB_BAR_CLEARANCE },
    empty: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: space(8),
      gap: space(1.5),
    },
    emptyText: {},
    group: { gap: space(1.5) },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1.5),
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      paddingHorizontal: space(1.75),
      paddingVertical: space(1.75),
    },
    rowPressed: { opacity: 0.96, transform: [{ scale: 0.99 }] },
    rowTitle: { fontSize: 16, fontWeight: '800', letterSpacing: -0.2 },
    icon: {
      width: 48,
      height: 48,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    body: { flex: 1, gap: 2 },
    chevron: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: colors.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    whenPill: {
      backgroundColor: colors.surfaceMuted,
      paddingHorizontal: space(1.5),
      paddingVertical: space(0.75),
      borderRadius: radius.pill,
    },
    whenText: { fontWeight: '700' },
  });
