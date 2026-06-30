import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { type CirclePostType } from '../../src/data';
import { useLocale } from '../../src/locale';
import { useStore } from '../../src/store';
import type { MessageKey } from '@ayna/i18n';
import { radius, space, type ColorTokens } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import { Screen, StackHeader, Text } from '../../src/ui';

const makeType = (
  colors: ColorTokens,
): Record<CirclePostType, { key: MessageKey; bg: string; fg: string }> => ({
  recommend: { key: 'circle.type.recommend', bg: colors.successSoft, fg: colors.success },
  asking: { key: 'circle.type.asking', bg: colors.goldSoft, fg: colors.gold },
  experience: { key: 'circle.type.experience', bg: colors.roseSoft, fg: colors.rose },
});

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useLocale();
  const { colors, shadow } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const post = useStore((s) => s.circlePosts.find((p) => p.id === id));
  const toggleHelpful = useStore((s) => s.toggleHelpful);
  const addComment = useStore((s) => s.addComment);
  const [draft, setDraft] = useState('');

  if (!post) {
    return (
      <Screen edges={['top']}>
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

  const send = () => {
    if (draft.trim().length === 0) return;
    addComment(post.id, draft.trim(), false);
    setDraft('');
  };

  return (
    <Screen edges={['top']}>
      <StackHeader title={t('circle.detail.title')} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Gönderi */}
          <View style={[styles.card, shadow.card]}>
            <View style={styles.cardTop}>
              <View style={styles.author}>
                <View style={styles.avatar}>
                  {post.anonymous ? (
                    <Ionicons name="shield-checkmark" size={16} color={colors.rose} />
                  ) : (
                    <Text variant="caption" tone="rose">
                      {post.author.charAt(0)}
                    </Text>
                  )}
                </View>
                <View>
                  <Text variant="bodyStrong" tone="ink">
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

            <Text variant="body" tone="inkSoft" style={styles.postText}>
              {post.text}
            </Text>

            <View style={styles.helpfulRow}>
              <Pressable
                style={styles.helpfulBtn}
                onPress={() => toggleHelpful(post.id)}
                hitSlop={8}
              >
                <Ionicons
                  name={post.helpfulByMe ? 'heart' : 'heart-outline'}
                  size={18}
                  color={post.helpfulByMe ? colors.accent : colors.muted}
                />
                <Text variant="caption" tone={post.helpfulByMe ? 'rose' : 'muted'}>
                  {t('circle.helpful_btn')} · {post.helpful}
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Yorumlar */}
          <Text variant="label" tone="rose" style={styles.section}>
            {t('circle.detail.comments')}
          </Text>

          {post.comments.length === 0 ? (
            <View style={styles.noComments}>
              <Text variant="caption" tone="muted">
                {t('circle.detail.no_comments')}
              </Text>
            </View>
          ) : (
            <View style={styles.comments}>
              {post.comments.map((c) => (
                <View key={c.id} style={styles.comment}>
                  <View style={styles.commentAvatar}>
                    {c.anonymous ? (
                      <Ionicons name="shield-checkmark" size={13} color={colors.rose} />
                    ) : (
                      <Text variant="caption" tone="rose">
                        {c.author.charAt(0)}
                      </Text>
                    )}
                  </View>
                  <View style={styles.commentBody}>
                    <Text variant="caption" tone="ink">
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
            <Ionicons name="send" size={18} color={colors.onColor} />
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
    content: { paddingHorizontal: space(3), paddingBottom: space(3) },
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
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: colors.roseSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    typeBadge: { paddingHorizontal: space(1.25), paddingVertical: 4, borderRadius: radius.pill },
    typeText: { fontSize: 11 },
    postText: { marginTop: space(1.5), lineHeight: 22 },
    helpfulRow: {
      flexDirection: 'row',
      marginTop: space(2),
      paddingTop: space(1.5),
      borderTopWidth: 1,
      borderTopColor: colors.line,
    },
    helpfulBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    section: { marginTop: space(3), marginBottom: space(1.5) },
    noComments: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.line,
      padding: space(2.5),
      alignItems: 'center',
    },
    comments: { gap: space(1.25) },
    comment: {
      flexDirection: 'row',
      gap: space(1),
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.line,
      padding: space(1.75),
    },
    commentAvatar: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: colors.roseSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    commentBody: { flex: 1 },
    commentText: { marginTop: 2, lineHeight: 21 },
    composer: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: space(1),
      paddingHorizontal: space(3),
      paddingTop: space(1.5),
      paddingBottom: space(1.5),
      borderTopWidth: 1,
      borderTopColor: colors.line,
      backgroundColor: colors.bg,
    },
    input: {
      flex: 1,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: radius.lg,
      paddingHorizontal: space(2),
      paddingVertical: space(1.25),
      maxHeight: 110,
      fontSize: 15,
      color: colors.ink,
    },
    send: {
      width: 46,
      height: 46,
      borderRadius: 23,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sendDisabled: { opacity: 0.4 },
  });
