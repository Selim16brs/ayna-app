import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { CATEGORIES } from '../../src/data';
import { useLocale } from '../../src/locale';
import { colors, gradients, radius, shadow, space } from '../../src/theme';
import { ProCard, Screen, Text } from '../../src/ui';
import { FEATURED } from '../../src/data';

export default function DiscoverScreen() {
  const { t } = useLocale();

  return (
    <Screen edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Başlık */}
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text variant="caption" tone="inkSoft">
              {t('home.greeting')}
            </Text>
            <Text variant="title" tone="ink">
              Aigerim
            </Text>
          </View>
          <View style={styles.headerActions}>
            <View style={styles.iconButton}>
              <Ionicons name="notifications-outline" size={20} color={colors.plum} />
            </View>
            <LinearGradient colors={gradients.rose} style={styles.avatar}>
              <Text variant="bodyStrong" tone="onColor">
                A
              </Text>
            </LinearGradient>
          </View>
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
          {CATEGORIES.map((cat) => (
            <Pressable key={cat.id} style={styles.category}>
              <View
                style={[
                  styles.categoryIcon,
                  { backgroundColor: cat.tone === 'rose' ? colors.roseSoft : colors.goldSoft },
                ]}
              >
                <Ionicons
                  name={cat.icon}
                  size={24}
                  color={cat.tone === 'rose' ? colors.rose : colors.gold}
                />
              </View>
              <Text variant="caption" tone="inkSoft" style={styles.categoryLabel}>
                {t(cat.labelKey)}
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
          <Text variant="caption" tone="gold">
            {t('common.see_all')}
          </Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.featured}
        >
          {FEATURED.map((pro) => (
            <ProCard key={pro.id} pro={pro} />
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
  promoCtaText: { color: colors.plum, fontSize: 13 },
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
