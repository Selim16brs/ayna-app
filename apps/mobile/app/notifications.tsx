import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { type AppNotification, NOTIFICATION_ROUTE, type NotificationType } from '../src/data';
import { fillParams, useLocale } from '../src/locale';
import { useMemo } from 'react';
import { inAudience, selectSellerView, useStore } from '../src/store';
import { type ColorTokens, radius, space } from '../src/theme';
import { useTheme, useThemedStyles } from '../src/theme-context';
import { Screen, StackHeader, Text } from '../src/ui';

type IoniconName = keyof typeof Ionicons.glyphMap;

const TONE: Record<NotificationType, 'rose' | 'gold' | 'sage' | 'blue' | 'lavender'> = {
  booking: 'sage',
  quote: 'gold',
  loyalty: 'gold',
  circle: 'blue',
  system: 'lavender',
};

export default function NotificationsScreen() {
  const { t } = useLocale();
  const router = useRouter();
  const { colors, shadow } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const allItems = useStore((s) => s.notifications);
  const seller = useStore(selectSellerView);
  // §9.1/§10 — aktif moda göre filtrelenir (useMemo: yeni-ref sonsuz döngü tuzağından kaçınır)
  const items = useMemo(() => allItems.filter((n) => inAudience(n, seller)), [allItems, seller]);
  const markAll = useStore((s) => s.markAllNotificationsRead);
  const markRead = useStore((s) => s.markNotificationRead);

  const tint = (type: NotificationType) => {
    const key = TONE[type];
    return { bg: colors[`${key}Soft` as const], fg: colors[key] };
  };

  // Bildirime tıkla → okundu işaretle + ilgili ekrana geç
  const onOpen = (n: AppNotification) => {
    markRead(n.id);
    const target = n.route ?? NOTIFICATION_ROUTE[n.type];
    if (target) router.push(target as never);
  };

  return (
    <Screen edges={[]}>
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
              <Pressable onPress={markAll} hitSlop={6} style={styles.markAll}>
                <Ionicons name="checkmark-done" size={15} color={colors.onAccent} />
                <Text variant="caption" tone="onAccent" style={styles.markAllText}>
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
                    onPress={() => onOpen(n)}
                    style={[styles.row, shadow.soft, !n.read && styles.rowUnread]}
                  >
                    {!n.read ? <View style={styles.accentBar} /> : null}
                    <View style={[styles.iconChip, { backgroundColor: c.bg }]}>
                      <Ionicons name={n.icon as IoniconName} size={20} color={c.fg} />
                    </View>
                    <View style={styles.rowBody}>
                      <Text
                        variant="bodyStrong"
                        tone="ink"
                        style={styles.rowTitle}
                        numberOfLines={1}
                      >
                        {n.titleKey ? fillParams(t(n.titleKey), n.params) : (n.title ?? '')}
                      </Text>
                      <Text variant="caption" tone="inkSoft" style={styles.body}>
                        {n.bodyKey ? fillParams(t(n.bodyKey), n.params) : (n.body ?? '')}
                      </Text>
                      <Text variant="caption" tone="muted" style={styles.date}>
                        {n.dateLabel}
                      </Text>
                    </View>
                    <View style={styles.trailing}>
                      {!n.read ? <View style={styles.dot} /> : null}
                      {(n.route ?? NOTIFICATION_ROUTE[n.type]) ? (
                        <Ionicons name="chevron-forward" size={16} color={colors.muted} />
                      ) : null}
                    </View>
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
    content: { paddingHorizontal: space(3), paddingTop: space(2), paddingBottom: space(13) },
    topRow: { alignItems: 'flex-end', marginBottom: space(2) },
    markAll: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: colors.accent,
      paddingHorizontal: space(1.75),
      paddingVertical: space(0.9),
      borderRadius: radius.pill,
    },
    markAllText: { fontWeight: '800' },
    list: { gap: space(1.5) },
    row: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: space(1.5),
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: space(2),
      overflow: 'hidden',
    },
    rowUnread: { backgroundColor: colors.accentSoft },
    accentBar: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      width: 5,
      backgroundColor: colors.accent,
    },
    iconChip: {
      width: 46,
      height: 46,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowBody: { flex: 1 },
    rowTitle: { fontSize: 16, fontWeight: '800', letterSpacing: -0.2 },
    body: { marginTop: 3, lineHeight: 19 },
    date: { marginTop: space(1) },
    trailing: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(0.75),
      marginTop: space(0.5),
    },
    dot: {
      width: 9,
      height: 9,
      borderRadius: 5,
      backgroundColor: colors.accent,
    },
    empty: { alignItems: 'center', paddingTop: space(8), gap: space(1) },
    emptyIcon: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: colors.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: space(1),
    },
  });
