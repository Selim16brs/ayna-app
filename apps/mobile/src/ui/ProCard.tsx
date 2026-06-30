import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import type { MessageKey } from '@ayna/i18n';
import { useLocale } from '../locale';
import { type Professional, formatPrice } from '../data';
import { type ColorTokens, radius, space } from '../theme';
import { useTheme, useThemedStyles } from '../theme-context';
import { Text } from './Text';

type IoniconName = keyof typeof Ionicons.glyphMap;
type BadgeTone = 'rose' | 'gold';

const BADGE: Record<
  Professional['badge'],
  { key: MessageKey; icon: IoniconName; tone: BadgeTone }
> = {
  campaign: { key: 'card.campaign', icon: 'pricetag', tone: 'rose' },
  verified: { key: 'card.verified', icon: 'checkmark-circle', tone: 'gold' },
  today: { key: 'card.today', icon: 'time', tone: 'rose' },
};

export function ProCard({ pro, index = 0 }: { pro: Professional; index?: number }) {
  const { t } = useLocale();
  const router = useRouter();
  const { colors, shadow } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const badge = BADGE[pro.badge];
  const badgeBg = badge.tone === 'gold' ? colors.goldSoft : colors.roseSoft;
  const badgeFg = badge.tone === 'gold' ? colors.gold : colors.rose;

  return (
    <Animated.View entering={FadeInDown.duration(380).delay(index * 80)}>
      <Pressable
        onPress={() => router.push(`/professional/${pro.id}`)}
        style={({ pressed }) => [styles.card, shadow.card, pressed && styles.pressed]}
      >
        <View style={styles.imageWrap}>
          <Image source={{ uri: pro.image }} style={styles.image} />
          <View style={[styles.badge, { backgroundColor: badgeBg }]}>
            <Ionicons name={badge.icon} size={12} color={badgeFg} />
            <Text variant="caption" style={[styles.badgeText, { color: badgeFg }]}>
              {t(badge.key)}
            </Text>
          </View>
          <View style={styles.heart}>
            <Ionicons name="heart-outline" size={16} color={colors.rose} />
          </View>
        </View>

        <View style={styles.body}>
          <Text variant="bodyStrong" tone="ink" numberOfLines={1}>
            {pro.name}
          </Text>
          <Text variant="caption" tone="muted" numberOfLines={1} style={styles.specialty}>
            {pro.specialty}
          </Text>

          <View style={styles.chips}>
            <View style={[styles.chip, { backgroundColor: colors.goldSoft }]}>
              <Ionicons name="star" size={11} color={colors.gold} />
              <Text variant="caption" style={[styles.chipText, { color: colors.gold }]}>
                {pro.rating.toFixed(1)}
              </Text>
            </View>
            {pro.friends ? (
              <View style={[styles.chip, { backgroundColor: colors.roseSoft }]}>
                <Ionicons name="people" size={11} color={colors.rose} />
                <Text variant="caption" style={[styles.chipText, { color: colors.rose }]}>
                  {pro.friends} {t('card.friends_visited')}
                </Text>
              </View>
            ) : null}
          </View>

          <View style={styles.priceRow}>
            <Text variant="bodyStrong" tone="ink">
              {formatPrice(pro.priceFrom)}
            </Text>
            <Text variant="caption" tone="muted" style={styles.starting}>
              {t('card.starting')}
            </Text>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const CARD_W = 230;

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    card: {
      width: CARD_W,
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.line,
      overflow: 'hidden',
    },
    pressed: { opacity: 0.94, transform: [{ scale: 0.98 }] },
    imageWrap: { height: 168, backgroundColor: colors.bgSunken },
    image: { width: '100%', height: '100%' },
    badge: {
      position: 'absolute',
      top: 10,
      left: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: space(1),
      paddingVertical: 4,
      borderRadius: radius.pill,
    },
    badgeText: { fontSize: 11 },
    heart: {
      position: 'absolute',
      top: 10,
      right: 10,
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: 'rgba(255,255,255,0.92)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    body: { padding: space(1.5) },
    specialty: { marginTop: 2 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: space(1) },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: space(1),
      paddingVertical: 4,
      borderRadius: radius.pill,
    },
    chipText: { fontSize: 11 },
    priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: space(1.25) },
    starting: {},
  });
