import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Dimensions, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { MessageKey } from '@ayna/i18n';
import { formatPrice } from '../../src/data';
import { useCampaigns, useProfessionals } from '../../src/catalog';
import { useLocale } from '../../src/locale';
import { useStore } from '../../src/store';
import { radius, space, type ColorTokens } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import { SalonRow, Screen, Text, WaveBottom } from '../../src/ui';

type IoniconName = keyof typeof Ionicons.glyphMap;

// Kategori daire zeminleri (spec §0.1) — pastel + ink ikon
const INK = '#1A1A1A';
const HOT_PINK = '#FF2E93'; // "Ne yapmak istersin?" kartı — çırtlak pembe
const CAT_TINTS = ['#F6D9E4', '#E5EFC4', '#F7C9DA', '#F8DFC2', '#D9D6F0', '#E9E5DC'];
// Fırsat / öne çıkan kart zeminleri (spec §0.1)
const CARD_TINTS = ['#E4DEF4', '#F7DCE6', '#F6E4CE', '#E8F1C4'];

const HERO_WOMAN =
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=500&q=80';

// 2 sütun ızgara kart genişliği (referans Fırsatlar/Öne çıkanlar)
const GRID_W = (Dimensions.get('window').width - space(6) - space(1.5)) / 2;

// Ana sayfa kategori seti (referans: Saç · Cilt · Nail · Makyaj · Spa · Diğer)
const HOME_CATS: { key: MessageKey; route: string; icon: IoniconName }[] = [
  { key: 'home.cat.hair', route: '/category/hair', icon: 'cut-outline' },
  { key: 'home.cat.skin', route: '/category/skincare', icon: 'happy-outline' },
  { key: 'home.cat.nail', route: '/category/nails', icon: 'color-palette-outline' },
  { key: 'home.cat.makeup', route: '/category/makeup', icon: 'brush-outline' },
  { key: 'home.cat.spa', route: '/category/spa', icon: 'flower-outline' },
  { key: 'home.cat.other', route: '/search', icon: 'ellipsis-horizontal' },
];

export default function DiscoverScreen() {
  const { t } = useLocale();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const campaigns = useCampaigns();
  const city = useStore((s) => s.currentUser?.city) ?? 'Almatı';
  const userName = useStore((s) => s.currentUser?.name)?.split(' ')[0] ?? 'Aigerim';
  const pros = useProfessionals();
  const featured = pros.slice(0, 4);
  const nearby = pros.slice(4, 9);

  return (
    <Screen edges={[]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* ── LIME HERO (referans: dalgalı kesim + gerçek foto) ── */}
        <View style={[styles.hero, { paddingTop: insets.top + space(1) }]}>
          <View style={styles.heroTop}>
            <Image source={require('../../assets/logo-mark.png')} style={styles.logo} resizeMode="contain" />
            <Pressable style={styles.locChip} onPress={() => router.push('/city')}>
              <Ionicons name="location" size={16} color={colors.ink} />
              <Text variant="bodyStrong" tone="ink">
                {city}
              </Text>
              <Ionicons name="chevron-down" size={16} color={colors.ink} />
            </Pressable>
          </View>

          <View style={styles.searchRow}>
            <Pressable style={styles.search} onPress={() => router.push('/search')}>
              <Ionicons name="search" size={19} color={colors.muted} />
              <Text variant="body" tone="muted" numberOfLines={1} style={styles.searchText}>
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
        </View>
        {/* Lime hero'nun dalgalı alt kenarı + siyah kontur (referans) */}
        <WaveBottom color={colors.accent} stroke={INK} strokeWidth={3.5} />

        {/* ── TEK AKSİYON: Ne yapmak istersin? (çırtlak pembe) → hub ── */}
        <Pressable style={styles.howCard} onPress={() => router.push('/quote')}>
          <View style={styles.howIcon}>
            <Ionicons name="sparkles" size={22} color={HOT_PINK} />
          </View>
          <View style={styles.howText}>
            <Text variant="h2" tone="onColor" style={styles.howTitle}>
              {t('home.how')}
            </Text>
            <Text variant="caption" tone="onColor" style={styles.howSub} numberOfLines={1}>
              {t('home.how_sub')}
            </Text>
          </View>
          <Ionicons name="arrow-forward" size={20} color={colors.onColor} />
        </Pressable>

        {/* ── KATEGORİLER (yuvarlak, sabit 6) ── */}
        <View style={styles.catRow}>
          {HOME_CATS.map((cat, i) => {
            const bg = CAT_TINTS[i % CAT_TINTS.length]!;
            return (
              <Pressable key={cat.key} style={styles.cat} onPress={() => router.push(cat.route as never)}>
                <View style={[styles.catTile, { backgroundColor: bg }]}>
                  <Ionicons name={cat.icon} size={25} color={INK} />
                </View>
                <Text variant="caption" tone="inkSoft" style={styles.catLabel} numberOfLines={1}>
                  {t(cat.key)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* ── FIRSATLAR (2 sütun ızgara) ── */}
        <SectionHeader title={t('home.campaigns')} onSeeAll={() => router.push('/search')} />
        <View style={styles.grid}>
          {campaigns.map((c, i) => (
            <PromoCard
              key={c.id}
              title={c.title}
              highlight={c.badge}
              subtitle={c.subtitle}
              image={c.image}
              bg={CARD_TINTS[i % CARD_TINTS.length]!}
              onPress={() => router.push(c.category ? '/category/' + c.category : '/search')}
            />
          ))}
        </View>

        {/* ── ÖNE ÇIKANLAR (2 sütun ızgara) ── */}
        <SectionHeader title={t('home.featured')} onSeeAll={() => router.push('/search')} />
        <View style={styles.grid}>
          {featured.map((pro, i) => (
            <PromoCard
              key={pro.id}
              title={pro.name}
              highlight={formatPrice(pro.priceFrom)}
              subtitle={pro.specialty}
              image={pro.image}
              bg={CARD_TINTS[(i + 2) % CARD_TINTS.length]!}
              onPress={() => router.push('/professional/' + pro.id)}
            />
          ))}
        </View>

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

function PromoCard({
  title,
  highlight,
  subtitle,
  image,
  bg,
  onPress,
}: {
  title: string;
  highlight: string;
  subtitle: string;
  image: string;
  bg: string;
  onPress: () => void;
}) {
  const styles = useThemedStyles(makeStyles);
  return (
    <Pressable style={[styles.promoCard, { backgroundColor: bg }]} onPress={onPress}>
      <View style={styles.promoCardLeft}>
        <Text style={styles.promoCardTitle} numberOfLines={2}>
          {title}
        </Text>
        <Text style={styles.promoHighlight} numberOfLines={1}>
          {highlight}
        </Text>
        <Text style={styles.promoCardSub} numberOfLines={2}>
          {subtitle}
        </Text>
      </View>
      <Image source={{ uri: image }} style={styles.promoCardImg} />
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
    logo: { width: 116, height: 56 },
    locChip: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
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
    searchText: { flex: 1 },
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
    heroBody: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      marginTop: space(2),
      minHeight: 150,
      zIndex: 2,
    },
    heroText: { flex: 1, paddingBottom: space(2.5), paddingTop: space(1) },
    heroTitle: { fontSize: 34, lineHeight: 38, fontWeight: '800', letterSpacing: -0.8 },
    heroName: { fontSize: 34, lineHeight: 38, fontWeight: '800', letterSpacing: -0.8 },
    heroSub: { marginTop: space(1), maxWidth: 220 },
    heroPhoto: {
      width: 172,
      height: 214,
      // Organik blob kesim + sağ kenara taşar, dalgaya doğru sarkar (referans cut-out yaklaşımı)
      borderTopLeftRadius: 120,
      borderTopRightRadius: 90,
      borderBottomRightRadius: 130,
      borderBottomLeftRadius: 80,
      marginRight: -space(3),
      marginBottom: -space(2.5),
      backgroundColor: 'rgba(255,255,255,0.3)',
    },

    // ── Tek aksiyon kartı: "Ne yapmak istersin?" (çırtlak pembe) ──
    howCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1.5),
      marginHorizontal: space(3),
      marginTop: space(1),
      paddingVertical: space(2),
      paddingHorizontal: space(2),
      borderRadius: radius.lg,
      backgroundColor: HOT_PINK,
    },
    howIcon: {
      width: 46,
      height: 46,
      borderRadius: 23,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#FFFFFF',
    },
    howText: { flex: 1, gap: 2 },
    howTitle: { fontSize: 19, letterSpacing: -0.2 },
    howSub: { opacity: 0.9 },

    // ── 2 sütun ızgara (Fırsatlar / Öne çıkanlar) ──
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: space(1.5),
      paddingHorizontal: space(3),
    },
    promoCard: {
      width: GRID_W,
      height: 132,
      flexDirection: 'row',
      borderRadius: radius.lg,
      overflow: 'hidden',
    },
    promoCardLeft: { flex: 1, padding: space(1.5), justifyContent: 'center' },
    promoCardTitle: { fontSize: 13, fontWeight: '700', lineHeight: 16, letterSpacing: -0.1, color: colors.ink },
    promoHighlight: {
      fontFamily: 'Fraunces_900Black',
      fontSize: 24,
      lineHeight: 28,
      letterSpacing: -0.3,
      marginVertical: 2,
      color: colors.ink,
    },
    promoCardSub: { fontSize: 11, lineHeight: 14, color: colors.muted },
    promoCardImg: { width: 58, height: '100%', backgroundColor: colors.bgSunken },

    // ── Kategoriler (sabit 6, eşit dağılım) ──
    catRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: space(3),
      paddingTop: space(3.5),
    },
    cat: { alignItems: 'center', width: 54 },
    catTile: {
      width: 56,
      height: 56,
      borderRadius: 28,
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
