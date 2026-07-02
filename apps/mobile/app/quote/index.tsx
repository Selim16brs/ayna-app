import { Ionicons } from '@expo/vector-icons';
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
 * teklif almak istiyor? Seçtikten sonra ilgili akışa (referans tasarımlar) gider.
 */
export default function QuoteHubScreen() {
  const { t } = useLocale();
  const router = useRouter();
  const styles = useThemedStyles(makeStyles);

  return (
    <Screen edges={[]}>
      <StackHeader title={t('quote.hub.title')} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text variant="display" tone="ink" style={styles.title}>
          {t('quote.hub.title')}
        </Text>
        <Text variant="body" tone="inkSoft" style={styles.subtitle}>
          {t('quote.hub.subtitle')}
        </Text>

        <ChoiceCard
          index={0}
          icon="camera"
          badge={t('quote.hub.badge.photo')}
          title={t('quote.hub.photo.title')}
          desc={t('quote.hub.photo.desc')}
          onPress={() => router.push('/quote/new')}
        />
        <ChoiceCard
          index={1}
          icon="wallet"
          badge={t('quote.hub.badge.demand')}
          title={t('quote.hub.demand.title')}
          desc={t('quote.hub.demand.desc')}
          onPress={() => router.push('/demand/new')}
        />
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
  onPress,
}: {
  index: number;
  icon: IoniconName;
  badge: string;
  title: string;
  desc: string;
  onPress: () => void;
}) {
  const { colors, shadow } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <Animated.View entering={FadeInDown.duration(360).delay(index * 90)}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.card, shadow.card, pressed && styles.pressed]}
      >
        <View style={styles.cardTop}>
          <View style={styles.iconTile}>
            <Ionicons name={icon} size={26} color={colors.onAccent} />
          </View>
          <View style={styles.badge}>
            <Text variant="caption" tone="onAccent" style={styles.badgeText}>
              {badge}
            </Text>
          </View>
        </View>
        <Text variant="h2" tone="ink" style={styles.cardTitle}>
          {title}
        </Text>
        <Text variant="caption" tone="muted" style={styles.cardDesc}>
          {desc}
        </Text>
        <View style={styles.arrow}>
          <Ionicons name="arrow-forward" size={18} color={colors.onAccent} />
        </View>
      </Pressable>
    </Animated.View>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    content: { paddingHorizontal: space(3), paddingBottom: space(4) },
    title: { fontSize: 32, fontWeight: '800', letterSpacing: -0.6, marginTop: space(1) },
    subtitle: { marginTop: space(1), marginBottom: space(3) },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.xl,
      padding: space(2.5),
      marginBottom: space(2),
    },
    pressed: { opacity: 0.97, transform: [{ scale: 0.99 }] },
    cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    iconTile: {
      width: 56,
      height: 56,
      borderRadius: radius.md,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    badge: {
      backgroundColor: colors.accentSoft,
      paddingHorizontal: space(1.5),
      paddingVertical: space(0.75),
      borderRadius: radius.pill,
    },
    badgeText: { fontWeight: '800' },
    cardTitle: { fontSize: 20, fontWeight: '800', letterSpacing: -0.3, marginTop: space(2) },
    cardDesc: { marginTop: space(1), lineHeight: 19 },
    arrow: {
      alignSelf: 'flex-end',
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: space(1.5),
    },
  });
