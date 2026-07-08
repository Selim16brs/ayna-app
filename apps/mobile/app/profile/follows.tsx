import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useLocale } from '../../src/locale';
import { useStore } from '../../src/store';
import { radius, space, type ColorTokens } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import { Screen, StackHeader, TAB_BAR_CLEARANCE, Text } from '../../src/ui';

// Profil > Takipçi sayısına tıkla → SADECE takipçiler; Takip'e tıkla → SADECE takip edilenler.
export default function FollowsScreen() {
  const { t } = useLocale();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const isFollowing = tab === 'following';

  const followerNames = useStore((s) => s.followerNames);
  const following = useStore((s) => s.following);
  const removeFollower = useStore((s) => s.removeFollower);
  const toggleFollow = useStore((s) => s.toggleFollow);

  const list = isFollowing ? following : followerNames;
  const onRemove = (name: string) => (isFollowing ? toggleFollow(name) : removeFollower(name));

  return (
    <Screen edges={[]}>
      <StackHeader
        title={isFollowing ? t('profile.following_title') : t('profile.followers_title')}
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {list.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Ionicons name="people-outline" size={28} color={colors.muted} />
            </View>
            <Text variant="caption" tone="muted" style={styles.emptyText}>
              {t(isFollowing ? 'profile.following_empty' : 'profile.followers_empty')}
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {list.map((name) => (
              <View key={name} style={styles.row}>
                <View style={styles.avatar}>
                  <Text variant="bodyStrong" tone="accentFg">
                    {name.charAt(0)}
                  </Text>
                </View>
                <Text variant="bodyStrong" tone="ink" style={styles.name} numberOfLines={1}>
                  {name}
                </Text>
                <Pressable style={styles.removeBtn} onPress={() => onRemove(name)} hitSlop={6}>
                  <Text variant="caption" tone="inkSoft" style={styles.removeText}>
                    {t(isFollowing ? 'profile.follow.unfollow' : 'profile.follow.remove')}
                  </Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    content: {
      paddingHorizontal: space(3),
      paddingTop: space(2),
      paddingBottom: TAB_BAR_CLEARANCE,
    },
    list: { gap: space(1.25) },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1.5),
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      paddingHorizontal: space(2),
      paddingVertical: space(1.5),
    },
    avatar: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: colors.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    name: { flex: 1 },
    removeBtn: {
      paddingHorizontal: space(1.5),
      paddingVertical: space(0.9),
      borderRadius: radius.pill,
      borderWidth: 1.25,
      borderColor: colors.line,
    },
    removeText: { fontWeight: '700' },
    empty: { alignItems: 'center', paddingTop: space(8), gap: space(1.5) },
    emptyIcon: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: colors.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyText: { textAlign: 'center', maxWidth: 240 },
  });
