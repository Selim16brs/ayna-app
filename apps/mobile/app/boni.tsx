import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { api, type AiQuota } from '../src/api';
import { useLocale } from '../src/locale';
import { useStore } from '../src/store';
import { type ColorTokens, radius, space } from '../src/theme';
import { useTheme, useThemedStyles } from '../src/theme-context';
import { Button, Screen, StackHeader, Text, TextInput } from '../src/ui';

interface Msg {
  id: string;
  role: 'user' | 'boni';
  text: string;
}

export default function BoniScreen() {
  const { t } = useLocale();
  const { colors, gradients, shadow } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const token = useStore((s) => s.token);

  const [quota, setQuota] = useState<AiQuota | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const loadQuota = useCallback(async () => {
    if (!token) return;
    try {
      setQuota(await api.aiQuota(token));
    } catch {
      /* sessiz: kota okunamadıysa gönderimde yine sunucu doğrular */
    }
  }, [token]);

  useEffect(() => {
    void loadQuota();
  }, [loadQuota]);

  const enablePremium = async () => {
    if (!token) return;
    try {
      await api.aiSetPremium(token, true);
      await loadQuota();
    } catch {
      /* yoksay */
    }
  };

  const send = async () => {
    const q = input.trim();
    if (!q || !token || sending) return;
    const uid = `u${messages.length}`;
    setMessages((m) => [...m, { id: uid, role: 'user', text: q }]);
    setInput('');
    setSending(true);
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
    try {
      const res = await api.aiBoni(token, q);
      setMessages((m) => [...m, { id: `b${m.length}`, role: 'boni', text: res.answer }]);
      setQuota((prev) => (prev ? { ...prev, remaining: res.remaining, used: prev.used + 1 } : prev));
    } catch {
      setMessages((m) => [...m, { id: `e${m.length}`, role: 'boni', text: t('boni.error') }]);
      void loadQuota();
    } finally {
      setSending(false);
      requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
    }
  };

  // Premium değilse: kilit ekranı + demo aç
  if (quota && !quota.premium) {
    return (
      <Screen edges={[]}>
        <StackHeader title={t('boni.title')} />
        <View style={styles.lockWrap}>
          <LinearGradient colors={gradients.plum} style={[styles.lockIcon, shadow.card]}>
            <Ionicons name="sparkles" size={34} color={colors.onColor} />
          </LinearGradient>
          <Text variant="h2" tone="ink" style={styles.lockTitle}>
            {t('boni.premium.locked')}
          </Text>
          <Text variant="body" tone="muted" style={styles.lockDesc}>
            {t('boni.premium.desc')}
          </Text>
          <View style={styles.lockCta}>
            <Button label={t('boni.premium.cta')} onPress={enablePremium} />
          </View>
          <Pressable onPress={enablePremium} hitSlop={8}>
            <Text variant="caption" tone="muted" style={styles.demoLink}>
              {t('boni.premium.demo')}
            </Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  const empty = quota ? quota.remaining <= 0 : false;

  return (
    <Screen edges={[]}>
      <StackHeader title={t('boni.title')} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Boni tanıtım + kota */}
          <LinearGradient colors={gradients.plum} style={[styles.hero, shadow.card]}>
            <View style={styles.heroTop}>
              <View style={styles.avatar}>
                <Ionicons name="sparkles" size={20} color={colors.onColor} />
              </View>
              <View style={styles.flex}>
                <Text variant="h2" tone="onColor">
                  {t('boni.title')}
                </Text>
                <Text variant="caption" tone="onColor" style={styles.dim}>
                  {t('boni.subtitle')}
                </Text>
              </View>
            </View>
            <Text variant="body" tone="onColor" style={styles.heroIntro}>
              {t('boni.intro')}
            </Text>
            {quota && (
              <View style={styles.quotaPill}>
                <Ionicons name="flash" size={12} color={colors.onColor} />
                <Text variant="caption" tone="onColor" style={styles.quotaText}>
                  {t('boni.quota.remaining')}: {quota.remaining}/{quota.limit}
                </Text>
              </View>
            )}
          </LinearGradient>

          {/* Konuşma */}
          {messages.map((m) => (
            <Animated.View
              key={m.id}
              entering={FadeInDown.springify().damping(18)}
              style={[styles.bubbleRow, m.role === 'user' ? styles.rowRight : styles.rowLeft]}
            >
              {m.role === 'boni' && (
                <View style={styles.bubbleAvatar}>
                  <Ionicons name="sparkles" size={13} color={colors.onColor} />
                </View>
              )}
              <View
                style={[
                  styles.bubble,
                  m.role === 'user' ? styles.bubbleUser : [styles.bubbleBoni, shadow.soft],
                ]}
              >
                <Text variant="body" tone={m.role === 'user' ? 'onAccent' : 'ink'}>
                  {m.text}
                </Text>
              </View>
            </Animated.View>
          ))}

          {sending && (
            <View style={[styles.bubbleRow, styles.rowLeft]}>
              <View style={styles.bubbleAvatar}>
                <Ionicons name="sparkles" size={13} color={colors.onColor} />
              </View>
              <View style={[styles.bubble, styles.bubbleBoni, styles.thinking, shadow.soft]}>
                <ActivityIndicator size="small" color={colors.muted} />
                <Text variant="caption" tone="muted">
                  {t('boni.thinking')}
                </Text>
              </View>
            </View>
          )}

          <View style={styles.disclaimer}>
            <Ionicons name="information-circle-outline" size={13} color={colors.muted} />
            <Text variant="caption" tone="muted" style={styles.flex}>
              {t('boni.disclaimer')}
            </Text>
          </View>
        </ScrollView>

        {/* Girdi */}
        <View style={styles.inputBar}>
          {empty ? (
            <View style={styles.emptyNote}>
              <Ionicons name="time-outline" size={15} color={colors.muted} />
              <Text variant="caption" tone="muted" style={styles.flex}>
                {t('boni.quota.empty')}
              </Text>
            </View>
          ) : (
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                value={input}
                onChangeText={setInput}
                placeholder={t('boni.placeholder')}
                placeholderTextColor={colors.muted}
                multiline
                editable={!sending}
                onSubmitEditing={send}
              />
              <Pressable
                onPress={send}
                disabled={!input.trim() || sending}
                style={[styles.sendBtn, (!input.trim() || sending) && styles.sendBtnOff]}
              >
                <Ionicons name="arrow-up" size={20} color={colors.onAccent} />
              </Pressable>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    flex: { flex: 1 },
    content: { paddingHorizontal: space(3), paddingBottom: space(3), gap: space(1.5) },
    dim: { opacity: 0.9 },

    hero: { borderRadius: radius.xl, padding: space(2.5), gap: space(1.5) },
    heroTop: { flexDirection: 'row', alignItems: 'center', gap: space(1.5) },
    avatar: {
      width: 44,
      height: 44,
      borderRadius: radius.md,
      backgroundColor: 'rgba(255,255,255,0.22)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    heroIntro: { opacity: 0.95 },
    quotaPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      alignSelf: 'flex-start',
      backgroundColor: 'rgba(255,255,255,0.22)',
      paddingHorizontal: space(1.25),
      paddingVertical: 5,
      borderRadius: radius.pill,
    },
    quotaText: { fontWeight: '600' },

    bubbleRow: { flexDirection: 'row', alignItems: 'flex-end', gap: space(1), maxWidth: '100%' },
    rowLeft: { justifyContent: 'flex-start' },
    rowRight: { justifyContent: 'flex-end' },
    bubbleAvatar: {
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: colors.plum,
      alignItems: 'center',
      justifyContent: 'center',
    },
    bubble: { maxWidth: '82%', borderRadius: radius.lg, paddingHorizontal: space(1.75), paddingVertical: space(1.25) },
    bubbleUser: { backgroundColor: colors.accent, borderBottomRightRadius: 6 },
    bubbleBoni: {
      backgroundColor: colors.surface,
      borderBottomLeftRadius: 6,
    },
    thinking: { flexDirection: 'row', alignItems: 'center', gap: space(1) },

    disclaimer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1),
      marginTop: space(1.5),
      paddingHorizontal: space(0.5),
    },

    inputBar: {
      paddingHorizontal: space(3),
      paddingTop: space(1),
      paddingBottom: space(1.5),
      backgroundColor: colors.bg,
    },
    inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: space(1) },
    input: {
      flex: 1,
      maxHeight: 120,
      minHeight: 44,
      backgroundColor: colors.surfaceMuted,
      borderRadius: radius.lg,
      paddingHorizontal: space(1.75),
      paddingTop: space(1.25),
      paddingBottom: space(1.25),
      color: colors.ink,
      fontSize: 15,
    },
    sendBtn: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sendBtnOff: { backgroundColor: colors.surfaceMuted },
    emptyNote: { flexDirection: 'row', alignItems: 'center', gap: space(1), paddingVertical: space(1) },

    // Kilit ekranı
    lockWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space(4), gap: space(1.5) },
    lockIcon: {
      width: 76,
      height: 76,
      borderRadius: radius.xl,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: space(1),
    },
    lockTitle: { textAlign: 'center' },
    lockDesc: { textAlign: 'center' },
    lockCta: { alignSelf: 'stretch', marginTop: space(2) },
    demoLink: { textDecorationLine: 'underline', marginTop: space(1.5) },
  });
