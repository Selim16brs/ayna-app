import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ScrollView, StyleSheet, View } from 'react-native';
import type { MessageKey } from '@ayna/i18n';
import { useLocale } from '../../src/locale';
import { useStore } from '../../src/store';
import { radius, space, type ColorTokens } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import { Screen, StackHeader, Text } from '../../src/ui';

const BENEFITS: MessageKey[] = [
  'passport.benefit.priority',
  'passport.benefit.support',
  'passport.benefit.raffle',
];

export default function PassportScreen() {
  const { t } = useLocale();
  const { colors, gradients, shadow } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const completed = useStore((s) => s.bookings.filter((b) => b.status === 'completed').length);
  const reviews = useStore((s) => Object.values(s.userReviews).reduce((n, a) => n + a.length, 0));
  const points = useStore((s) => s.points);
  const trust = 92;

  return (
    <Screen edges={['top']}>
      <StackHeader title={t('passport.title')} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text variant="caption" tone="muted" style={styles.subtitle}>
          {t('passport.subtitle')}
        </Text>

        {/* Kimlik kartı */}
        <LinearGradient colors={gradients.rose} style={[styles.hero, shadow.card]}>
          <View style={styles.heroTop}>
            <View style={styles.avatar}>
              <Text variant="title" tone="onColor">
                A
              </Text>
            </View>
            <View style={styles.heroText}>
              <Text variant="h2" tone="onColor">
                Aigerim
              </Text>
              <View style={styles.verified}>
                <Ionicons name="shield-checkmark" size={13} color={colors.onColor} />
                <Text variant="caption" tone="onColor" style={styles.verifiedText}>
                  {t('passport.verified')}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.heroStats}>
            <HeroStat value={`${completed}`} label={t('passport.completed')} />
            <View style={styles.heroDivider} />
            <HeroStat value={`${reviews}`} label={t('passport.reviews')} />
            <View style={styles.heroDivider} />
            <HeroStat value={`${trust}`} label={t('passport.trust')} />
          </View>
        </LinearGradient>

        {/* Seviye + üyelik */}
        <View style={[styles.group, shadow.soft]}>
          <View style={[styles.row, styles.rowBorder]}>
            <View style={[styles.icon, { backgroundColor: colors.goldSoft }]}>
              <Ionicons name="medal-outline" size={18} color={colors.gold} />
            </View>
            <Text variant="bodyStrong" tone="ink" style={styles.rowLabel}>
              Gümüş
            </Text>
            <Text variant="bodyStrong" tone="gold">
              {points} {t('rewards.redeem.cost')}
            </Text>
          </View>
          <View style={styles.row}>
            <View style={[styles.icon, { backgroundColor: colors.lavenderSoft }]}>
              <Ionicons name="calendar-outline" size={18} color={colors.lavender} />
            </View>
            <Text variant="bodyStrong" tone="ink" style={styles.rowLabel}>
              {t('passport.member_since')}
            </Text>
            <Text variant="bodyStrong" tone="inkSoft">
              2024
            </Text>
          </View>
        </View>

        {/* Avantajlar */}
        <Text variant="label" tone="rose" style={styles.section}>
          {t('passport.benefits')}
        </Text>
        <View style={[styles.group, shadow.soft]}>
          {BENEFITS.map((b, i) => (
            <View key={b} style={[styles.row, i < BENEFITS.length - 1 && styles.rowBorder]}>
              <View style={[styles.icon, { backgroundColor: colors.successSoft }]}>
                <Ionicons name="checkmark-circle" size={18} color={colors.success} />
              </View>
              <Text variant="body" tone="ink" style={styles.rowLabel}>
                {t(b)}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}

function HeroStat({ value, label }: { value: string; label: string }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.heroStat}>
      <Text variant="title" tone="onColor">
        {value}
      </Text>
      <Text variant="caption" tone="onColor" style={styles.dim}>
        {label}
      </Text>
    </View>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    content: { paddingHorizontal: space(3), paddingBottom: space(4) },
    subtitle: { marginBottom: space(2) },
    hero: { borderRadius: radius.xl, padding: space(2.5) },
    heroTop: { flexDirection: 'row', alignItems: 'center', gap: space(2) },
    avatar: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: 'rgba(255,255,255,0.25)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    heroText: { gap: 4 },
    verified: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: 'rgba(255,255,255,0.22)',
      paddingHorizontal: space(1.25),
      paddingVertical: 3,
      borderRadius: radius.pill,
      alignSelf: 'flex-start',
    },
    verifiedText: { fontWeight: '600' },
    heroStats: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: space(2.5),
      paddingTop: space(2),
      borderTopWidth: 1,
      borderTopColor: 'rgba(255,255,255,0.25)',
    },
    heroStat: { flex: 1, alignItems: 'center', gap: 2 },
    heroDivider: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.3)' },
    dim: { opacity: 0.9, textAlign: 'center' },
    section: { marginTop: space(3), marginBottom: space(1.5) },
    group: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      overflow: 'hidden',
      marginTop: space(2),
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1.5),
      paddingHorizontal: space(1.75),
      paddingVertical: space(1.5),
    },
    rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.line },
    icon: {
      width: 38,
      height: 38,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowLabel: { flex: 1 },
  });
