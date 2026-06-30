import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { type CirclePost, type CirclePostType } from '../../src/data';
import { useLocale } from '../../src/locale';
import { useStore } from '../../src/store';
import type { MessageKey } from '@ayna/i18n';
import { radius, space, type ColorTokens } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import { Screen, Text } from '../../src/ui';

const makeType = (
  colors: ColorTokens,
): Record<CirclePostType, { key: MessageKey; bg: string; fg: string }> => ({
  recommend: { key: 'circle.type.recommend', bg: colors.successSoft, fg: colors.success },
  asking: { key: 'circle.type.asking', bg: colors.goldSoft, fg: colors.gold },
  experience: { key: 'circle.type.experience', bg: colors.roseSoft, fg: colors.rose },
});

export default function CircleScreen() {
  const { t } = useLocale();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const posts = useStore((s) => s.circlePosts);

  return (
    <Screen edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text variant="title" tone="ink">
            {t('circle.title')}
          </Text>
          <Text variant="caption" tone="muted" style={styles.subtitle}>
            {t('circle.subtitle')}
          </Text>
        </View>
        <Pressable style={styles.ask} onPress={() => router.push('/circle/new')}>
          <Ionicons name="add" size={16} color={colors.onColor} />
          <Text variant="caption" tone="onColor">
            {t('circle.ask')}
          </Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {posts.map((p) => (
          <PostCard key={p.id} post={p} />
        ))}
      </ScrollView>
    </Screen>
  );
}

function PostCard({ post }: { post: CirclePost }) {
  const { t } = useLocale();
  const { colors, shadow } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const toggleHelpful = useStore((s) => s.toggleHelpful);
  const ty = makeType(colors)[post.type];
  return (
    <Pressable style={[styles.card, shadow.card]} onPress={() => router.push('/circle/' + post.id)}>
      <View style={styles.cardTop}>
        <View style={styles.author}>
          <View style={styles.avatar}>
            {post.anonymous ? (
              <Ionicons name="shield-checkmark" size={15} color={colors.rose} />
            ) : (
              <Text variant="caption" tone="rose">
                {post.author.charAt(0)}
              </Text>
            )}
          </View>
          <View>
            <Text variant="caption" tone="ink">
              {post.anonymous ? t('circle.verified') : post.author}
            </Text>
            <Text variant="caption" tone="muted">
              {post.category}
            </Text>
          </View>
        </View>
        <View style={[styles.typeBadge, { backgroundColor: ty.bg }]}>
          <Text variant="caption" style={[styles.typeText, { color: ty.fg }]}>
            {t(ty.key)}
          </Text>
        </View>
      </View>

      <Text variant="body" tone="inkSoft" style={styles.text}>
        {post.text}
      </Text>

      <View style={styles.footer}>
        <Pressable style={styles.footerItem} onPress={() => toggleHelpful(post.id)} hitSlop={8}>
          <Ionicons
            name={post.helpfulByMe ? 'heart' : 'heart-outline'}
            size={15}
            color={post.helpfulByMe ? colors.accent : colors.muted}
          />
          <Text variant="caption" tone={post.helpfulByMe ? 'rose' : 'muted'}>
            {post.helpful} {t('circle.helpful')}
          </Text>
        </Pressable>
        <View style={styles.footerItem}>
          <Ionicons name="chatbubble-outline" size={14} color={colors.muted} />
          <Text variant="caption" tone="muted">
            {post.comments.length} {t('circle.comments')}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: space(3),
      paddingTop: space(1),
      marginBottom: space(2),
    },
    headerText: { flex: 1 },
    subtitle: { marginTop: 2 },
    ask: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: colors.rose,
      paddingHorizontal: space(1.5),
      paddingVertical: space(1),
      borderRadius: radius.pill,
    },
    list: { paddingHorizontal: space(3), paddingBottom: space(4), gap: space(1.5) },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.line,
      padding: space(2),
    },
    cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    author: { flexDirection: 'row', alignItems: 'center', gap: space(1) },
    avatar: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: colors.roseSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    typeBadge: { paddingHorizontal: space(1.25), paddingVertical: 4, borderRadius: radius.pill },
    typeText: { fontSize: 11 },
    text: { marginTop: space(1.5) },
    footer: {
      flexDirection: 'row',
      gap: space(2.5),
      marginTop: space(1.5),
      paddingTop: space(1.5),
      borderTopWidth: 1,
      borderTopColor: colors.line,
    },
    footerItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  });
