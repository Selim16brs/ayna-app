import { useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Dimensions, ImageBackground, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { ADS, buildUpcomingEvents, CATEGORIES, FEATURED, whenShort } from '../../src/data';
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
  const router = useRouter();
  const bookings = useStore((s) => s.bookings);
  const moments = useStore((s) => s.moments);
  const routines = useStore((s) => s.careRoutines);
  const events = useMemo(
    () => buildUpcomingEvents(bookings, moments, routines).slice(0, 3),
    [bookings, moments, routines],
  );
  const unread = useStore(selectUnreadCount);
  const categories = CATEGORIES;
  const featured = FEATURED;

  return (
    <Screen edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Başlık */}
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text variant="caption" tone="inkSoft">
              {t('home.greeting')}
            </Text>
            <Text variant="title" tone="rose">
              Aigerim
            </Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable
              style={[styles.iconButton, shadow.soft]}
              onPress={() => router.push('/notifications')}
            >
              <Ionicons name="notifications-outline" size={20} color={colors.blue} />
              {unread > 0 ? <View style={styles.badge} /> : null}
            </Pressable>
            <LinearGradient colors={gradients.rose} style={styles.avatar}>
              <Text variant="bodyStrong" tone="onColor">
                A
              </Text>
            </LinearGradient>
          </View>
        </View>

        {/* Yaklaşan etkinlikler — kompakt, ilk 3 */}
        {events.length > 0 ? (
          <>
            <View style={styles.sectionHeader}>
              <Text variant="h2" tone="ink">
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

        {/* Ne yapmak istersin — fotoğraflı aksiyon kartları */}
        <Text variant="label" tone="rose" style={styles.howLabel}>
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

        {/* Arama */}
        <Pressable style={[styles.search, shadow.soft]} onPress={() => router.push('/search')}>
          <Ionicons name="search" size={19} color={colors.muted} />
          <Text variant="body" tone="muted">
            {t('home.search')}
          </Text>
        </Pressable>

        {/* Kategoriler */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categories}
        >
          {categories.map((cat, i) => {
            const c = CAT_COLORS[i % CAT_COLORS.length]!;
            return (
              <Pressable
                key={cat.id}
                style={styles.category}
                onPress={() => router.push('/category/' + cat.id)}
              >
                <View style={[styles.categoryIcon, { backgroundColor: c.bg }]}>
                  <Ionicons name={cat.icon as IoniconName} size={24} color={c.fg} />
                </View>
                <Text variant="caption" tone="inkSoft" style={styles.categoryLabel}>
                  {t(cat.labelKey)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Reklam banner (premium işletmeler) */}
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.ads}
          snapToInterval={AD_WIDTH + space(1.5)}
          decelerationRate="fast"
        >
          {ADS.map((ad) => (
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

        {/* Senin için öneriler */}
        <View style={styles.sectionHeader}>
          <Text variant="h2" tone="ink">
            {t('home.recommended')}
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
    content: { paddingBottom: space(4) },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: space(3),
      paddingTop: space(1),
      marginBottom: space(2.5),
    },
    headerText: { flex: 1 },
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
      width: 200,
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.line,
      padding: space(1.5),
    },
    eventIcon: {
      width: 38,
      height: 38,
      borderRadius: radius.sm,
      alignItems: 'center',
      justifyContent: 'center',
    },
    eventBody: { flex: 1 },
    howLabel: { paddingHorizontal: space(3), marginTop: space(1), marginBottom: space(1.25) },
    actions: { flexDirection: 'row', gap: space(1.5), paddingHorizontal: space(3) },
    actionWrap: { flex: 1 },
    action: {
      height: 150,
      borderRadius: radius.lg,
      padding: space(1.75),
      justifyContent: 'flex-end',
      overflow: 'hidden',
    },
    actionImage: { borderRadius: radius.lg },
    actionTitle: { marginTop: space(0.75) },
    actionSubtitle: { opacity: 0.9, marginTop: 2 },
    search: {
      marginHorizontal: space(3),
      height: 50,
      backgroundColor: colors.surface,
      borderRadius: radius.pill,
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1.25),
      paddingHorizontal: space(2.25),
      marginTop: space(2.5),
      marginBottom: space(2.5),
      borderWidth: 1,
      borderColor: colors.line,
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
  });
