import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useLocale } from '../../src/locale';
import { radius, space, type ColorTokens } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import { Screen, StackHeader, Text } from '../../src/ui';

type IoniconName = keyof typeof Ionicons.glyphMap;

/**
 * Teklif Al — ayrı alan. Önce SOR: kullanıcı foto ile mi yoksa fiyat/talep ile mi
 * teklif almak istiyor? Premium seçim kartları.
 */
export default function QuoteHubScreen() {
  const { t } = useLocale();
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const cards = [
    {
      icon: 'camera' as IoniconName,
      badge: t('quote.hub.badge.photo'),
      title: t('quote.hub.photo.title'),
      desc: t('quote.hub.photo.desc'),
      cta: t('quote.hub.start'),
      grad: ['#EFE7FA', '#FBE3EE'] as const,
      accent: colors.lavender,
      onPress: () => router.push('/quote/new'),
    },
    {
      icon: 'wallet' as IoniconName,
      badge: t('quote.hub.badge.demand'),
      title: t('quote.hub.demand.title'),
      desc: t('quote.hub.demand.desc'),
      cta: t('quote.hub.start'),
      grad: ['#EEF7C8', '#D6EE94'] as const,
      accent: colors.accentFg,
      onPress: () => router.push('/demand/new'),
    },
  ];

  return (
    <Screen edges={[]}>
      <StackHeader title={t('quote.hub.title')} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text variant="body" tone="inkSoft" style={styles.subtitle}>
          {t('quote.hub.subtitle')}
        </Text>

        {cards.map((c, i) => (
          <ChoiceCard key={c.title} index={i} {...c} />
        ))}
      </ScrollView>
    </Screen>
  );
}

function ChoiceCard({
  index,
  icon,
  badge,
  title,
  desc,
  cta,
  grad,
  accent,
  onPress,
}: {
  index: number;
  icon: IoniconName;
  badge: string;
  title: string;
  desc: string;
  cta: string;
  grad: readonly [string, string];
  accent: string;
  onPress: () => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const { shadow } = useTheme();
  return (
    <Animated.View entering={FadeInDown.duration(380).delay(index * 110)}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.card, shadow.card, pressed && styles.pressed]}
      >
        <LinearGradient
          colors={grad}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        {/* Derinlik için köşede soluk dev ikon */}
        <Ionicons name={icon} size={140} color="rgba(255,255,255,0.5)" style={styles.ghost} />

        <View style={styles.cardTop}>
          <View style={styles.iconTile}>
            <Ionicons name={icon} size={26} color={accent} />
          </View>
          <View style={styles.badge}>
            <Text variant="caption" style={[styles.badgeText, { color: accent }]}>
              {badge}
            </Text>
          </View>
        </View>

        <Text variant="h2" tone="ink" style={styles.cardTitle}>
          {title}
        </Text>
        <Text variant="caption" tone="inkSoft" style={styles.cardDesc}>
          {desc}
        </Text>

        <View style={[styles.startPill, { backgroundColor: accent }]}>
          <Ionicons name="sparkles" size={13} color="#FFFFFF" />
          <Text variant="caption" style={styles.startText}>
            {cta}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const makeStyles = (_colors: ColorTokens) =>
  StyleSheet.create({
    content: { paddingHorizontal: space(3), paddingTop: space(1), paddingBottom: space(4) },
    subtitle: { marginBottom: space(3) },
    card: {
      borderRadius: radius.xl,
      padding: space(2.75),
      marginBottom: space(2),
      overflow: 'hidden',
      minHeight: 168,
    },
    pressed: { opacity: 0.97, transform: [{ scale: 0.985 }] },
    ghost: { position: 'absolute', right: -18, bottom: -26 },
    cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    iconTile: {
      width: 56,
      height: 56,
      borderRadius: radius.md,
      backgroundColor: '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
    },
    badge: {
      backgroundColor: 'rgba(255,255,255,0.75)',
      paddingHorizontal: space(1.5),
      paddingVertical: space(0.75),
      borderRadius: radius.pill,
    },
    badgeText: { fontWeight: '800' },
    cardTitle: { fontSize: 21, fontWeight: '800', letterSpacing: -0.3, marginTop: space(2.25) },
    cardDesc: { marginTop: space(1), lineHeight: 19, maxWidth: '82%' },
    startPill: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: 5,
      marginTop: space(2),
      paddingHorizontal: space(1.75),
      paddingVertical: space(1),
      borderRadius: radius.pill,
    },
    startText: { color: '#FFFFFF', fontWeight: '800' },
  });
