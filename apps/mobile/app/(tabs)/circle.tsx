import { useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ImageBackground, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { type CirclePost, type CirclePostType, LIFE_ARTICLES } from '../../src/data';
import { useLocale } from '../../src/locale';
import { useStore } from '../../src/store';
import type { MessageKey } from '@ayna/i18n';
import { radius, space, type ColorTokens } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import { PressableScale, Screen, Text } from '../../src/ui';

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
  const [cat, setCat] = useState<string>('all');

  // Kategoriler gönderilerden türetilir (kullanıcı arttıkça otomatik genişler)
  const categories = useMemo(() => {
    const set = new Set(posts.map((p) => p.category));
    return ['all', ...Array.from(set)];
  }, [posts]);

  // Filtre + öncelik: değerlendirme notu (faydalı) en yüksek üstte
  const visible = useMemo(() => {
    const filtered = cat === 'all' ? posts : posts.filter((p) => p.category === cat);
    return [...filtered].sort((a, b) => b.helpful - a.helpful);
  }, [posts, cat]);

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

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* AYNA Life · Pratik Bilgiler — en başta */}
        <Text variant="h2" tone="ink" style={styles.sectionTitle}>
          {t('circle.life_section')}
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.life}
        >
          {LIFE_ARTICLES.map((a) => (
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
                  <Text variant="caption" tone="onColor" style={styles.lifeTagText}>
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

        {/* Tavsiyeler başlığı + değerlendirme sıralaması */}
        <View style={styles.recHeader}>
          <Text variant="h2" tone="ink">
            {t('circle.recommendations')}
          </Text>
          <View style={styles.sortLabel}>
            <Text variant="caption" tone="rose" style={styles.sortText}>
              {t('circle.sort_by_rating')}
            </Text>
            <Ionicons name="swap-vertical" size={14} color={colors.rose} />
          </View>
        </View>

        {/* Kategori çipleri */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipBar}
          contentContainerStyle={styles.chips}
        >
          {categories.map((c) => {
            const on = c === cat;
            return (
              <Pressable
                key={c}
                onPress={() => setCat(c)}
                style={[styles.chip, on && styles.chipOn]}
              >
                <Text variant="caption" tone={on ? 'onColor' : 'inkSoft'}>
                  {c === 'all' ? t('circle.all_categories') : c}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.list}>
          {visible.map((p) => (
            <PostCard key={p.id} post={p} />
          ))}
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
        {/* Değerlendirme notu — kart üstünde belirgin (sıralama bu değere göre) */}
        <View style={styles.scorePill}>
          <Ionicons name="heart" size={12} color={colors.rose} />
          <Text variant="caption" tone="rose" style={styles.scoreText}>
            {post.helpful}
          </Text>
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
          <Text variant="caption" tone={post.helpfulByMe ? 'rose' : 'muted'}>
            {t('circle.helpful')}
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
      marginBottom: space(1.5),
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
    scroll: { paddingBottom: space(13) },
    sectionTitle: { paddingHorizontal: space(3), marginBottom: space(1.5) },
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
    lifeTagText: { fontWeight: '600' },
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
    sortText: { fontWeight: '600' },
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
    chipOn: { backgroundColor: colors.rose, borderColor: colors.rose },
    list: { paddingHorizontal: space(3), paddingTop: space(1.5), gap: space(1.5) },
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
    scorePill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: colors.roseSoft,
      paddingHorizontal: space(1),
      paddingVertical: 4,
      borderRadius: radius.pill,
    },
    scoreText: { fontWeight: '700' },
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
