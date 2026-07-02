import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Dimensions, Image, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { MessageKey } from '@ayna/i18n';
import { useCampaigns, useProfessionals } from '../../src/catalog';
import { useLocale } from '../../src/locale';
import { useStore } from '../../src/store';
import { radius, space, type ColorTokens } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import { SalonRow, Screen, Text, WaveLayered } from '../../src/ui';

type IoniconName = keyof typeof Ionicons.glyphMap;

// Kategori daire zeminleri (spec §0.1) — pastel + ink ikon
const HOT_PINK = '#FF2E93'; // "Ne yapmak istersin?" kartı — çırtlak pembe
// Canlı kategori renkleri (pembe/yeşil gibi doygun) — Saç·Cilt·Nail·Makyaj·Spa·Diğer
const CAT_TINTS = ['#FF2E93', '#C6E24B', '#B06CFF', '#FF8A3D', '#3FC5F0', '#2ED9B0'];
// Fırsat / öne çıkan kart degradeleri (referans: yumuşak diyagonal gradient) — açık→koyu
const PROMO_GRADS: readonly (readonly [string, string])[] = [
  ['#B7A9E0', '#9D93C9'], // lavanta
  ['#E6A9C0', '#CC8BA0'], // pembe/gül
  ['#A9C7DE', '#7FA3CC'], // mavi
  ['#E8C7A0', '#C2A06A'], // şeftali/bal
];

// Yatay kaydırmalı kart genişliği (referans Fırsatlar/Öne çıkanlar)
const PROMO_W = Math.round(Dimensions.get('window').width * 0.76);

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
  // Dinamik kullanıcı adı — ilk harf büyük (el yazısı katman için)
  const displayName = userName.charAt(0).toLocaleUpperCase('tr-TR') + userName.slice(1);
  const pros = useProfessionals();
  const featured = pros.slice(0, 4);
  const nearby = pros.slice(4, 9);
  const [query, setQuery] = useState('');

  function runSearch() {
    const q = query.trim();
    router.push(q ? { pathname: '/search', params: { q } } : '/search');
  }

  return (
    <Screen edges={[]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* ── LIME HERO (referans: dalgalı kesim + gerçek foto) ── */}
        <View style={[styles.hero, { paddingTop: insets.top + space(1) }]}>
          <View style={styles.heroTop}>
            <Image
              source={require('../../assets/logo-ayna.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          <View style={styles.searchRow}>
            <View style={styles.search}>
              <Ionicons name="search" size={19} color={colors.muted} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder={t('home.search')}
                placeholderTextColor={colors.muted}
                returnKeyType="search"
                onSubmitEditing={runSearch}
                style={styles.searchInput}
              />
            </View>
            <Pressable style={styles.mapIconBtn} onPress={() => router.push('/map')}>
              <Ionicons name="map-outline" size={20} color={colors.ink} />
            </Pressable>
            <Pressable style={styles.cityChip} onPress={() => router.push('/city')}>
              <Ionicons name="location" size={14} color={colors.ink} />
              <Text variant="caption" tone="ink" style={styles.cityText} numberOfLines={1}>
                {city}
              </Text>
              <Ionicons name="chevron-down" size={13} color={colors.ink} />
            </Pressable>
          </View>

          <View style={styles.heroBody}>
            <View style={styles.heroText}>
              <View style={styles.greetWrap}>
                <Text style={styles.greetLabel}>{t('home.greeting')}</Text>
                <Text
                  style={styles.greetName}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.5}
                >
                  {displayName}
                </Text>
              </View>
              <Text variant="caption" tone="inkSoft" style={styles.heroSub}>
                {t('home.hero_subtitle')}
              </Text>
            </View>
          </View>

          {/* Kullanıcı fotoğrafı — yeşilin ÖNÜNDE (zIndex 1) */}
          <Image
            source={require('../../assets/hero-user.png')}
            style={styles.heroPhoto}
            resizeMode="contain"
          />
          {/* Beyaz sliver + pembe dalga — fotonun ÜSTÜNDE (zIndex 2), fotoyu keser */}
          <View style={styles.waveAbs}>
            <WaveLayered sliver={colors.bg} bottom={HOT_PINK} />
          </View>
        </View>

        {/* ── PEMBE BAND: "Ne yapmak istersin?" (dalganın pembe alt katmanı ile birleşir) ── */}
        <View style={styles.howBand}>
          <Pressable style={styles.howRow} onPress={() => router.push('/quote')}>
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
        </View>

        {/* ── KATEGORİLER (yuvarlak, sabit 6) ── */}
        <View style={styles.catRow}>
          {HOME_CATS.map((cat, i) => {
            const bg = CAT_TINTS[i % CAT_TINTS.length]!;
            return (
              <Pressable key={cat.key} style={styles.cat} onPress={() => router.push(cat.route as never)}>
                <View style={[styles.catTile, { backgroundColor: bg }]}>
                  <Ionicons name={cat.icon} size={25} color="#FFFFFF" />
                </View>
                <Text variant="caption" tone="inkSoft" style={styles.catLabel} numberOfLines={1}>
                  {t(cat.key)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* ── FIRSATLAR (tek satır, yatay kaydırmalı) ── */}
        <SectionHeader title={t('home.campaigns')} onSeeAll={() => router.push('/search')} />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.promoScroll}
        >
          {campaigns.map((c, i) => (
            <PromoCard
              key={c.id}
              title={c.title}
              image={c.image}
              grad={PROMO_GRADS[i % PROMO_GRADS.length]!}
              onPress={() => router.push(c.category ? '/category/' + c.category : '/search')}
            />
          ))}
        </ScrollView>

        {/* ── ÖNE ÇIKANLAR (tek satır, yatay kaydırmalı) ── */}
        <SectionHeader title={t('home.featured')} onSeeAll={() => router.push('/search')} />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.promoScroll}
        >
          {featured.map((pro, i) => (
            <PromoCard
              key={pro.id}
              title={pro.name}
              image={pro.image}
              grad={PROMO_GRADS[(i + 1) % PROMO_GRADS.length]!}
              onPress={() => router.push('/professional/' + pro.id)}
            />
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

function PromoCard({
  title,
  image,
  grad,
  onPress,
}: {
  title: string;
  image: string;
  grad: readonly [string, string];
  onPress: () => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const deep = grad[1];
  return (
    <Pressable style={styles.promoCard} onPress={onPress}>
      <LinearGradient
        colors={grad}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Sağda foto — sol kenarı karta karışır (blend) */}
      <Image source={{ uri: image }} style={styles.promoPhoto} />
      <LinearGradient
        colors={[deep, 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.promoFade}
      />
      {/* Sol: başlık üstte, ok altta */}
      <View style={styles.promoContent}>
        <Text style={styles.promoCardTitle} numberOfLines={2}>
          {title}
        </Text>
        <View style={styles.promoArrow}>
          <Ionicons name="arrow-forward" size={20} color={deep} />
        </View>
      </View>
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
      paddingBottom: space(8),
      position: 'relative',
      overflow: 'hidden',
    },
    waveAbs: { position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 2 },
    heroTop: { alignItems: 'center', justifyContent: 'center' },
    logo: { width: 148, height: 56 },
    mapIconBtn: {
      width: 50,
      height: 50,
      borderRadius: radius.pill,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cityChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      height: 50,
      paddingHorizontal: space(1.5),
      borderRadius: radius.pill,
      backgroundColor: colors.surface,
    },
    cityText: { fontWeight: '700', maxWidth: 88 },
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
    searchInput: { flex: 1, fontSize: 16, fontWeight: '400', color: colors.ink, padding: 0 },
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
    // Katmanlı karşılama: siyah "Hoşgeldin" + üzerine binen beyaz el yazısı ad
    greetWrap: { alignSelf: 'stretch' },
    greetLabel: {
      fontSize: 27,
      lineHeight: 29,
      fontWeight: '800',
      letterSpacing: -0.6,
      color: '#1A1A1A',
      zIndex: 1,
    },
    greetName: {
      fontFamily: 'DancingScript_700Bold',
      fontSize: 60,
      lineHeight: 62,
      color: '#FFFFFF',
      alignSelf: 'flex-start',
      marginTop: -14,
      marginLeft: -2,
      transform: [{ rotate: '-5deg' }],
      zIndex: 2,
    },
    heroSub: { marginTop: space(1.5), maxWidth: 220 },
    heroPhoto: {
      // Zeminsiz kullanıcı fotoğrafı — yeşilin ÖNÜNDE (zIndex 1); alt kısmı dalga keser
      position: 'absolute',
      right: -space(1),
      bottom: 0,
      width: 176,
      height: 220,
      zIndex: 1,
    },

    // ── Pembe band: "Ne yapmak istersin?" — pembe zemin dalganın altına kadar dolar ──
    howBand: {
      backgroundColor: HOT_PINK,
      borderBottomLeftRadius: radius.xl,
      borderBottomRightRadius: radius.xl,
    },
    howRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1.5),
      paddingHorizontal: space(3),
      paddingTop: space(0.5),
      paddingBottom: space(2.5),
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

    // ── Tek satır yatay kaydırma (Fırsatlar / Öne çıkanlar) — referans gradient kart ──
    promoScroll: { paddingHorizontal: space(3), gap: space(1.5) },
    promoCard: {
      width: PROMO_W,
      height: 150,
      borderRadius: radius.lg,
      overflow: 'hidden',
      position: 'relative',
    },
    promoPhoto: { position: 'absolute', right: 0, top: 0, bottom: 0, width: '62%' },
    promoFade: { position: 'absolute', right: 0, top: 0, bottom: 0, width: '62%' },
    promoContent: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      width: '62%',
      padding: space(2.25),
      justifyContent: 'space-between',
      zIndex: 2,
    },
    promoCardTitle: { fontSize: 18, fontWeight: '800', lineHeight: 22, letterSpacing: -0.2, color: '#FFFFFF' },
    promoArrow: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
    },

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
