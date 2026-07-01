import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ImageBackground, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import type { MessageKey } from '@ayna/i18n';
import { useLocale } from '../locale';
import { type Professional, formatPrice } from '../data';
import { type ColorTokens, radius, space } from '../theme';
import { useTheme, useThemedStyles } from '../theme-context';
import { Text } from './Text';

type IoniconName = keyof typeof Ionicons.glyphMap;

const BADGE: Record<Professional['badge'], { key: MessageKey; icon: IoniconName }> = {
  campaign: { key: 'card.campaign', icon: 'pricetag' },
  verified: { key: 'card.verified', icon: 'checkmark-circle' },
  today: { key: 'card.today', icon: 'time' },
};

// Premium editorial salon kartı — tam fotoğraf + altta gradient, bilgiler foto üstünde.
export function ProCard({ pro, index = 0 }: { pro: Professional; index?: number }) {
  const { t } = useLocale();
  const router = useRouter();
  const { colors, shadow } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const badge = BADGE[pro.badge];

  return (
    <Animated.View entering={FadeInDown.duration(380).delay(index * 80)}>
      <Pressable
        onPress={() => router.push(`/professional/${pro.id}`)}
        style={({ pressed }) => [styles.card, shadow.card, pressed && styles.pressed]}
      >
        <ImageBackground source={{ uri: pro.image }} style={styles.image} imageStyle={styles.imageRadius}>
          <LinearGradient
            colors={['rgba(30,24,28,0)', 'rgba(30,24,28,0.15)', 'rgba(30,24,28,0.82)']}
            locations={[0, 0.45, 1]}
            style={StyleSheet.absoluteFill}
          />

          {/* Üst: rozet + kalp */}
          <View style={styles.top}>
            <View style={styles.badge}>
              <Ionicons name={badge.icon} size={11} color={colors.onColor} />
              <Text variant="caption" tone="onColor" style={styles.badgeText}>
                {t(badge.key)}
              </Text>
            </View>
            <View style={styles.heart}>
              <Ionicons name="heart-outline" size={16} color={colors.onColor} />
            </View>
          </View>

          {/* Alt: isim + ilçe + puan/fiyat */}
          <View style={styles.info}>
            <Text variant="h2" tone="onColor" numberOfLines={1} style={styles.name}>
              {pro.name}
            </Text>
            <View style={styles.metaRow}>
              <Ionicons name="location-outline" size={12} color="rgba(255,255,255,0.85)" />
              <Text variant="caption" tone="onColor" numberOfLines={1} style={styles.meta}>
                {pro.district || pro.specialty}
              </Text>
            </View>
            <View style={styles.bottomRow}>
              <View style={styles.rating}>
                <Ionicons name="star" size={12} color={colors.gold} />
                <Text variant="caption" tone="onColor" style={styles.ratingText}>
                  {pro.rating.toFixed(1)}
                </Text>
                {pro.reviewCount ? (
                  <Text variant="caption" style={styles.reviewCount}>
                    ({pro.reviewCount})
                  </Text>
                ) : null}
              </View>
              <View style={styles.priceTag}>
                <Text variant="caption" style={styles.priceFrom}>
                  {t('card.starting')}
                </Text>
                <Text variant="bodyStrong" tone="onColor" style={styles.price}>
                  {formatPrice(pro.priceFrom)}
                </Text>
              </View>
            </View>
          </View>
        </ImageBackground>
      </Pressable>
    </Animated.View>
  );
}

const CARD_W = 236;
const CARD_H = 300;

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    card: {
      width: CARD_W,
      height: CARD_H,
      borderRadius: radius.xl,
      overflow: 'hidden',
      backgroundColor: colors.bgSunken,
    },
    pressed: { opacity: 0.96, transform: [{ scale: 0.985 }] },
    image: { flex: 1, justifyContent: 'space-between' },
    imageRadius: { borderRadius: radius.xl },
    top: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      padding: space(1.5),
    },
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: space(1),
      paddingVertical: 5,
      borderRadius: radius.pill,
      backgroundColor: 'rgba(0,0,0,0.32)',
    },
    badgeText: { fontSize: 11, fontWeight: '600' },
    heart: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: 'rgba(0,0,0,0.32)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    info: { padding: space(1.75) },
    name: { fontSize: 19, fontWeight: '800', letterSpacing: -0.3 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 3 },
    meta: { color: 'rgba(255,255,255,0.85)', flex: 1 },
    bottomRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: space(1.25),
    },
    rating: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: 'rgba(255,255,255,0.18)',
      paddingHorizontal: space(1),
      paddingVertical: 5,
      borderRadius: radius.pill,
    },
    ratingText: { fontSize: 12, fontWeight: '700' },
    reviewCount: { fontSize: 11, color: 'rgba(255,255,255,0.7)' },
    priceTag: { alignItems: 'flex-end' },
    priceFrom: { fontSize: 10, color: 'rgba(255,255,255,0.7)' },
    price: { fontSize: 15, fontWeight: '800' },
  });
