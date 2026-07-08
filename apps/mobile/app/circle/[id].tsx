import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { type CirclePostType } from '../../src/data';
import { useLocale } from '../../src/locale';
import { useStore } from '../../src/store';
import type { MessageKey } from '@ayna/i18n';
import { radius, space, type ColorTokens } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import { Screen, SectionHeader, StackHeader, Text, TextInput } from '../../src/ui';

// Gönderi türü çipleri — Keşfet pill dili: pastel zemin + ink metin (nötr, canlı değil).
const makeType = (
  colors: ColorTokens,
): Record<CirclePostType, { key: MessageKey; bg: string; fg: string }> => ({
  recommend: { key: 'circle.type.recommend', bg: colors.successSoft, fg: colors.success },
  asking: { key: 'circle.type.asking', bg: colors.goldSoft, fg: colors.gold },
  experience: { key: 'circle.type.experience', bg: colors.blueSoft, fg: colors.blue },
});

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useLocale();
  const { colors, shadow } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const post = useStore((s) => s.circlePosts.find((p) => p.id === id));
  const toggleHelpful = useStore((s) => s.toggleHelpful);
  const addComment = useStore((s) => s.addComment);
  const reportPost = useStore((s) => s.reportPost);
  const reported = useStore((s) => s.reportedPosts.includes(id ?? ''));
  const following = useStore((s) => s.following);
  const toggleFollow = useStore((s) => s.toggleFollow);
  const [draft, setDraft] = useState('');

  // §5.5 — şikâyet: içerik görünür kalır, admin kuyruğuna düşer
  const onReport = () => {
    if (!id || reported) return;
    Alert.alert(t('circle.report_confirm'), t('circle.report_note'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('circle.report'), style: 'destructive', onPress: () => reportPost(id) },
    ]);
  };

  if (!post) {
    return (
      <Screen edges={[]}>
        <StackHeader title={t('circle.detail.title')} />
        <View style={styles.empty}>
          <Text variant="body" tone="muted">
            {t('circle.detail.title')}
          </Text>
        </View>
      </Screen>
    );
  }

  const ty = makeType(colors)[post.type];
  const isFollowing = following.includes(post.author);

  const send = () => {
    if (draft.trim().length === 0) return;
    addComment(post.id, draft.trim(), false);
    setDraft('');
  };

  return (
    <Screen edges={[]}>
      <StackHeader title={t('circle.detail.title')} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Gönderi kartı — kenarlıksız, yumuşak gölge */}
          <View style={[styles.card, shadow.card]}>
            <View style={styles.cardTop}>
              <View style={styles.author}>
                <View style={styles.avatar}>
                  {post.anonymous ? (
                    <Ionicons name="shield-checkmark" size={18} color={colors.accentFg} />
                  ) : (
                    <Text variant="bodyStrong" tone="accentFg">
                      {post.author.charAt(0)}
                    </Text>
                  )}
                </View>
                <View>
                  <Text variant="bodyStrong" tone="ink" style={styles.authorName}>
                    {post.anonymous ? t('circle.verified') : post.author}
                  </Text>
                  <Text variant="caption" tone="muted">
                    {post.category}
                  </Text>
                </View>
                {/* §W2W — kişiyi takip et (anonim hariç) */}
                {!post.anonymous ? (
                  <Pressable
                    style={[styles.followBtn, isFollowing && styles.followBtnOn]}
                    onPress={() => toggleFollow(post.author)}
                    hitSlop={6}
                  >
                    <Ionicons
                      name={isFollowing ? 'checkmark' : 'add'}
                      size={14}
                      color={isFollowing ? colors.onAccent : colors.accentFg}
                    />
                    <Text
                      variant="caption"
                      tone={isFollowing ? 'onAccent' : 'accentFg'}
                      style={styles.followText}
                    >
                      {isFollowing ? t('circle.following') : t('circle.follow')}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
              <View style={[styles.typeBadge, { backgroundColor: ty.bg }]}>
                <Text variant="caption" style={[styles.typeText, { color: ty.fg }]}>
                  {t(ty.key)}
                </Text>
              </View>
            </View>

            <Text variant="body" tone="ink" style={styles.postText}>
              {post.text}
            </Text>

            <View style={styles.helpfulRow}>
              <Pressable
                style={[styles.helpfulBtn, post.helpfulByMe && styles.helpfulBtnOn]}
                onPress={() => toggleHelpful(post.id)}
                hitSlop={8}
              >
                <Ionicons
                  name={post.helpfulByMe ? 'heart' : 'heart-outline'}
                  size={17}
                  color={post.helpfulByMe ? colors.onAccent : colors.inkSoft}
                />
                <Text
                  variant="caption"
                  tone={post.helpfulByMe ? 'onAccent' : 'inkSoft'}
                  style={styles.helpfulText}
                >
                  {t('circle.helpful_btn')} · {post.helpful}
                </Text>
              </Pressable>
              <Pressable
                style={styles.reportBtn}
                onPress={onReport}
                hitSlop={8}
                disabled={reported}
              >
                <Ionicons name="flag-outline" size={15} color={colors.muted} />
                <Text variant="caption" tone="muted">
                  {reported ? t('circle.reported') : t('circle.report')}
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Yorumlar */}
          <SectionHeader title={t('circle.detail.comments')} />

          {post.comments.length === 0 ? (
            <View style={[styles.noComments, shadow.soft]}>
              <View style={styles.noCommentsIcon}>
                <Ionicons name="chatbubble-ellipses-outline" size={22} color={colors.inkSoft} />
              </View>
              <Text variant="caption" tone="muted">
                {t('circle.detail.no_comments')}
              </Text>
            </View>
          ) : (
            <View style={styles.comments}>
              {post.comments.map((c) => (
                <View key={c.id} style={[styles.comment, shadow.soft]}>
                  <View style={styles.commentAvatar}>
                    {c.anonymous ? (
                      <Ionicons name="shield-checkmark" size={14} color={colors.accentFg} />
                    ) : (
                      <Text variant="caption" tone="accentFg">
                        {c.author.charAt(0)}
                      </Text>
                    )}
                  </View>
                  <View style={styles.commentBody}>
                    <Text variant="caption" tone="ink" style={styles.commentAuthor}>
                      {c.anonymous ? t('circle.verified') : c.author}
                    </Text>
                    <Text variant="body" tone="inkSoft" style={styles.commentText}>
                      {c.text}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>

        {/* Yorum yaz */}
        <View style={styles.composer}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder={t('circle.detail.comment_ph')}
            placeholderTextColor={colors.muted}
            style={styles.input}
            multiline
          />
          <Pressable
            style={[styles.send, draft.trim().length === 0 && styles.sendDisabled]}
            onPress={send}
            disabled={draft.trim().length === 0}
          >
            <Ionicons name="arrow-up" size={20} color={colors.onAccent} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    flex: { flex: 1 },
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space(3) },
    content: { paddingHorizontal: space(3), paddingTop: space(2.5), paddingBottom: space(3) },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: space(2.25),
    },
    cardTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: space(1),
    },
    author: { flexDirection: 'row', alignItems: 'center', gap: space(1.25), flexShrink: 1 },
    followBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      paddingHorizontal: space(1.25),
      paddingVertical: 5,
      borderRadius: radius.pill,
      borderWidth: 1.25,
      borderColor: colors.accent,
    },
    followBtnOn: { backgroundColor: colors.accent, borderColor: colors.accent },
    followText: { fontWeight: '700' },
    avatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    authorName: { fontWeight: '800', letterSpacing: -0.2 },
    typeBadge: { paddingHorizontal: space(1.5), paddingVertical: 6, borderRadius: radius.pill },
    typeText: { fontSize: 12, fontWeight: '700' },
    postText: { marginTop: space(2), lineHeight: 23, fontSize: 16 },
    helpfulRow: { flexDirection: 'row', alignItems: 'center', marginTop: space(2.25) },
    reportBtn: { flexDirection: 'row', alignItems: 'center', gap: space(0.5), marginLeft: 'auto' },
    helpfulBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      paddingHorizontal: space(1.75),
      paddingVertical: space(1),
      borderRadius: radius.pill,
      backgroundColor: colors.surfaceMuted,
    },
    helpfulBtnOn: { backgroundColor: colors.accent },
    helpfulText: { fontWeight: '700' },
    noComments: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: space(3),
      alignItems: 'center',
      gap: space(1.25),
    },
    noCommentsIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    comments: { gap: space(1.25) },
    comment: {
      flexDirection: 'row',
      gap: space(1.25),
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: space(2),
    },
    commentAvatar: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: colors.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    commentBody: { flex: 1 },
    commentAuthor: { fontWeight: '700' },
    commentText: { marginTop: 3, lineHeight: 22 },
    composer: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: space(1),
      paddingHorizontal: space(3),
      paddingTop: space(1.5),
      paddingBottom: space(1.5),
      backgroundColor: colors.bg,
    },
    input: {
      flex: 1,
      backgroundColor: colors.surfaceMuted,
      borderRadius: radius.lg,
      paddingHorizontal: space(2),
      paddingVertical: space(1.5),
      maxHeight: 110,
      fontSize: 15,
      color: colors.ink,
    },
    send: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sendDisabled: { opacity: 0.4 },
  });
