import { useCallback, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ImageBackground, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { CirclePost, CirclePostType } from '../../src/data';

/**
 * Gönderinin yorum sayısı.
 *
 * `comments` dizisi yalnız yerel/tohum gönderilerde dolu; sunucudan gelenlerde
 * boş. Doğrudan `comments.length` okuyan ekranlar bu yüzden sunucudan gelen her
 * gönderide "0 yorum" gösteriyordu.
 */
const yorumSayisi = (p: CirclePost): number => p.commentCount ?? p.comments.length;
import { useLocale } from '../../src/locale';
import { useStore } from '../../src/store';
import type { MessageKey } from '@ayna/i18n';
import { radius, space, type ColorTokens, font } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import {
  ConsensusCard,
  PressableScale,
  Screen,
  TabHero,
  Text,
  TAB_BAR_CLEARANCE,
} from '../../src/ui';

const makeType = (
  colors: ColorTokens,
): Record<CirclePostType, { key: MessageKey; bg: string; fg: string }> => ({
  recommend: { key: 'circle.type.recommend', bg: colors.successSoft, fg: colors.success },
  asking: { key: 'circle.type.asking', bg: colors.goldSoft, fg: colors.gold },
  experience: { key: 'circle.type.experience', bg: colors.blueSoft, fg: colors.blue },
});

// §5.5 (MD satır 238) — SABİT W2W kategori şeridi (post'lardan türetilmez).
// Hizmet kategorileri post.category (TR etiket veya kod) ile; içerik türleri post.type ile eşlenir.
const W2W_FILTERS: { id: string; labelKey: MessageKey; match: (p: CirclePost) => boolean }[] = [
  { id: 'all', labelKey: 'circle.cat.all', match: () => true },
  {
    id: 'hair',
    labelKey: 'circle.cat.hair',
    match: (p) => p.category === 'Saç' || p.category === 'hair',
  },
  {
    id: 'skincare',
    labelKey: 'circle.cat.skincare',
    match: (p) => p.category === 'Cilt Bakımı' || p.category === 'skincare',
  },
  {
    id: 'makeup',
    labelKey: 'circle.cat.makeup',
    match: (p) => p.category === 'Makyaj' || p.category === 'makeup',
  },
  {
    id: 'nails',
    labelKey: 'circle.cat.nails',
    match: (p) => p.category === 'Tırnak' || p.category === 'nails',
  },
  { id: 'experience', labelKey: 'circle.cat.experience', match: (p) => p.type === 'experience' },
  { id: 'asking', labelKey: 'circle.cat.asking', match: (p) => p.type === 'asking' },
  { id: 'chat', labelKey: 'circle.cat.chat', match: (p) => p.type === 'recommend' },
];

export default function CircleScreen() {
  const { t } = useLocale();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const posts = useStore((s) => s.circlePosts);
  // §12.6 — admin blog (fetch başarısızsa seed) + haftalık W2W teması
  const articles = useStore((s) => s.articles);
  const weeklyTheme = useStore((s) => s.weeklyTheme);
  // §5.5 — uzman/salon W2W'de gönderi PAYLAŞAMAZ (yalnız okur + yorum yapar)
  const role = useStore((s) => s.currentUser?.role);
  const canPost = role !== 'professional' && role !== 'salon';
  const [cat, setCat] = useState<string>('all');
  // Kanvas (design/W2W.dc.html §sekmeler): Akış · Sorularım · Kaydedilenler.
  const [sekme, setSekme] = useState<'feed' | 'mine' | 'saved'>('feed');
  const myId = useStore((s) => s.currentUser?.id);

  // §5.5 — sabit kategori şeridi (W2W_FILTERS); seçili filtrenin match'iyle süz + faydalı üstte
  const benimMi = useCallback(
    (p: CirclePost) => (myId ? p.authorUserId === myId : p.author === 'Sen'),
    [myId],
  );

  const visible = useMemo(() => {
    const f = W2W_FILTERS.find((x) => x.id === cat) ?? W2W_FILTERS[0]!;
    const taban =
      sekme === 'mine'
        ? posts.filter(benimMi)
        : sekme === 'saved'
          ? posts.filter((p) => p.savedByMe)
          : posts;
    return taban.filter(f.match).sort((a, b) => b.helpful - a.helpful);
  }, [posts, cat, sekme, benimMi]);

  // Kanvas §açık soru: "Sorun cevap topladı" — kendi sorularından cevap almış
  // olanlar, altında FİKİR BİRLİĞİ ile. Sunucu kuralı zaten gerçek: bir uzmanı
  // ancak o uzmanda TAMAMLANMIŞ randevusu olan kadın sayabiliyor
  // (circle.service hasCompletedWith + proVerified).
  // Sayı YALNIZ kendi kayıtların — sunucu "kaç kişi kaydetti" diye bir sayı
  // hiç döndürmüyor (uzman kimin kaydettiğini göremez).
  const kayitliSayisi = useMemo(() => posts.filter((p) => p.savedByMe).length, [posts]);

  const cevapAlanSorularim = useMemo(
    () => posts.filter((p) => benimMi(p) && p.type === 'asking' && yorumSayisi(p) > 0).slice(0, 2),
    [posts, benimMi],
  );

  return (
    <Screen edges={[]}>
      <TabHero
        title={t('circle.title')}
        subtitle={t('circle.subtitle')}
        right={
          canPost ? (
            <Pressable style={styles.ask} onPress={() => router.push('/circle/new')}>
              <Ionicons name="add" size={16} color={colors.ink} />
              <Text
                variant="caption"
                tone="ink"
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.85}
              >
                {t('circle.ask')}
              </Text>
            </Pressable>
          ) : undefined
        }
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Kanvas §sekmeler — Akış · Sorularım */}
        <View style={styles.sekmeler}>
          {(['feed', 'mine', 'saved'] as const).map((k) => (
            <Pressable
              key={k}
              style={[styles.sekme, sekme === k && styles.sekmeOn]}
              onPress={() => setSekme(k)}
              accessibilityRole="tab"
              accessibilityState={{ selected: sekme === k }}
            >
              <Text
                variant="caption"
                tone={sekme === k ? 'onAccent' : 'inkSoft'}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.75}
              >
                {k === 'saved'
                  ? `${t('circle.tab.saved')}${kayitliSayisi ? ` · ${kayitliSayisi}` : ''}`
                  : t(k === 'feed' ? 'circle.tab.feed' : 'circle.tab.mine')}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Kanvas §açık soru + fikir birliği — kendi sorun cevap topladıysa */}
        {cevapAlanSorularim.length ? (
          <>
            <Text variant="label" tone="muted" style={styles.sectionTitle}>
              {t('circle.my_answered')}
            </Text>
            {cevapAlanSorularim.map((p) => (
              <PressableScale key={p.id} onPress={() => router.push(`/circle/${p.id}`)}>
                <View style={styles.answered}>
                  <Text variant="bodyStrong" tone="ink" numberOfLines={2}>
                    {p.text}
                  </Text>
                  <Text variant="caption" tone="muted">
                    {yorumSayisi(p)} {t('circle.comments')}
                  </Text>
                  <ConsensusCard postId={p.id} />
                </View>
              </PressableScale>
            ))}
          </>
        ) : null}

        {/* §12.6 — admin'in belirlediği haftalık W2W teması */}
        {weeklyTheme ? (
          <View style={styles.themeBanner}>
            <Ionicons name="sparkles" size={16} color={colors.ink} />
            <View style={styles.themeBody}>
              <Text variant="bodyStrong">{weeklyTheme.title}</Text>
              <Text variant="caption" tone="muted">
                {weeklyTheme.prompt}
              </Text>
            </View>
          </View>
        ) : null}

        {/* AYNA Life · Pratik Bilgiler — en başta */}
        <Text variant="label" tone="muted" style={styles.sectionTitle}>
          {t('circle.life_section')}
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.life}
        >
          {articles.map((a) => (
            <PressableScale key={a.id} onPress={() => router.push('/life/' + a.id)}>
              <ImageBackground
                source={{ uri: a.image }}
                style={styles.lifeCard}
                imageStyle={styles.lifeImage}
              >
                <LinearGradient
                  colors={['rgba(0,0,0,0.05)', 'rgba(0,0,0,0.82)']}
                  style={StyleSheet.absoluteFill}
                />
                <View style={styles.lifeTag}>
                  <Text variant="caption" tone="onAccent" style={styles.lifeTagText}>
                    {a.tag}
                  </Text>
                </View>
                <View style={styles.lifeBody}>
                  <Text variant="bodyStrong" tone="onColor" numberOfLines={2}>
                    {a.title}
                  </Text>
                  <Text variant="caption" tone="onColor" style={styles.lifeRead}>
                    {a.readMin} {t('life.read')}
                  </Text>
                </View>
              </ImageBackground>
            </PressableScale>
          ))}
        </ScrollView>
        {/*
          GİZLİLİK KARTI — yatay şeridin DIŞINDA.

          Bu kart yatay `ScrollView`ın içindeydi: tam genişlik bir blok,
          AYNA Life kartlarının YANINA diziliyordu. Şerit alabildiğine
          uzuyor, kart ekrana sığmıyor ve iki kenardan da taşıyordu —
          kurucunun "kayma var" dediği şey buydu.
        */}

        {/* Tavsiyeler başlığı + değerlendirme sıralaması */}
        <View style={styles.recHeader}>
          <Text variant="label" tone="muted">
            {t('circle.recommendations')}
          </Text>
          <View style={styles.sortLabel}>
            <Text variant="caption" tone="accentFg" style={styles.sortText}>
              {t('circle.sort_by_rating')}
            </Text>
            <Ionicons name="swap-vertical" size={14} color={colors.accentFg} />
          </View>
        </View>

        {/* Kategori çipleri */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipBar}
          contentContainerStyle={styles.chips}
        >
          {W2W_FILTERS.map((f) => {
            const on = f.id === cat;
            return (
              <Pressable
                key={f.id}
                onPress={() => setCat(f.id)}
                style={[styles.chip, on && styles.chipOn]}
              >
                <Text variant="caption" tone={on ? 'onAccent' : 'inkSoft'}>
                  {t(f.labelKey)}
                </Text>
              </Pressable>
            );
          })}
          {/* Kanvas §gizlilik şeridi — "buraya hiçbir şey kendiliğinden düşmez".
            Buradaki üç madde de KOD DOĞRULANDI, süs değil:
            1) circlePost.create tüm sunucuda TEK yerde ve yalnız kullanıcının
               kendi eylemiyle çağrılıyor — randevu/yorum akışa düşmüyor.
            2) Anonimde authorLabel 'AYNA Üyesi' ve authorUserId null; uzman
               kimliği çözemiyor (circle.service §5.5).
            3) Fikir birliğinde yalnız o uzmanda TAMAMLANMIŞ randevusu olan
               sayılıyor (hasCompletedWith + proVerified).
            Doğrulayamadığım maddeyi yazmıyorum: kanvasta "uzmanlar kimin
            kendilerini KAYDETTİĞİNİ göremez" var ama kaydetme özelliği yok. */}
        </ScrollView>

        <View style={styles.list}>
          {/* §4 — BOŞ DURUM. Bu sekmede hiç yoktu: filtre bir şey eşlemezse
              ya da kullanıcı henüz gönderi yazmamışsa ekranda BOMBOŞ bir
              alan kalıyordu. Denetim boş alanı yasaklıyor: içerik + tek net
              aksiyon olmalı. Mesaj sekmeye göre değişiyor — "kaydettiğin
              yok" ile "kimse paylaşmamış" aynı şey değil. */}
          {visible.length === 0 ? (
            <View style={styles.bosDurum}>
              <View style={styles.bosIkon}>
                <Ionicons name="chatbubbles-outline" size={28} color={colors.muted} />
              </View>
              <Text variant="bodyStrong" tone="ink" style={styles.bosBaslik}>
                {t(
                  sekme === 'mine'
                    ? 'circle.empty.mine'
                    : sekme === 'saved'
                      ? 'circle.empty.saved'
                      : 'circle.empty.feed',
                )}
              </Text>
              <Text variant="caption" tone="muted" style={styles.bosAlt}>
                {t('circle.empty.sub')}
              </Text>
              <PressableScale style={styles.bosCta} onPress={() => router.push('/circle/new')}>
                <Text variant="caption" tone="onAccent" style={styles.bosCtaText}>
                  {t('circle.ask')}
                </Text>
              </PressableScale>
            </View>
          ) : (
            visible.map((p) => <PostCard key={p.id} post={p} />)
          )}
        </View>
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
  const toggleFollow = useStore((s) => s.toggleFollow);
  const toggleSaved = useStore((s) => s.toggleSaved);
  const myId = useStore((s) => s.currentUser?.id);
  // §5.5 — kimlik öncelikli eşleşme: görünen ad hesap adından farklı olabilir
  const isFollowing = useStore((s) =>
    post.authorUserId
      ? s.followingIds.includes(post.authorUserId)
      : s.following.includes(post.author),
  );
  // §W2W — kendi gönderin: yazar 'Sen', takip butonu YOK (kendini takip edemezsin)
  const isMine = post.author === 'Sen' || (!!post.authorUserId && post.authorUserId === myId);
  const shownAuthor = post.anonymous
    ? t('circle.verified')
    : isMine
      ? t('circle.you')
      : post.author;
  const ty = makeType(colors)[post.type];
  return (
    <Pressable style={[styles.card, shadow.card]} onPress={() => router.push('/circle/' + post.id)}>
      <View style={styles.cardTop}>
        <View style={styles.author}>
          <View style={styles.avatar}>
            {post.anonymous ? (
              <Ionicons name="shield-checkmark" size={15} color={colors.accentFg} />
            ) : (
              <Text variant="caption" tone="accentFg">
                {shownAuthor.charAt(0)}
              </Text>
            )}
          </View>
          <View style={styles.flex}>
            <Text variant="caption" tone="ink" numberOfLines={1}>
              {shownAuthor}
            </Text>
            <Text variant="caption" tone="muted">
              {post.category}
            </Text>
          </View>
        </View>
        <View style={styles.topRight}>
          {/* §W2W — takip: anonim değil VE kendi gönderin değil */}
          {!post.anonymous && !isMine ? (
            <Pressable
              style={[styles.followBtn, isFollowing && styles.followBtnOn]}
              onPress={() => toggleFollow(post.author, post.authorUserId)}
              hitSlop={6}
            >
              {isFollowing ? (
                <Ionicons name="checkmark" size={13} color={colors.onAccent} />
              ) : (
                <Ionicons name="add" size={14} color={colors.accentFg} />
              )}
              {!isFollowing ? (
                <Text variant="caption" tone="accentFg" style={styles.followText}>
                  {t('circle.follow')}
                </Text>
              ) : null}
            </Pressable>
          ) : null}
          {/* Değerlendirme notu — sıralama bu değere göre */}
          <View style={styles.scorePill}>
            <Ionicons name="heart" size={12} color={colors.accentFg} />
            <Text variant="caption" tone="accentFg" style={styles.scoreText}>
              {post.helpful}
            </Text>
          </View>
        </View>
      </View>

      <Text variant="body" tone="inkSoft" style={styles.text}>
        {post.text}
      </Text>

      <View style={styles.footer}>
        <View style={[styles.typeBadge, { backgroundColor: ty.bg }]}>
          <Text variant="caption" style={[styles.typeText, { color: ty.fg }]}>
            {t(ty.key)}
          </Text>
        </View>
        <Pressable style={styles.footerItem} onPress={() => toggleHelpful(post.id)} hitSlop={8}>
          <Ionicons
            name={post.helpfulByMe ? 'heart' : 'heart-outline'}
            size={15}
            color={post.helpfulByMe ? colors.accent : colors.muted}
          />
          <Text variant="caption" tone={post.helpfulByMe ? 'accentFg' : 'muted'}>
            {t('circle.helpful')}
          </Text>
        </Pressable>
        <View style={styles.footerItem}>
          <Ionicons name="chatbubble-outline" size={14} color={colors.muted} />
          <Text variant="caption" tone="muted">
            {yorumSayisi(post)} {t('circle.comments')}
          </Text>
        </View>
        {/* §14 — kaydet. Kayıt SUNUCUDA tutulur ve YALNIZ sana aittir:
            gönderi sahibi de, önerilen uzman da kimin kaydettiğini göremez. */}
        <Pressable
          style={styles.footerItem}
          onPress={() => toggleSaved(post.id)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t(post.savedByMe ? 'circle.unsave' : 'circle.save')}
          accessibilityState={{ selected: post.savedByMe === true }}
        >
          <Ionicons
            name={post.savedByMe ? 'bookmark' : 'bookmark-outline'}
            size={14}
            color={post.savedByMe ? colors.accent : colors.muted}
          />
        </Pressable>
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
      marginBottom: space(1.5),
    },
    headerText: { flex: 1 },
    subtitle: { marginTop: 2 },
    ask: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: colors.surface,
      paddingHorizontal: space(1.5),
      paddingVertical: space(1),
      borderRadius: radius.pill,
    },
    scroll: { paddingTop: space(3), paddingBottom: TAB_BAR_CLEARANCE },
    sekmeler: { flexDirection: 'row', gap: space(1), marginBottom: space(1) },
    sekme: {
      paddingHorizontal: space(1.75),
      height: 38,
      borderRadius: radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      // Seçilmemiş sekme yüzey + ince çizgi; dolu gri seçili erik sekmenin
      // yanında ikinci bir "dolu" gibi okunuyordu.
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.line,
    },
    sekmeOn: { backgroundColor: colors.accent },
    answered: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: space(2),
      gap: space(1),
      marginBottom: space(1.5),
    },
    gizlilik: {
      // Yatay şeritten çıkınca kendi boşluğunu kendi vermeli: sayfanın
      // dış kabı yatay dolgu taşımıyor, her blok kendi ayarlıyor
      // (`sectionTitle`, `recHeader` de öyle).
      marginHorizontal: space(3),
      backgroundColor: colors.surfaceMuted,
      borderRadius: radius.lg,
      padding: space(2),
      gap: space(1),
      marginTop: space(2),
    },
    gizlilikHead: { flexDirection: 'row', alignItems: 'center', gap: space(1) },
    gizlilikRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space(1) },
    sectionTitle: { paddingHorizontal: space(3), marginBottom: space(1.5) },
    // §12.6 haftalık tema banner'ı
    themeBanner: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: space(1.5),
      marginHorizontal: space(3),
      marginBottom: space(2),
      padding: space(2),
      borderRadius: radius.lg,
      backgroundColor: colors.accentSoft,
    },
    themeBody: { flex: 1, gap: space(0.25) },
    // AYNA Life kartları
    life: { paddingHorizontal: space(3), gap: space(1.5), paddingBottom: space(0.5) },
    lifeCard: {
      width: 220,
      height: 150,
      borderRadius: radius.lg,
      overflow: 'hidden',
      justifyContent: 'flex-end',
    },
    lifeImage: { borderRadius: radius.lg },
    lifeTag: {
      position: 'absolute',
      top: space(1.5),
      left: space(1.5),
      backgroundColor: colors.accent,
      paddingHorizontal: space(1),
      paddingVertical: 3,
      borderRadius: radius.pill,
    },
    lifeTagText: { fontFamily: font.semibold },
    lifeBody: { padding: space(1.75) },
    lifeRead: { opacity: 0.9, marginTop: 2 },
    // Tavsiyeler başlık + sıralama
    recHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: space(3),
      marginTop: space(3),
      marginBottom: space(1),
    },
    sortLabel: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    sortText: { fontFamily: font.semibold },
    // Kategori çipleri
    chipBar: { flexGrow: 0, flexShrink: 0 },
    chips: { paddingHorizontal: space(3), gap: space(1), alignItems: 'center' },
    chip: {
      alignSelf: 'center',
      paddingHorizontal: space(1.75),
      paddingVertical: space(0.9),
      borderRadius: radius.pill,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.line,
    },
    chipOn: { backgroundColor: colors.accent, borderColor: colors.accent },
    list: { paddingHorizontal: space(3), paddingTop: space(1.5), gap: space(1.5) },
    bosDurum: { alignItems: 'center', paddingVertical: space(5), gap: space(1) },
    bosIkon: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: colors.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    bosBaslik: { textAlign: 'center' },
    bosAlt: { textAlign: 'center', maxWidth: 260 },
    bosCta: {
      marginTop: space(1),
      backgroundColor: colors.accent,
      borderRadius: radius.pill,
      paddingHorizontal: space(2.5),
      minHeight: 44,
      justifyContent: 'center',
    },
    bosCtaText: { fontFamily: font.semibold },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.line,
      padding: space(2),
    },
    cardTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: space(1),
    },
    author: { flexDirection: 'row', alignItems: 'center', gap: space(1), flexShrink: 1 },
    flex: { flex: 1, minWidth: 0 },
    topRight: { flexDirection: 'row', alignItems: 'center', gap: space(0.75) },
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
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: colors.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    scorePill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: colors.accentSoft,
      paddingHorizontal: space(1),
      paddingVertical: 4,
      borderRadius: radius.pill,
    },
    scoreText: { fontFamily: font.semibold },
    typeBadge: { paddingHorizontal: space(1.25), paddingVertical: 4, borderRadius: radius.pill },
    typeText: { fontSize: 11 },
    text: { marginTop: space(1.5) },
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(2),
      marginTop: space(1.5),
      paddingTop: space(1.5),
      borderTopWidth: 1,
      borderTopColor: colors.line,
    },
    footerItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  });
