import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { api, ApiError, type ChatMessage } from '../../src/api';
import { useLocale } from '../../src/locale';
import { useStore } from '../../src/store';
import { type ColorTokens, radius, space } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import { Screen, StackHeader, Text, TextInput } from '../../src/ui';

// EK Z.1 — Sohbet thread'i. Numara maskeleme + moderasyon backend'de; engellenen gönderemez.
export default function ChatThreadScreen() {
  const { t } = useLocale();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const params = useLocalSearchParams<{ id: string; name?: string; otherId?: string }>();
  const convId = params.id;
  const token = useStore((s) => s.token);
  const [items, setItems] = useState<ChatMessage[] | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [notice, setNotice] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  const load = useCallback(async () => {
    if (!token) return setItems([]);
    try {
      setItems(await api.chatMessages(token, convId));
    } catch {
      setItems([]);
    }
  }, [token, convId]);

  useEffect(() => {
    void load();
  }, [load]);

  // Engelli listesini oku → karşı taraf engelli mi?
  useEffect(() => {
    if (!token || !params.otherId) return;
    void api
      .blockedUsers(token)
      .then((list) => setBlocked(list.some((b) => b.id === params.otherId)))
      .catch(() => {});
  }, [token, params.otherId]);

  const send = async () => {
    const body = draft.trim();
    if (!body || !token || sending) return;
    setSending(true);
    setNotice('');
    try {
      await api.sendChatMessage(token, convId, body);
      setDraft('');
      await load();
      requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
    } catch (err) {
      // Kurucu izin modeli: tek-mesaj / takip / engel kurallarını kullanıcıya açıkla
      const code = err instanceof ApiError ? err.code : '';
      setNotice(
        code === 'AWAIT_REPLY'
          ? t('messages.await_reply')
          : code === 'FOLLOW_REQUIRED'
            ? t('messages.follow_required')
            : code === 'BLOCKED'
              ? t('messages.blocked_notice')
              : t('messages.start_err'),
      );
    } finally {
      setSending(false);
    }
  };

  const toggleBlock = async () => {
    if (!token || !params.otherId) return;
    try {
      if (blocked) await api.unblockUser(token, params.otherId);
      else await api.blockUser(token, params.otherId);
      setBlocked(!blocked);
    } catch {
      /* yut */
    }
  };

  const blockBtn = params.otherId ? (
    <Pressable onPress={toggleBlock} hitSlop={8}>
      <Ionicons
        name={blocked ? 'lock-open-outline' : 'ban-outline'}
        size={20}
        color={colors.danger}
      />
    </Pressable>
  ) : undefined;

  return (
    <Screen edges={[]}>
      <StackHeader title={params.name || t('messages.title')} right={blockBtn} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
        >
          <View style={styles.hintRow}>
            <Ionicons name="shield-checkmark-outline" size={13} color={colors.muted} />
            <Text variant="caption" tone="muted" style={styles.hintText}>
              {t('messages.number_hint')}
            </Text>
          </View>
          {items && items.length === 0 ? (
            <Text variant="caption" tone="muted" style={styles.threadEmpty}>
              {t('messages.thread_empty')}
            </Text>
          ) : null}
          {(items ?? []).map((m) => (
            <View key={m.id} style={[styles.bubbleRow, m.mine ? styles.rowMine : styles.rowTheirs]}>
              <View style={[styles.bubble, m.mine ? styles.bubbleMine : styles.bubbleTheirs]}>
                {m.hidden ? (
                  <Text variant="caption" tone="muted" style={styles.hiddenText}>
                    {t('messages.hidden')}
                  </Text>
                ) : (
                  <Text variant="body" tone={m.mine ? 'onAccent' : 'ink'}>
                    {m.body}
                  </Text>
                )}
              </View>
            </View>
          ))}
        </ScrollView>

        {blocked ? (
          <View style={styles.blockedBar}>
            <Text variant="caption" tone="muted">
              {t('messages.blocked_notice')}
            </Text>
          </View>
        ) : (
          <View>
            {notice ? (
              <View style={styles.noticeBar}>
                <Ionicons name="information-circle-outline" size={14} color={colors.muted} />
                <Text variant="caption" tone="muted" style={styles.noticeText}>
                  {notice}
                </Text>
              </View>
            ) : null}
            <View style={styles.composer}>
              <TextInput
                value={draft}
                onChangeText={(v) => {
                  setDraft(v);
                  if (notice) setNotice('');
                }}
                placeholder={t('messages.input_placeholder')}
                placeholderTextColor={colors.muted}
                style={styles.input}
                multiline
              />
              <Pressable
                onPress={send}
                disabled={!draft.trim() || sending}
                style={[styles.sendBtn, (!draft.trim() || sending) && styles.sendBtnOff]}
              >
                <Ionicons name="send" size={18} color={colors.onAccent} />
              </Pressable>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
    </Screen>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    flex: { flex: 1 },
    content: {
      paddingHorizontal: space(3),
      paddingTop: space(1),
      paddingBottom: space(3),
      gap: space(1),
    },
    hintRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: space(0.5),
      marginBottom: space(1),
    },
    hintText: { fontSize: 11 },
    threadEmpty: { textAlign: 'center', paddingVertical: space(6) },
    bubbleRow: { flexDirection: 'row' },
    rowMine: { justifyContent: 'flex-end' },
    rowTheirs: { justifyContent: 'flex-start' },
    bubble: {
      maxWidth: '80%',
      paddingHorizontal: space(1.75),
      paddingVertical: space(1.25),
      borderRadius: radius.md,
    },
    bubbleMine: { backgroundColor: colors.accent, borderBottomRightRadius: 6 },
    bubbleTheirs: { backgroundColor: colors.surfaceMuted, borderBottomLeftRadius: 6 },
    hiddenText: { fontStyle: 'italic' },
    composer: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: space(1),
      paddingHorizontal: space(3),
      paddingVertical: space(1.5),
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.line,
      backgroundColor: colors.surface,
    },
    input: {
      flex: 1,
      maxHeight: 120,
      minHeight: 44,
      backgroundColor: colors.surfaceMuted,
      borderRadius: radius.md,
      paddingHorizontal: space(1.75),
      paddingVertical: space(1.25),
      color: colors.ink,
      fontSize: 15,
    },
    sendBtn: {
      width: 44,
      height: 44,
      borderRadius: radius.pill,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sendBtnOff: { opacity: 0.4 },
    blockedBar: {
      alignItems: 'center',
      paddingVertical: space(2),
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.line,
    },
    noticeBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(0.75),
      paddingHorizontal: space(3),
      paddingVertical: space(1),
      backgroundColor: colors.surfaceMuted,
    },
    noticeText: { flex: 1 },
  });
