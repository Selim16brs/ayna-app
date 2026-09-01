import { useCallback, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useKeyboardShown } from '../../src/keyboard';
import { useLocale } from '../../src/locale';
import { api, type CircleCommentRow } from '../../src/api';
import { useStore } from '../../src/store';
import type { MessageKey } from '@ayna/i18n';
import { radius, space, type ColorTokens, font } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import { ConsensusCard, Screen, SectionHeader, StackHeader, Text, TextInput } from '../../src/ui';

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
  const klavyeAcik = useKeyboardShown();
  const insets = useSafeAreaInsets();
  const post = useStore((s) => s.circlePosts.find((p) => p.id === id));
  const toggleHelpful = useStore((s) => s.toggleHelpful);
  const addComment = useStore((s) => s.addComment);
  const reportPost = useStore((s) => s.reportPost);
  const reported = useStore((s) => s.reportedPosts.includes(id ?? ''));
  const following = useStore((s) => s.following);
  const toggleFollow = useStore((s) => s.toggleFollow);
  const followingIds = useStore((s) => s.followingIds);
  const myId = useStore((s) => s.currentUser?.id);
  const [draft, setDraft] = useState('');
  // §15 — Öneri seçicide YALNIZ gerçekten gidilmiş uzmanlar var. Böylece
  // sunucudaki doğrulama yapısı gereği tutuyor ve kural kullanıcıya
  // seçenekleri üzerinden öğretilmiş oluyor: gitmediğini öneremezsin.
  // ÇÖKME SEBEBİ: bu seçici her çağrıda YENİ DİZİ döndürüyordu. Zustand
  // useSyncExternalStore kullanıyor; referans her okumada değişince React
  // "getSnapshot should be cached" sonsuz döngüsüne giriyor ve ekran açılır
  // açılmaz uygulama kapanıyordu.
  //
  // Kural (discover.tsx'te de yazılı): seçici HAM veriyi seçer, türetme
  // useMemo ile yapılır.
  const bookings = useStore((st) => st.bookings);
  const visitedPros = useMemo(() => {
    const seen = new Map<string, string>();
    for (const b of bookings) {
      if (b.status === 'tamamlandi' && b.proId) seen.set(b.proId, b.uzmanName ?? b.proName);
    }
    return [...seen.entries()].map(([proId, name]) => ({ id: proId, name }));
  }, [bookings]);
  const router = useRouter();
  const [suggestPro, setSuggestPro] = useState<string | null>(null);
  // Yorumlar SUNUCUDAN okunuyor. Daha önce yalnız yerel kopya gösteriliyordu:
  // A kullanıcısı yazıyor, B sayacın arttığını görüyor ama yorumu okuyamıyordu.
  // (Okuma ucu PR #18 ile eklendi.)
  const [remote, setRemote] = useState<CircleCommentRow[] | null>(null);
  const loadComments = useCallback(() => {
    if (!id) return;
    void api
      .circleComments(id)
      .then(setRemote)
      .catch(() => undefined);
  }, [id]);
  useFocusEffect(loadComments);
  // Sunucu listesi geldiyse ONU göster (herkesin yorumu). Gelmediyse yerel
  // kopyaya düş — çevrimdışıyken ekran boş kalmasın.
  const shownComments: CircleCommentRow[] =
    remote ??
    (post?.comments ?? []).map((c) => ({
      id: c.id,
      authorLabel: c.anonymous ? t('circle.verified') : c.author,
      text: c.text,
      proId: null,
      proName: null,
      proVerified: false,
      createdAt: '',
    }));

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
  // §5.5 — KİMLİK ÖNCELİKLİ eşleşme. Burada yalnız ADA bakılıyordu: takip
  // edilen kişinin gönderisinde düğme "Takip Et" olarak duruyordu, çünkü
  // gönderideki görünen ad hesap adıyla birebir aynı olmak zorunda değil.
  // Liste ekranı (tabs)/circle.tsx zaten doğru eşleştiriyordu — aynı kalıp.
  const isFollowing = post.authorUserId
    ? followingIds.includes(post.authorUserId)
    : following.includes(post.author);
  // Kendi gönderinde takip düğmesi ÇIKMAMALI — kendini takip edemezsin.
  const isMine = post.author === 'Sen' || (!!post.authorUserId && post.authorUserId === myId);

  const send = () => {
    if (draft.trim().length === 0) return;
    addComment(post.id, draft.trim(), false, suggestPro ?? undefined);
    setDraft('');
    setSuggestPro(null);
    // Sunucu doğrulamayı (proVerified) yazma anında yapıyor; listeyi tazeleyip
    // gerçek sonucu gösteriyoruz — yerel tahmin uydurmuyoruz.
    setTimeout(loadComments, 600);
  };

  return (
    <Screen edges={[]}>
      <StackHeader title={t('circle.detail.title')} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        // Sabit 90 yanlıştı: bu değer klavyenin ÜSTÜNE fazladan 90pt boşluk
        // ekliyor, yazma alanını havada bırakıyordu. KeyboardAvoidingView
        // başlığın altından ekran altına kadar uzandığı için doğru değer 0.
        keyboardVerticalOffset={0}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
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
                <View style={styles.authorText}>
                  <Text variant="bodyStrong" tone="ink" style={styles.authorName} numberOfLines={1}>
                    {post.anonymous ? t('circle.verified') : post.author}
                  </Text>
                  <Text variant="caption" tone="muted" numberOfLines={1}>
                    {post.category}
                  </Text>
                </View>
              </View>
              {/* Düğmeler SAĞA YASLI İKİ SIRA.
                  Hepsi yazar adıyla aynı satırdaydı; Rusça etiketler
                  ("Вы подписаны", "Мой опыт") Türkçeden çok daha uzun olduğu
                  için adın üstüne biniyorlardı. Satır genişliği dile göre
                  değişir, o yüzden yan yana DİZMEK yerine alt alta koyuyoruz. */}
              <View style={styles.actionsCol}>
                <View style={[styles.typeBadge, { backgroundColor: ty.bg }]}>
                  <Text variant="caption" style={[styles.typeText, { color: ty.fg }]}>
                    {t(ty.key)}
                  </Text>
                </View>
                {/* §W2W — kişiyi takip et (anonim hariç) */}
                {!post.anonymous && !isMine ? (
                  <Pressable
                    style={[styles.followBtn, isFollowing && styles.followBtnOn]}
                    onPress={() => toggleFollow(post.author, post.authorUserId)}
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
                      numberOfLines={1}
                    >
                      {isFollowing ? t('circle.following') : t('circle.follow')}
                    </Text>
                  </Pressable>
                ) : null}
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

          {/* §14 — yedi yorumu okumak yerine "kimi kaç kişi önerdi" tek kartta */}
          {id ? <ConsensusCard postId={id} /> : null}

          {shownComments.length === 0 ? (
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
              {shownComments.map((c) => (
                <View key={c.id} style={[styles.comment, shadow.soft]}>
                  <View style={styles.commentAvatar}>
                    <Ionicons name="shield-checkmark" size={14} color={colors.accentFg} />
                  </View>
                  <View style={styles.commentBody}>
                    <View style={styles.commentHead}>
                      <Text variant="caption" tone="ink" style={styles.commentAuthor}>
                        {c.authorLabel}
                      </Text>
                      {/* §15 — öneri DOĞRULANMIŞSA rozet: öneren o uzmanda gerçekten
                          hizmet almış. Doğrulanmamış öneri rozetsiz kalır ve fikir
                          birliği sayımına da girmez. */}
                      {c.proVerified ? (
                        <View style={styles.verifiedTag}>
                          <Ionicons name="checkmark-circle" size={11} color={colors.success} />
                          <Text variant="micro" style={{ color: colors.success }}>
                            {t('circle.suggest.verified')}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                    <Text variant="body" tone="inkSoft" style={styles.commentText}>
                      {c.text}
                    </Text>
                    {/* ÖNERİLEN UZMAN. Yorumda yalnız "gitmiş" rozeti vardı;
                        KİMİN önerildiği hiç çizilmiyordu — kullanıcı uzman
                        seçip yorumu yolluyor, okuyana hiçbir uzman bilgisi
                        ulaşmıyordu. Artık adıyla ve profiline gidilebilir. */}
                    {c.proId ? (
                      <Pressable
                        style={styles.suggestedPro}
                        onPress={() => router.push(`/professional/${c.proId}`)}
                        accessibilityRole="button"
                        accessibilityLabel={c.proName ?? t('circle.suggest.label')}
                      >
                        <Ionicons name="sparkles" size={12} color={colors.accentFg} />
                        <Text variant="caption" tone="accentFg" numberOfLines={1}>
                          {c.proName ?? t('circle.suggest.label')}
                        </Text>
                        <Ionicons name="chevron-forward" size={12} color={colors.accentFg} />
                      </Pressable>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>

        {/* §15 — ÖNERİ SEÇİCİ: yalnız gidilmiş uzmanlar. Hiç randevusu
            tamamlanmamış kullanıcıya sebebi yazılıyor, boş şerit gösterilmiyor. */}
        {visitedPros.length > 0 ? (
          <View style={styles.suggestRow}>
            <Text variant="micro" tone="muted">
              {t('circle.suggest.title')}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.suggestChips}>
                {visitedPros.map((p) => {
                  const on = suggestPro === p.id;
                  return (
                    <Pressable
                      key={p.id}
                      onPress={() => setSuggestPro(on ? null : p.id)}
                      style={[styles.suggestChip, on && styles.suggestChipOn]}
                    >
                      {on ? <Ionicons name="checkmark" size={13} color={colors.onAccent} /> : null}
                      <Text variant="caption" tone={on ? 'onAccent' : 'inkSoft'} numberOfLines={1}>
                        {p.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        ) : null}

        {/* Yorum yaz */}
        <View
          style={[
            styles.composer,
            { paddingBottom: klavyeAcik ? space(1.5) : insets.bottom + space(1) },
          ]}
        >
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
      // İki sıralı düğme sütunu yazar satırından uzun olabilir; üstten hizala.
      alignItems: 'flex-start',
      gap: space(1),
    },
    // Sağa yaslı, alt alta: sıra genişliği dile göre değişse de taşmaz.
    actionsCol: { alignItems: 'flex-end', gap: space(0.75), flexShrink: 0 },
    authorText: { flexShrink: 1, minWidth: 0 },
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
    followText: { fontFamily: font.semibold },
    avatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    authorName: { fontFamily: font.semibold, letterSpacing: -0.2 },
    typeBadge: { paddingHorizontal: space(1.5), paddingVertical: 6, borderRadius: radius.pill },
    typeText: { fontSize: 12, fontFamily: font.semibold },
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
    helpfulText: { fontFamily: font.semibold },
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
    commentHead: { flexDirection: 'row', alignItems: 'center', gap: space(0.75), flexWrap: 'wrap' },
    verifiedTag: { flexDirection: 'row', alignItems: 'center', gap: 3 },
    commentAuthor: { fontFamily: font.semibold },
    suggestedPro: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      alignSelf: 'flex-start',
      marginTop: space(0.75),
      paddingHorizontal: space(1.25),
      paddingVertical: space(0.625),
      borderRadius: radius.pill,
      backgroundColor: colors.accentSoft,
    },
    commentText: { marginTop: 3, lineHeight: 22 },
    suggestRow: { paddingHorizontal: space(3), paddingTop: space(1), gap: space(0.75) },
    suggestChips: { flexDirection: 'row', gap: space(0.75) },
    suggestChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      maxWidth: 180,
      paddingHorizontal: space(1.25),
      paddingVertical: space(0.75),
      borderRadius: radius.pill,
      backgroundColor: colors.surfaceMuted,
    },
    suggestChipOn: { backgroundColor: colors.accent },
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
