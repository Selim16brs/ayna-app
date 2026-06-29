import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { api } from '../../src/api';
import { getUpcomingEvents, whenShort } from '../../src/data';
import { useLocale } from '../../src/locale';
import { colors, gradients, radius, shadow, space } from '../../src/theme';
import { ProCard, Screen, Text } from '../../src/ui';

type IoniconName = keyof typeof Ionicons.glyphMap;

// Kategori ikon zeminleri: dolu canlı renkler (içindeki ikon beyaz)
const CAT_COLORS = [colors.rose, colors.orange, colors.teal, colors.blue, colors.plum];

export default function DiscoverScreen() {
  const { t } = useLocale();
  const router = useRouter();
  const events = getUpcomingEvents();
  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: api.categories });
  const { data: featured = [] } = useQuery({
    queryKey: ['professionals'],
    queryFn: api.professionals,
  });

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
            <View style={styles.iconButton}>
              <Ionicons name="notifications-outline" size={20} color={colors.blue} />
            </View>
            <LinearGradient colors={gradients.rose} style={styles.avatar}>
              <Text variant="bodyStrong" tone="onColor">
                A
              </Text>
            </LinearGradient>
          </View>
        </View>

        {/* Yaklaşan etkinlikler (randevu + özel gün + bakım) */}
        {events.length > 0 ? (
          <>
            <View style={styles.sectionHeader}>
              <Text variant="h2" tone="ink">
                {t('home.upcoming_events')}
              </Text>
              <Pressable onPress={() => router.push('/bookings')}>
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
                <View key={e.id} style={[styles.eventCard, shadow.soft]}>
                  <View style={styles.eventTop}>
                    <View
                      style={[
                        styles.eventIcon,
                        { backgroundColor: e.tone === 'rose' ? colors.rose : colors.gold },
                      ]}
                    >
                      <Ionicons name={e.icon as IoniconName} size={18} color={colors.onColor} />
                    </View>
                    <View style={styles.whenChip}>
                      <Text variant="caption" tone="inkSoft">
                        {whenShort(e.inDays)}
                      </Text>
                    </View>
                  </View>
                  <Text variant="bodyStrong" tone="ink" numberOfLines={1} style={styles.eventTitle}>
                    {e.title}
                  </Text>
                  <Text variant="caption" tone="muted" numberOfLines={1}>
                    {e.subtitle}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </>
        ) : null}

        {/* Ana aksiyonlar */}
        <Text variant="label" tone="rose" style={styles.howLabel}>
          {t('home.how')}
        </Text>
        <View style={styles.actions}>
          <Pressable style={styles.actionWrap} onPress={() => router.push('/quote/new')}>
            <LinearGradient
              colors={gradients.rose}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.action}
            >
              <Ionicons name="camera" size={26} color={colors.onColor} />
              <Text variant="bodyStrong" tone="onColor" style={styles.actionTitle}>
                {t('action.photo_quote.title')}
              </Text>
              <Text variant="caption" tone="onColor" style={styles.actionSubtitle}>
                {t('action.photo_quote.subtitle')}
              </Text>
            </LinearGradient>
          </Pressable>
          <Pressable style={styles.actionWrap} onPress={() => router.push('/demand/new')}>
            <LinearGradient
              colors={gradients.teal}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.action}
            >
              <Ionicons name="pricetag" size={26} color={colors.onColor} />
              <Text variant="bodyStrong" tone="onColor" style={styles.actionTitle}>
                {t('action.demand.title')}
              </Text>
              <Text variant="caption" tone="onColor" style={styles.actionSubtitle}>
                {t('action.demand.subtitle')}
              </Text>
            </LinearGradient>
          </Pressable>
        </View>

        {/* Arama */}
        <Pressable style={[styles.search, shadow.soft]}>
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
          {categories.map((cat, i) => (
            <Pressable key={cat.id} style={styles.category}>
              <View
                style={[
                  styles.categoryIcon,
                  { backgroundColor: CAT_COLORS[i % CAT_COLORS.length] },
                ]}
              >
                <Ionicons name={cat.icon as IoniconName} size={24} color={colors.onColor} />
              </View>
              <Text variant="caption" tone="inkSoft" style={styles.categoryLabel}>
                {cat.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Kampanya */}
        <LinearGradient
          colors={gradients.plum}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.promo}
        >
          <View style={styles.promoText}>
            <Text variant="h2" tone="onColor" style={styles.promoTitle}>
              {t('promo.title')}
            </Text>
            <Text variant="caption" tone="onColor" style={styles.promoSubtitle}>
              {t('promo.subtitle')}
            </Text>
            <View style={styles.promoCta}>
              <Text variant="caption" style={styles.promoCtaText}>
                {t('promo.cta')}
              </Text>
            </View>
          </View>
          <Ionicons
            name="pricetags"
            size={88}
            color="rgba(255,255,255,0.12)"
            style={styles.promoIcon}
          />
        </LinearGradient>

        {/* Öne çıkanlar */}
        <View style={styles.sectionHeader}>
          <Text variant="h2" tone="ink">
            {t('home.featured')}
          </Text>
          <Text variant="caption" tone="rose">
            {t('common.see_all')}
          </Text>
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

const styles = StyleSheet.create({
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
    ...shadow.soft,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  upcoming: { paddingHorizontal: space(3), gap: space(1.5), paddingBottom: space(2.5) },
  eventCard: {
    width: 210,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: space(2),
  },
  eventTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: space(1.5),
  },
  eventIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  whenChip: {
    backgroundColor: colors.bgSunken,
    paddingHorizontal: space(1.25),
    paddingVertical: space(0.5),
    borderRadius: radius.pill,
  },
  eventTitle: { marginBottom: 2 },
  howLabel: { paddingHorizontal: space(3), marginBottom: space(1.25) },
  actions: {
    flexDirection: 'row',
    gap: space(1.5),
    paddingHorizontal: space(3),
    marginBottom: space(2.5),
  },
  actionWrap: { flex: 1 },
  action: {
    borderRadius: radius.lg,
    padding: space(2),
    minHeight: 124,
    justifyContent: 'flex-end',
    ...shadow.soft,
  },
  actionTitle: { marginTop: space(1) },
  actionSubtitle: { opacity: 0.85, marginTop: 2 },
  search: {
    marginHorizontal: space(3),
    height: 50,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(1.25),
    paddingHorizontal: space(2.25),
    marginBottom: space(2.5),
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
  promo: {
    marginHorizontal: space(3),
    marginTop: space(2),
    marginBottom: space(3),
    borderRadius: radius.xl,
    padding: space(2.5),
    overflow: 'hidden',
  },
  promoText: { zIndex: 2 },
  promoTitle: { fontSize: 21 },
  promoSubtitle: { opacity: 0.85, marginTop: space(0.75) },
  promoCta: {
    alignSelf: 'flex-start',
    marginTop: space(1.75),
    backgroundColor: colors.onColor,
    paddingHorizontal: space(2),
    paddingVertical: space(1),
    borderRadius: radius.pill,
  },
  promoCtaText: { color: colors.plum, fontSize: 13, fontWeight: '600' },
  promoIcon: { position: 'absolute', right: -8, bottom: -12 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingHorizontal: space(3),
    marginBottom: space(1.75),
  },
  featured: { paddingHorizontal: space(3), gap: space(2), paddingBottom: space(1) },
});
