import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useOffers } from '../src/catalog';
import { useLocale } from '../src/locale';
import { radius, space, type ColorTokens } from '../src/theme';
import { useTheme, useThemedStyles } from '../src/theme-context';
import { Screen, StackHeader, Text } from '../src/ui';

const FALLBACK_IMG = 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400&q=60';
const DAY_KEYS = [
  'day.sun',
  'day.mon',
  'day.tue',
  'day.wed',
  'day.thu',
  'day.fri',
  'day.sat',
] as const;

// §keşif Modül 2 — aktif kampanyaların tam listesi. Karta dokun → kampanya kısıtlı
// randevu akışı (standart kapora akışı aynen çalışır; fiyat sunucuda sabitlenir).
export default function OffersScreen() {
  const router = useRouter();
  const { t } = useLocale();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const offers = useOffers();

  return (
    <Screen edges={[]}>
      <StackHeader title={t('offers.title')} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {offers.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="pricetags-outline" size={34} color={colors.muted} />
            <Text variant="body" tone="muted" style={styles.emptyText}>
              {t('offers.empty')}
            </Text>
          </View>
        ) : (
          offers.map((o) => (
            <Pressable
              key={o.id}
              style={styles.card}
              onPress={() =>
                router.push({
                  pathname: '/booking/schedule',
                  params: { proId: o.proId, offerId: o.id, source: 'direct' },
                })
              }
            >
              <Image source={{ uri: o.imageUrl || FALLBACK_IMG }} style={styles.img} />
              <View style={styles.body}>
                <View style={styles.topRow}>
                  <View style={styles.badge}>
                    <Text variant="caption" tone="onAccent" style={styles.badgeText}>
                      {o.discountType === 'percent'
                        ? `-%${o.discountValue}`
                        : t('offers.fixed_badge')}
                    </Text>
                  </View>
                  {o.lastChance ? (
                    <View style={styles.lastChance}>
                      <Ionicons name="time-outline" size={12} color={colors.danger} />
                      <Text variant="caption" style={{ color: colors.danger, fontWeight: '800' }}>
                        {t('offers.last_chance')}
                      </Text>
                    </View>
                  ) : null}
                </View>
                <Text variant="bodyStrong" tone="ink" numberOfLines={2}>
                  {o.title}
                </Text>
                {o.description ? (
                  <Text variant="caption" tone="muted" numberOfLines={2}>
                    {o.description}
                  </Text>
                ) : null}
                <View style={styles.priceRow}>
                  <Text variant="caption" tone="muted" style={styles.oldPrice}>
                    {o.basePrice.toLocaleString('tr-TR')} ₸
                  </Text>
                  <Text variant="bodyStrong" tone="accentFg">
                    {o.finalPrice.toLocaleString('tr-TR')} ₸
                  </Text>
                </View>
                {/* Geçerli gün/saat penceresi (ölü saat kampanyaları) */}
                {o.validDays.length > 0 || o.timeFrom ? (
                  <Text variant="caption" tone="inkSoft" numberOfLines={1}>
                    {o.validDays.map((d) => t(DAY_KEYS[d] ?? 'day.mon')).join(' · ')}
                    {o.timeFrom ? `  ${o.timeFrom}–${o.timeTo}` : ''}
                  </Text>
                ) : null}
                <View style={styles.ctaRow}>
                  <Text variant="caption" tone="muted" numberOfLines={1} style={styles.city}>
                    {o.city}
                  </Text>
                  <View style={styles.cta}>
                    <Text variant="caption" tone="onAccent" style={styles.ctaText}>
                      {t('offers.book')}
                    </Text>
                  </View>
                </View>
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    content: { paddingHorizontal: space(3), paddingBottom: space(4), gap: space(1.5) },
    empty: { alignItems: 'center', gap: space(1.5), paddingVertical: space(8) },
    emptyText: { textAlign: 'center' },
    card: {
      flexDirection: 'row',
      gap: space(1.5),
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: space(1.5),
    },
    img: { width: 92, height: 116, borderRadius: radius.md, backgroundColor: colors.bgSunken },
    body: { flex: 1, gap: 4 },
    topRow: { flexDirection: 'row', alignItems: 'center', gap: space(1) },
    badge: {
      backgroundColor: colors.accent,
      paddingHorizontal: space(1),
      paddingVertical: 3,
      borderRadius: radius.pill,
    },
    badgeText: { fontWeight: '800' },
    lastChance: { flexDirection: 'row', alignItems: 'center', gap: 3 },
    priceRow: { flexDirection: 'row', alignItems: 'center', gap: space(1) },
    oldPrice: { textDecorationLine: 'line-through' },
    ctaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
    city: { flex: 1 },
    cta: {
      backgroundColor: colors.accentFg,
      paddingHorizontal: space(1.5),
      paddingVertical: 5,
      borderRadius: radius.pill,
    },
    ctaText: { fontWeight: '800' },
  });
