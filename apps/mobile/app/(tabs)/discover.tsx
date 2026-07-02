import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Dimensions, Image, ImageBackground, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CATEGORIES } from '../../src/data';
import { useAds, useCampaigns, useProfessionals } from '../../src/catalog';
import { useLocale } from '../../src/locale';
import { selectUnreadCount, useStore } from '../../src/store';
import { radius, space, type ColorTokens } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import { SalonRow, Screen, Text, WaveBottom } from '../../src/ui';

type IoniconName = keyof typeof Ionicons.glyphMap;

// Kategori ikon zeminleri: nazik pastel tint + renkli ikon
const makeCatColors = (colors: ColorTokens) => [
  { bg: colors.roseSoft, fg: colors.rose },
  { bg: colors.sageSoft, fg: colors.sage },
  { bg: colors.lavenderSoft, fg: colors.lavender },
  { bg: colors.goldSoft, fg: colors.gold },
  { bg: colors.blueSoft, fg: colors.blue },
];

const HERO_WOMAN =
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=500&q=75';
const AVATAR =
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=200&q=70';

const AD_WIDTH = Dimensions.get('window').width - space(6);

export default function DiscoverScreen() {
  const { t } = useLocale();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const CAT_COLORS = makeCatColors(colors);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const unread = useStore(selectUnreadCount);
  const campaigns = useCampaigns();
  const ads = useAds();
  const city = useStore((s) => s.currentUser?.city) ?? 'Almatı';
  const userName = useStore((s) => s.currentUser?.name)?.split(' ')[0] ?? 'Aigerim';
  const categories = CATEGORIES;
  const nearby = useProfessionals().slice(0, 6);

  return (
    <Screen edges={[]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* ── LIME HERO (referans: dalgalı kesim + gerçek foto) ── */}
        <View style={[styles.hero, { paddingTop: insets.top + space(1) }]}>
          <View style={styles.heroTop}>
            <Image source={require('../../assets/logo-mark.png')} style={styles.logo} resizeMode="contain" />
            <Pressable style={styles.locChip} onPress={() => router.push('/map')}>
              <Text variant="bodyStrong" tone="ink">
                {city}
              </Text>
              <Ionicons name="chevron-down" size={16} color={colors.ink} />
            </Pressable>
            <Pressable onPress={() => router.push('/profile')}>
              <Image source={{ uri: AVATAR }} style={styles.avatar} />
              {unread > 0 ? <View style={styles.badge} /> : null}
            </Pressable>
          </View>

          <View style={styles.searchRow}>
            <Pressable style={styles.search} onPress={() => router.push('/search')}>
              <Ionicons name="search" size={19} color={colors.muted} />
              <Text variant="body" tone="muted">
                {t('home.search')}
              </Text>
            </Pressable>
            <Pressable style={styles.mapChip} onPress={() => router.push('/map')}>
              <Ionicons name="map-outline" size={18} color={colors.ink} />
              <Text variant="caption" tone="ink" style={styles.mapChipText}>
                {t('home.map_mode')}
              </Text>
            </Pressable>
          </View>

          <View style={styles.heroBody}>
            <View style={styles.heroText}>
              <Text variant="display" tone="ink" style={styles.heroTitle}>
                {t('home.greeting')}
              </Text>
              <Text variant="display" tone="ink" style={styles.heroName}>
                {userName}
              </Text>
              <Text variant="caption" tone="inkSoft" style={styles.heroSub}>
                {t('home.hero_subtitle')}
              </Text>
            </View>
            <Image source={{ uri: HERO_WOMAN }} style={styles.heroPhoto} />
          </View>

          <WaveBottom color={colors.bg} />
        </View>

        {/* ── 3 AKSİYON KARTI ── */}
        <View style={styles.actions}>
          <ActionTile
            bg={colors.lavenderSoft}
            fg={colors.lavender}
            icon="camera-outline"
            title={t('action.photo_quote.title')}
            onPress={() => router.push('/quote/new')}
          />
          <ActionTile
            bg={colors.goldSoft}
            fg={colors.gold}
            icon="sparkles-outline"
            title={t('home.how')}
            onPress={() => router.push('/quote')}
          />
          <ActionTile
            bg={colors.roseSoft}
            fg={colors.rose}
            icon="add-circle-outline"
            title={t('action.demand.title')}
            onPress={() => router.push('/demand/new')}
          />
        </View>

        {/* ── KATEGORİLER (yuvarlak) ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.catRow}
        >
          {categories.map((cat, i) => {
            const c = CAT_COLORS[i % CAT_COLORS.length]!;
            return (
              <Pressable key={cat.id} style={styles.cat} onPress={() => router.push('/category/' + cat.id)}>
                <View style={[styles.catTile, { backgroundColor: c.bg }]}>
                  <Ionicons name={cat.icon as IoniconName} size={26} color={c.fg} />
                </View>
                <Text variant="caption" tone="inkSoft" style={styles.catLabel} numberOfLines={1}>
                  {t(cat.labelKey)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* ── FIRSATLAR ── */}
        <SectionHeader title={t('home.campaigns')} onSeeAll={() => router.push('/search')} />
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.promoRow}
          snapToInterval={AD_WIDTH + space(1.5)}
          decelerationRate="fast"
        >
          {campaigns.map((c) => (
            <Pressable
              key={c.id}
              style={[styles.promo, { width: AD_WIDTH }]}
              onPress={() => router.push(c.category ? '/category/' + c.category : '/search')}
            >
              <View style={styles.promoLeft}>
                {c.badge ? (
                  <View style={styles.promoBadge}>
                    <Text variant="caption" tone="onAccent" style={styles.promoBadgeText}>
                      {c.badge}
                    </Text>
                  </View>
                ) : null}
                <Text variant="bodyStrong" tone="ink" style={styles.promoTitle} numberOfLines={2}>
                  {c.title}
                </Text>
                <Text variant="caption" tone="muted" numberOfLines={1}>
                  {c.subtitle}
                </Text>
              </View>
              <Image source={{ uri: c.image }} style={styles.promoImg} />
            </Pressable>
          ))}
        </ScrollView>

        {/* ── ÖNE ÇIKANLAR (sponsorlu) ── */}
        <SectionHeader title={t('home.featured')} onSeeAll={() => router.push('/search')} />
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.ads}
          snapToInterval={AD_WIDTH + space(1.5)}
          decelerationRate="fast"
        >
          {ads.map((ad) => (
            <Pressable
              key={ad.id}
              style={{ width: AD_WIDTH }}
              onPress={() => router.push('/professional/' + ad.proId)}
            >
              <ImageBackground
                source={{ uri: ad.image }}
                style={[styles.adCard, { width: AD_WIDTH }]}
                imageStyle={styles.adImage}
              >
                <LinearGradient
                  colors={['rgba(0,0,0,0.05)', 'rgba(0,0,0,0.82)']}
                  style={StyleSheet.absoluteFill}
                />
                <View style={styles.adBadge}>
                  <Ionicons name="star" size={11} color={colors.onColor} />
                  <Text variant="caption" tone="onColor" style={styles.adBadgeText}>
                    {t('home.ad_badge')}
                  </Text>
                </View>
                <View style={styles.adText}>
                  <Text variant="h2" tone="onColor">
                    {ad.title}
                  </Text>
                  <Text variant="caption" tone="onColor" style={styles.adSubtitle}>
                    {ad.subtitle}
                  </Text>
                </View>
              </ImageBackground>
            </Pressable>
          ))}
        </ScrollView>

        {/* ── YAKINDAKİ SALONLAR (yatay kart listesi) ── */}
        <SectionHeader title={t('home.nearby')} onSeeAll={() => router.push('/search')} />
        <View style={styles.nearby}>
          {nearby.map((pro, i) => (
            <SalonRow key={pro.id} pro={pro} index={i} />
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}

function SectionHeader({ title, onSeeAll }: { title: string; onSeeAll?: () => void }) {
  const { t } = useLocale();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.sectionHeader}>
      <Text variant="h2" tone="ink" style={styles.sectionTitle}>
        {title}
      </Text>
      {onSeeAll ? (
        <Pressable onPress={onSeeAll} style={styles.seeAll}>
          <Text variant="caption" tone="muted">
            {t('common.see_all')}
          </Text>
          <Ionicons name="chevron-forward" size={14} color={colors.muted} />
        </Pressable>
      ) : null}
    </View>
  );
}

function ActionTile({
  bg,
  fg,
  icon,
  title,
  onPress,
}: {
  bg: string;
  fg: string;
  icon: IoniconName;
  title: string;
  onPress: () => void;
}) {
  const styles = useThemedStyles(makeStyles);
  return (
    <Pressable style={[styles.action, { backgroundColor: bg }]} onPress={onPress}>
      <View style={styles.actionIcon}>
        <Ionicons name={icon} size={22} color={fg} />
      </View>
      <Text variant="caption" tone="ink" style={styles.actionTitle}>
        {title}
      </Text>
    </Pressable>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    content: { paddingBottom: space(13) },

    // ── Lime hero ──
    hero: {
      backgroundColor: colors.accent,
      paddingHorizontal: space(3),
    },
    heroTop: { flexDirection: 'row', alignItems: 'center', gap: space(1.5) },
    logo: { width: 74, height: 38 },
    locChip: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
    },
    avatar: {
      width: 46,
      height: 46,
      borderRadius: 23,
      borderWidth: 2,
      borderColor: 'rgba(255,255,255,0.7)',
      backgroundColor: colors.bgSunken,
    },
    badge: {
      position: 'absolute',
      top: 0,
      right: 0,
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: colors.rose,
      borderWidth: 2,
      borderColor: colors.accent,
    },
    searchRow: { flexDirection: 'row', alignItems: 'center', gap: space(1.25), marginTop: space(2) },
    search: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1),
      height: 50,
      borderRadius: radius.pill,
      backgroundColor: colors.surface,
      paddingHorizontal: space(2),
    },
    mapChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      height: 50,
      borderRadius: radius.pill,
      paddingHorizontal: space(2),
      borderWidth: 1.5,
      borderColor: 'rgba(32,36,15,0.35)',
    },
    mapChipText: { fontWeight: '700' },
    heroBody: { flexDirection: 'row', alignItems: 'flex-end', marginTop: space(2), minHeight: 150 },
    heroText: { flex: 1, paddingBottom: space(2), paddingTop: space(1) },
    heroTitle: { fontSize: 34, lineHeight: 38, fontWeight: '800', letterSpacing: -0.8 },
    heroName: { fontSize: 34, lineHeight: 38, fontWeight: '800', letterSpacing: -0.8 },
    heroSub: { marginTop: space(1), maxWidth: 220 },
    heroPhoto: {
      width: 160,
      height: 200,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.md,
      marginRight: -space(1.5),
      backgroundColor: 'rgba(255,255,255,0.25)',
    },

    // ── Aksiyon kartları ──
    actions: { flexDirection: 'row', gap: space(1.25), paddingHorizontal: space(3), marginTop: space(1) },
    action: {
      flex: 1,
      borderRadius: radius.lg,
      paddingVertical: space(2),
      paddingHorizontal: space(1.5),
      alignItems: 'center',
      gap: space(1),
      minHeight: 110,
      justifyContent: 'center',
    },
    actionIcon: {
      width: 46,
      height: 46,
      borderRadius: 23,
      backgroundColor: 'rgba(255,255,255,0.65)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    actionTitle: { textAlign: 'center', fontWeight: '700', lineHeight: 17 },

    // ── Kategoriler ──
    catRow: { paddingHorizontal: space(3), gap: space(2), paddingTop: space(3.5) },
    cat: { alignItems: 'center', width: 66 },
    catTile: {
      width: 62,
      height: 62,
      borderRadius: 31,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: space(0.75),
    },
    catLabel: { textAlign: 'center' },

    // ── Bölüm başlığı ──
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: space(3),
      marginTop: space(3.5),
      marginBottom: space(1.75),
    },
    sectionTitle: { fontSize: 20, fontWeight: '800', letterSpacing: -0.4 },
    seeAll: { flexDirection: 'row', alignItems: 'center', gap: 2 },

    // ── Fırsatlar ──
    promoRow: { paddingHorizontal: space(3), gap: space(1.5) },
    promo: {
      height: 148,
      flexDirection: 'row',
      borderRadius: radius.xl,
      backgroundColor: colors.lavenderSoft,
      overflow: 'hidden',
    },
    promoLeft: { flex: 1, padding: space(2.25), justifyContent: 'center' },
    promoImg: { width: 128, height: '100%', backgroundColor: colors.bgSunken },
    promoBadge: {
      alignSelf: 'flex-start',
      backgroundColor: colors.accent,
      paddingHorizontal: space(1.25),
      paddingVertical: 4,
      borderRadius: radius.pill,
      marginBottom: space(1),
    },
    promoBadgeText: { fontWeight: '800' },
    promoTitle: { fontSize: 17, fontWeight: '800', letterSpacing: -0.2, marginBottom: 2 },

    // ── Öne çıkanlar (sponsorlu) ──
    ads: { paddingHorizontal: space(3), gap: space(1.5) },
    adCard: { height: 160, borderRadius: radius.xl, overflow: 'hidden', justifyContent: 'flex-end' },
    adImage: { borderRadius: radius.xl },
    adBadge: {
      position: 'absolute',
      top: space(1.5),
      left: space(1.5),
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: colors.rose,
      paddingHorizontal: space(1),
      paddingVertical: 4,
      borderRadius: radius.pill,
    },
    adBadgeText: { fontWeight: '600' },
    adText: { padding: space(2) },
    adSubtitle: { opacity: 0.9, marginTop: 2 },

    // ── Yakındaki salonlar ──
    nearby: { paddingHorizontal: space(3), gap: space(1.5) },
  });
