import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import type { NotificationType } from '../src/data';
import { useLocale } from '../src/locale';
import { useStore } from '../src/store';
import { type ColorTokens, radius, space } from '../src/theme';
import { useTheme, useThemedStyles } from '../src/theme-context';
import { Screen, StackHeader, Text } from '../src/ui';

type IoniconName = keyof typeof Ionicons.glyphMap;

const TONE: Record<NotificationType, 'rose' | 'gold' | 'sage' | 'blue' | 'lavender'> = {
  booking: 'rose',
  quote: 'gold',
  loyalty: 'gold',
  circle: 'blue',
  system: 'lavender',
};

export default function NotificationsScreen() {
  const { t } = useLocale();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const items = useStore((s) => s.notifications);
  const markAll = useStore((s) => s.markAllNotificationsRead);
  const markRead = useStore((s) => s.markNotificationRead);

  const tint = (type: NotificationType) => {
    const key = TONE[type];
    return { bg: colors[`${key}Soft` as const], fg: colors[key] };
  };

  return (
    <Screen edges={['top']}>
      <StackHeader title={t('notifications.title')} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {items.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Ionicons name="notifications-outline" size={30} color={colors.muted} />
            </View>
            <Text variant="caption" tone="muted">
              {t('notifications.empty')}
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.topRow}>
              <Pressable onPress={markAll} hitSlop={6}>
                <Text variant="caption" tone="rose">
                  {t('notifications.mark_all')}
                </Text>
              </Pressable>
            </View>
            <View style={styles.list}>
              {items.map((n) => {
                const c = tint(n.type);
                return (
                  <Pressable
                    key={n.id}
                    onPress={() => markRead(n.id)}
                    style={[styles.row, !n.read && styles.rowUnread]}
                  >
                    <View style={[styles.iconChip, { backgroundColor: c.bg }]}>
                      <Ionicons name={n.icon as IoniconName} size={19} color={c.fg} />
                    </View>
                    <View style={styles.rowBody}>
                      <Text variant="bodyStrong" tone="ink" numberOfLines={1}>
                        {n.title}
                      </Text>
                      <Text variant="caption" tone="muted" style={styles.body}>
                        {n.body}
                      </Text>
                      <Text variant="caption" tone="muted" style={styles.date}>
                        {n.dateLabel}
                      </Text>
                    </View>
                    {!n.read ? <View style={styles.dot} /> : null}
                  </Pressable>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    content: { paddingHorizontal: space(2), paddingBottom: space(4) },
    topRow: { alignItems: 'flex-end', paddingHorizontal: space(0.5), paddingVertical: space(1) },
    list: { gap: space(1.25) },
    row: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: space(1.5),
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.line,
      padding: space(1.75),
    },
    rowUnread: { backgroundColor: colors.surfaceMuted, borderColor: colors.roseSoft },
    iconChip: {
      width: 42,
      height: 42,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowBody: { flex: 1 },
    body: { marginTop: 2 },
    date: { marginTop: space(0.75) },
    dot: {
      width: 9,
      height: 9,
      borderRadius: 5,
      backgroundColor: colors.rose,
      marginTop: space(0.5),
    },
    empty: { alignItems: 'center', paddingTop: space(8), gap: space(1) },
    emptyIcon: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: colors.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: space(1),
    },
  });
