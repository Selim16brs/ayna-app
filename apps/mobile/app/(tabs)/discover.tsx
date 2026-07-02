import { useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Dimensions, ImageBackground, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { buildUpcomingEvents, CATEGORIES, whenShort } from '../../src/data';
import { useAds, useCampaigns, useProfessionals } from '../../src/catalog';
import { useLocale } from '../../src/locale';
import { selectUnreadCount, useStore } from '../../src/store';
import { radius, space, type ColorTokens } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import { ProCard, Screen, Text } from '../../src/ui';

type IoniconName = keyof typeof Ionicons.glyphMap;

// Kategori ikon zeminleri: nazik pastel tint + renkli ikon (wellness, gökkuşağı yok)
const makeCatColors = (colors: ColorTokens) => [
  { bg: colors.sageSoft, fg: colors.sage },
  { bg: colors.roseSoft, fg: colors.rose },
  { bg: colors.lavenderSoft, fg: colors.lavender },
  { bg: colors.blueSoft, fg: colors.blue },
  { bg: colors.goldSoft, fg: colors.gold },
];

const ACTION_PHOTO_1 =
  'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=600&q=70';
const ACTION_PHOTO_2 =
  'https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=600&q=70';

const AD_WIDTH = Dimensions.get('window').width - space(6);

export default function DiscoverScreen() {
  const { t } = useLocale();
  const { colors, gradients, shadow } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const CAT_COLORS = makeCatColors(colors);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const bookings = useStore((s) => s.bookings);
  const moments = useStore((s) => s.moments);
  const routines = useStore((s) => s.careRoutines);
  const events = useMemo(
    () => buildUpcomingEvents(bookings, moments, routines).slice(0, 3),
    [bookings, moments, routines],
  );
  const unread = useStore(selectUnreadCount);
  const campaigns = useCampaigns();
  const ads = useAds();
  const userName = useStore((s) => s.currentUser?.name)?.split(' ')[0] ?? 'Aigerim';
  const categories = CATEGORIES;
  const featured = useProfessionals().slice(0, 8);

  return (
    <Screen edges={[]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* CORAL HEADER — konum + arama + filtre (Booksy/turuncu referans dili) */}
        <View style={[styles.hdr, { paddingTop: insets.top + space(1.5) }]}>
          <View style={styles.hdrTop}>
            <Pressable style={styles.hdrAvatar} onPress={() => router.push('/profile')}>
              <Text variant="bodyStrong" tone="onColor">
                {userName.charAt(0).toUpperCase()}
              </Text>
            </Pressable>
            <View style={styles.hdrLoc}>
              <Text variant="caption" style={styles.hdrHi}>
                {t('home.greeting')}, {userName}
              </Text>
              <View style={styles.hdrLocRow}>
                <Ionicons name="location" size={13} color={colors.onColor} />
                <Text variant="bodyStrong" tone="onColor">
                  Almatı, KZ
                </Text>
                <Ionicons name="chevron-down" size={14} color={colors.onColor} />
              </View>
            </View>
            <Pressable style={styles.hdrBell} onPress={() => router.push('/notifications')}>
              <Ionicons name="notifications-outline" size={20} color={colors.onColor} />
              {unread > 0 ? <View style={styles.badge} /> : null}
            </Pressable>
          </View>
          <View style={styles.hdrSearchRow}>
            <Pressable style={styles.hdrSearch} onPress={() => router.push('/search')}>
              <Ionicons name="search" size={19} color={colors.muted} />
              <Text variant="body" tone="muted">
                {t('home.search')}
              </Text>
            </Pressable>
            <Pressable style={styles.hdrFilter} onPress={() => router.push('/map')}>
              <Ionicons name="options-outline" size={20} color={colors.onColor} />
            </Pressable>
          </View>
        </View>

        {/* HERO — Ne yapmak istersin? (birincil aksiyon, belirgin) */}
        <Text variant="h2" tone="ink" style={styles.heroTitle}>
          {t('home.how')}
        </Text>
        <View style={styles.actions}>
          <ActionCard
            photo={ACTION_PHOTO_1}
            icon="camera"
            title={t('action.photo_quote.title')}
            subtitle={t('action.photo_quote.subtitle')}
            onPress={() => router.push('/quote/new')}
          />
          <ActionCard
            photo={ACTION_PHOTO_2}
            icon="pricetag"
            title={t('action.demand.title')}
            subtitle={t('action.demand.subtitle')}
            onPress={() => router.push('/demand/new')}
          />
        </View>

        {/* Kategoriler — renkli ikon karoları (hero'nun hemen altında) */}
        <View style={styles.sectionHeader}>
          <Text variant="label" tone="muted">
            {t('home.categories')}
          </Text>
          <Pressable onPress={() => router.push('/search')}>
            <Text variant="caption" tone="rose">
              {t('common.see_all')}
            </Text>
          </Pressable>
        </View>
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

        {/* Fırsatlar — promo carousel */}
        <View style={styles.sectionHeader}>
          <Text variant="label" tone="muted">
            {t('home.campaigns')}
          </Text>
        </View>
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
              style={{ width: AD_WIDTH }}
              onPress={() => router.push(c.category ? '/category/' + c.category : '/search')}
            >
              <ImageBackground
                source={{ uri: c.image }}
                style={[styles.promo, { width: AD_WIDTH }]}
                imageStyle={styles.promoImg}
              >
                <LinearGradient
                  colors={['rgba(30,24,28,0.82)', 'rgba(30,24,28,0.15)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0.4 }}
                  style={StyleSheet.absoluteFill}
                />
                <View style={styles.promoContent}>
                  {c.badge ? (
                    <View style={styles.promoBadge}>
                      <Text variant="caption" tone="onColor" style={styles.promoBadgeText}>
                        {c.badge}
                      </Text>
                    </View>
                  ) : null}
                  <Text variant="h2" tone="onColor" style={styles.promoTitle} numberOfLines={2}>
                    {c.title}
                  </Text>
                  <Text variant="caption" tone="onColor" style={styles.promoSub} numberOfLines={1}>
                    {c.subtitle}
                  </Text>
                  <View style={styles.promoCta}>
                    <Text variant="caption" tone="onColor" style={styles.promoCtaText}>
                      {t('common.see_all')}
                    </Text>
                    <Ionicons name="arrow-forward" size={13} color={colors.onColor} />
                  </View>
                </View>
              </ImageBackground>
            </Pressable>
          ))}
        </ScrollView>

        {/* Yaklaşan etkinlikler — kompakt, ilk 3 */}
        {events.length > 0 ? (
          <>
            <View style={styles.sectionHeader}>
              <Text variant="label" tone="muted">
                {t('home.upcoming_events')}
              </Text>
              <Pressable onPress={() => router.push('/events')}>
                <Text variant="caption" tone="rose">
                  {t('common.see_all')}
                </Text>
              </Pressable>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.upcoming}
            >
              {events.map((e) => (
                <Pressable
                  key={e.id}
                  style={[styles.eventCard, shadow.soft]}
                  onPress={() =>
                    e.kind === 'appointment'
                      ? router.push('/booking/' + e.refId)
                      : router.push('/events')
                  }
                >
                  <View
                    style={[
                      styles.eventIcon,
                      { backgroundColor: e.tone === 'rose' ? colors.roseSoft : colors.sageSoft },
                    ]}
                  >
                    <Ionicons
                      name={e.icon as IoniconName}
                      size={18}
                      color={e.tone === 'rose' ? colors.rose : colors.sage}
                    />
                  </View>
                  <View style={styles.eventBody}>
                    <Text variant="bodyStrong" tone="ink" numberOfLines={1}>
                      {e.title}
                    </Text>
                    <Text variant="caption" tone="muted">
                      {whenShort(e.inDays)}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </>
        ) : null}

        {/* Öne çıkan (sponsorlu) işletmeler */}
        <View style={styles.sectionHeader}>
          <Text variant="label" tone="muted">
            {t('home.featured')}
          </Text>
        </View>
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

        {/* Sana yakın salonlar */}
        <View style={styles.sectionHeader}>
          <Text variant="label" tone="muted">
            {t('home.nearby')}
          </Text>
          <Pressable onPress={() => router.push('/search')}>
            <Text variant="caption" tone="rose">
              {t('common.see_all')}
            </Text>
          </Pressable>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.featured}
        >
          {featured.map((pro, i) => (
            <ProCard key={pro.id} pro={pro} index={i} />
          ))}
        </ScrollView>
      </ScrollView>
    </Screen>
  );
}

function ActionCard({
  photo,
  icon,
  title,
  subtitle,
  onPress,
}: {
  photo: string;
  icon: IoniconName;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  const { colors, shadow } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <Pressable style={styles.actionWrap} onPress={onPress}>
      <ImageBackground
        source={{ uri: photo }}
        style={[styles.action, shadow.soft]}
        imageStyle={styles.actionImage}
      >
        <LinearGradient
          colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.8)']}
          style={StyleSheet.absoluteFill}
        />
        <Ionicons name={icon} size={24} color={colors.onColor} />
        <Text variant="bodyStrong" tone="onColor" style={styles.actionTitle}>
          {title}
        </Text>
        <Text variant="caption" tone="onColor" style={styles.actionSubtitle}>
          {subtitle}
        </Text>
      </ImageBackground>
    </Pressable>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    content: { paddingBottom: space(13) },
    // Coral header
    hdr: {
      backgroundColor: colors.accent,
      borderBottomLeftRadius: radius.xl,
      borderBottomRightRadius: radius.xl,
      paddingHorizontal: space(3),
      paddingBottom: space(2.5),
      marginBottom: space(2.5),
    },
    hdrTop: { flexDirection: 'row', alignItems: 'center', gap: space(1.25) },
    hdrAvatar: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: 'rgba(255,255,255,0.25)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    hdrLoc: { flex: 1 },
    hdrHi: { color: 'rgba(255,255,255,0.8)' },
    hdrLocRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 1 },
    hdrBell: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: 'rgba(255,255,255,0.2)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    hdrSearchRow: { flexDirection: 'row', gap: space(1.25), marginTop: space(2) },
    hdrSearch: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1),
      height: 48,
      borderRadius: radius.lg,
      backgroundColor: colors.surface,
      paddingHorizontal: space(1.75),
    },
    hdrFilter: {
      width: 48,
      height: 48,
      borderRadius: radius.lg,
      backgroundColor: 'rgba(255,255,255,0.22)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    // Promo hero
    promoRow: { paddingHorizontal: space(3), gap: space(1.5) },
    promo: { height: 168, justifyContent: 'flex-end' },
    promoImg: { borderRadius: radius.xl },
    promoContent: { padding: space(2.25) },
    promoBadge: {
      alignSelf: 'flex-start',
      backgroundColor: colors.accent,
      paddingHorizontal: space(1.25),
      paddingVertical: 4,
      borderRadius: radius.pill,
      marginBottom: space(1),
    },
    promoBadgeText: { fontWeight: '800' },
    promoTitle: { fontSize: 20, fontWeight: '800', letterSpacing: -0.3, maxWidth: '75%' },
    promoSub: { color: 'rgba(255,255,255,0.85)', marginTop: 2 },
    promoCta: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: 5,
      backgroundColor: 'rgba(255,255,255,0.22)',
      paddingHorizontal: space(1.5),
      paddingVertical: space(0.75),
      borderRadius: radius.pill,
      marginTop: space(1.25),
    },
    promoCtaText: { fontWeight: '700' },
    // Kategori pill
    catRow: { paddingHorizontal: space(3), gap: space(2) },
    cat: { alignItems: 'center', width: 66 },
    catTile: {
      width: 62,
      height: 62,
      borderRadius: radius.lg,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: space(0.75),
    },
    catLabel: { textAlign: 'center' },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: space(3),
      paddingTop: space(1),
      marginBottom: space(2.5),
    },
    headerText: { flex: 1 },
    greetingLabel: { marginBottom: space(0.75) },
    greetingName: { letterSpacing: -0.6 },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: space(1.25) },
    iconButton: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatar: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: 'center',
      justifyContent: 'center',
    },
    badge: {
      position: 'absolute',
      top: 9,
      right: 10,
      width: 9,
      height: 9,
      borderRadius: 5,
      backgroundColor: colors.rose,
      borderWidth: 1.5,
      borderColor: colors.surface,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      paddingHorizontal: space(3),
      marginTop: space(1.5),
      marginBottom: space(2),
    },
    upcoming: { paddingHorizontal: space(3), gap: space(1.25), paddingBottom: space(1) },
    eventCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1.25),
      width: 210,
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: space(1.5),
    },
    eventIcon: {
      width: 40,
      height: 40,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    eventBody: { flex: 1 },
    howLabel: { paddingHorizontal: space(3), marginTop: space(1), marginBottom: space(1.25) },
    heroTitle: {
      fontSize: 20,
      fontWeight: '800',
      letterSpacing: -0.3,
      paddingHorizontal: space(3),
      marginBottom: space(1.5),
    },
    actions: { flexDirection: 'row', gap: space(1.5), paddingHorizontal: space(3) },
    actionWrap: { flex: 1 },
    action: {
      height: 172,
      borderRadius: radius.xl,
      padding: space(2),
      justifyContent: 'flex-end',
      overflow: 'hidden',
    },
    actionImage: { borderRadius: radius.xl },
    actionTitle: { marginTop: space(0.75) },
    actionSubtitle: { opacity: 0.9, marginTop: 2 },
    searchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1.25),
      paddingHorizontal: space(3),
      marginBottom: space(1),
    },
    search: {
      flex: 1,
      height: 52,
      backgroundColor: colors.surface,
      borderRadius: radius.pill,
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1.25),
      paddingHorizontal: space(2.25),
    },
    mapBtn: {
      width: 52,
      height: 52,
      borderRadius: radius.pill,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    categories: { paddingHorizontal: space(3), gap: space(2), paddingBottom: space(1) },
    category: { alignItems: 'center', width: 64 },
    categoryIcon: {
      width: 60,
      height: 60,
      borderRadius: radius.lg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    categoryLabel: { marginTop: space(0.75), textAlign: 'center' },
    ads: { paddingHorizontal: space(3), gap: space(1.5), marginTop: space(2.5) },
    adCard: {
      height: 160,
      borderRadius: radius.lg,
      overflow: 'hidden',
      justifyContent: 'flex-end',
    },
    adImage: { borderRadius: radius.lg },
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
    featured: { paddingHorizontal: space(3), gap: space(2), paddingBottom: space(2) },
    // §12 kampanya vitrini
    campaigns: { paddingHorizontal: space(3), gap: space(1.5) },
    campaignCard: {
      width: 240,
      height: 130,
      borderRadius: radius.lg,
      overflow: 'hidden',
      justifyContent: 'flex-end',
    },
    campaignImage: { borderRadius: radius.lg },
    campaignBadge: {
      position: 'absolute',
      top: space(1.25),
      left: space(1.25),
      backgroundColor: colors.rose,
      paddingHorizontal: space(1),
      paddingVertical: 3,
      borderRadius: radius.pill,
    },
    campaignBadgeText: { fontWeight: '700' },
    campaignText: { padding: space(1.75) },
    campaignSub: { opacity: 0.9, marginTop: 2 },
  });
