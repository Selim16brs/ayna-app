import { Ionicons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, View } from 'react-native';
import { type UpcomingEvent, getUpcomingEvents, whenShort } from '../src/data';
import { useLocale } from '../src/locale';
import type { MessageKey } from '@ayna/i18n';
import { type ColorTokens, radius, space } from '../src/theme';
import { useTheme, useThemedStyles } from '../src/theme-context';
import { Screen, StackHeader, Text } from '../src/ui';

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
  const events = getUpcomingEvents();

  return (
    <Screen edges={['top']}>
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
                <Text variant="label" tone="rose" style={styles.section}>
                  {t(g.key)}
                </Text>
                <View style={styles.group}>
                  {items.map((e, i) => (
                    <Row key={e.id} event={e} border={i < items.length - 1} />
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

function Row({ event, border }: { event: UpcomingEvent; border: boolean }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={[styles.row, border && styles.rowBorder]}>
      <View
        style={[
          styles.icon,
          { backgroundColor: event.tone === 'rose' ? colors.rose : colors.gold },
        ]}
      >
        <Ionicons name={event.icon as IoniconName} size={18} color={colors.onColor} />
      </View>
      <View style={styles.body}>
        <Text variant="bodyStrong" tone="ink" numberOfLines={1}>
          {event.title}
        </Text>
        <Text variant="caption" tone="muted" numberOfLines={1}>
          {event.subtitle}
        </Text>
      </View>
      <Text variant="caption" tone="inkSoft">
        {whenShort(event.inDays)}
      </Text>
    </View>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    content: { paddingHorizontal: space(3), paddingBottom: space(4) },
    empty: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: space(8),
      gap: space(1.5),
    },
    emptyText: {},
    section: { marginTop: space(2), marginBottom: space(1.25) },
    group: {
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
    icon: {
      width: 40,
      height: 40,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    body: { flex: 1 },
  });
