import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import type { MessageKey } from '@ayna/i18n';
import { useLocale } from '../locale';
import type { Professional } from '../data';
import { type ColorTokens, radius, space } from '../theme';
import { useTheme, useThemedStyles } from '../theme-context';
import { Text } from './Text';

// Rozet renk eşlemesi — nazik soft tint (referans: %10 İndirim / Popüler / Yeni)
const BADGE: Record<
  Professional['badge'],
  { key: MessageKey; bg: keyof ColorTokens; fg: keyof ColorTokens }
> = {
  campaign: { key: 'card.campaign', bg: 'accentSoft', fg: 'ink' },
  verified: { key: 'card.verified', bg: 'lavenderSoft', fg: 'lavender' },
  today: { key: 'card.today', bg: 'goldSoft', fg: 'gold' },
};

/**
 * Yatay salon kartı (referans "Yakındaki salonlar" dili): sol foto + isim/puan/adres +
 * sağda rozet ve lime "Detaylar" pill'i. Dikey listede kullanılır.
 */
export function SalonRow({ pro, index = 0 }: { pro: Professional; index?: number }) {
  const { t } = useLocale();
  const router = useRouter();
  const { colors, shadow } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const badge = BADGE[pro.badge];
  const km = (0.8 + index * 0.5).toFixed(1);

  return (
    <Animated.View entering={FadeInDown.duration(340).delay(index * 70)}>
      <Pressable
        onPress={() => router.push(`/professional/${pro.id}`)}
        style={({ pressed }) => [styles.card, shadow.soft, pressed && styles.pressed]}
      >
        <Image source={{ uri: pro.image }} style={styles.photo} />

        <View style={styles.body}>
          <Text variant="bodyStrong" tone="ink" numberOfLines={1} style={styles.name}>
            {pro.name}
          </Text>
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={13} color={colors.gold} />
            <Text variant="caption" tone="ink" style={styles.rating}>
              {pro.rating.toFixed(1)}
            </Text>
            <Text variant="caption" tone="muted">
              ({pro.reviewCount})
            </Text>
          </View>
          <Text variant="caption" tone="muted" numberOfLines={1} style={styles.meta}>
            {km} km • {pro.district || pro.specialty}
          </Text>
        </View>

        <View style={styles.right}>
          <View style={[styles.badge, { backgroundColor: colors[badge.bg] }]}>
            <Text variant="caption" style={[styles.badgeText, { color: colors[badge.fg] }]}>
              {t(badge.key)}
            </Text>
          </View>
          <View style={styles.cta}>
            <Text variant="caption" tone="onAccent" style={styles.ctaText}>
              {t('card.details')}
            </Text>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1.5),
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: space(1.25),
    },
    pressed: { opacity: 0.96, transform: [{ scale: 0.99 }] },
    photo: {
      width: 84,
      height: 84,
      borderRadius: radius.md,
      backgroundColor: colors.bgSunken,
    },
    body: { flex: 1, gap: 4 },
    name: { fontSize: 16, fontWeight: '800', letterSpacing: -0.2 },
    ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    rating: { fontWeight: '800' },
    meta: {},
    right: { alignItems: 'flex-end', justifyContent: 'space-between', height: 84, paddingVertical: 2 },
    badge: {
      paddingHorizontal: space(1.25),
      paddingVertical: 5,
      borderRadius: radius.pill,
    },
    badgeText: { fontSize: 11, fontWeight: '700' },
    cta: {
      backgroundColor: colors.accent,
      paddingHorizontal: space(2),
      paddingVertical: space(1),
      borderRadius: radius.pill,
    },
    ctaText: { fontWeight: '800' },
  });
