import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { api, type ConversationSummary } from '../../src/api';
import { useLocale } from '../../src/locale';
import { useStore } from '../../src/store';
import { type ColorTokens, radius, space } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import { Screen, StackHeader, Text } from '../../src/ui';

// EK Z.1 — Konuşma listesi (müşteri ↔ uzman/salon DM)
export default function MessagesScreen() {
  const { t } = useLocale();
  const { colors, shadow } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const token = useStore((s) => s.token);
  const [items, setItems] = useState<ConversationSummary[] | null>(null);

  const load = useCallback(async () => {
    if (!token) return setItems([]);
    try {
      setItems(await api.conversations(token));
    } catch {
      setItems([]);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const open = (c: ConversationSummary) => {
    router.push({ pathname: '/messages/[id]', params: { id: c.id, name: c.otherName, otherId: c.otherId } });
  };

  return (
    <Screen edges={[]}>
      <StackHeader title={t('messages.title')} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {items === null ? null : items.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Ionicons name="chatbubbles-outline" size={30} color={colors.muted} />
            </View>
            <Text variant="caption" tone="muted">
              {t('messages.empty')}
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {items.map((c) => (
              <Pressable key={c.id} onPress={() => open(c)} style={[styles.row, shadow.soft]}>
                <View style={styles.avatar}>
                  <Text variant="bodyStrong" tone="onAccent">
                    {(c.otherName || '?').slice(0, 1).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.rowBody}>
                  <Text variant="bodyStrong" tone="ink" numberOfLines={1}>
                    {c.otherName || '—'}
                  </Text>
                  <Text variant="caption" tone="inkSoft" numberOfLines={1}>
                    {c.lastBody || ''}
                  </Text>
                </View>
                {c.unread > 0 ? (
                  <View style={styles.badge}>
                    <Text variant="caption" tone="onAccent" style={styles.badgeText}>
                      {c.unread}
                    </Text>
                  </View>
                ) : (
                  <Ionicons name="chevron-forward" size={16} color={colors.muted} />
                )}
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    content: { paddingHorizontal: space(3), paddingTop: space(2), paddingBottom: space(13) },
    empty: { alignItems: 'center', gap: space(2), paddingTop: space(10) },
    emptyIcon: {
      width: 64,
      height: 64,
      borderRadius: radius.pill,
      backgroundColor: colors.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    list: { gap: space(1.5) },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1.5),
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      padding: space(1.75),
    },
    avatar: {
      width: 44,
      height: 44,
      borderRadius: radius.pill,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowBody: { flex: 1, gap: space(0.25) },
    badge: {
      minWidth: 22,
      height: 22,
      paddingHorizontal: 6,
      borderRadius: radius.pill,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    badgeText: { fontSize: 12 },
  });
