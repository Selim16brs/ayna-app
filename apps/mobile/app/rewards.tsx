import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ScrollView, StyleSheet, View } from 'react-native';
import type { MessageKey } from '@ayna/i18n';
import { useLocale } from '../src/locale';
import { type ColorTokens, radius, space } from '../src/theme';
import { useTheme, useThemedStyles } from '../src/theme-context';
import { Screen, StackHeader, Text } from '../src/ui';

const POINTS = 340;
const TIER = 'Gümüş';
const BOOKINGS_LEFT = 3;
const PROGRESS = 0.62;
const RAFFLE_ENTRIES = 5;
const NEXT_DRAW = '30 Haziran';

type IoniconName = keyof typeof Ionicons.glyphMap;

const makeEarn = (
  colors: ColorTokens,
): { icon: IoniconName; key: MessageKey; pts: string; tone: string }[] => [
  { icon: 'calendar', key: 'rewards.earn.booking', pts: '+50', tone: colors.rose },
  { icon: 'star', key: 'rewards.earn.review', pts: '+20', tone: colors.gold },
  { icon: 'people', key: 'rewards.earn.referral', pts: '+100', tone: colors.teal },
  { icon: 'images', key: 'rewards.earn.photo', pts: '+15', tone: colors.plum },
];

const REDEEM: { icon: IoniconName; key: MessageKey }[] = [
  { icon: 'pricetag', key: 'rewards.redeem.discount' },
  { icon: 'sparkles', key: 'rewards.redeem.addon' },
  { icon: 'diamond', key: 'rewards.redeem.plus' },
];

export default function RewardsScreen() {
  const { t } = useLocale();
  const { colors, gradients, shadow } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const EARN = makeEarn(colors);

  return (
    <Screen edges={['top']}>
      <StackHeader title={t('rewards.title')} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Puan kartı */}
        <LinearGradient colors={gradients.rose} style={[styles.pointsCard, shadow.card]}>
          <View style={styles.pointsTop}>
            <Text variant="caption" tone="onColor" style={styles.dim}>
              {t('rewards.points')}
            </Text>
            <View style={styles.tierBadge}>
              <Ionicons name="medal" size={12} color={colors.onColor} />
              <Text variant="caption" tone="onColor" style={styles.tierText}>
                {TIER}
              </Text>
            </View>
          </View>
          <Text variant="display" tone="onColor">
            {POINTS}
          </Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${PROGRESS * 100}%` }]} />
          </View>
          <Text variant="caption" tone="onColor" style={styles.dim}>
            {t('rewards.next_tier')}: {BOOKINGS_LEFT} {t('rewards.bookings_left')}
          </Text>
        </LinearGradient>

        {/* Çekiliş */}
        <LinearGradient colors={gradients.plum} style={[styles.raffle, shadow.card]}>
          <Ionicons name="gift" size={30} color={colors.onColor} />
          <View style={styles.raffleBody}>
            <Text variant="h2" tone="onColor">
              {RAFFLE_ENTRIES} {t('rewards.raffle.entries')}
            </Text>
            <Text variant="caption" tone="onColor" style={styles.dim}>
              {t('rewards.raffle.next')}: {NEXT_DRAW}
            </Text>
            <Text variant="caption" tone="onColor" style={styles.dim}>
              {t('rewards.raffle.prize')}
            </Text>
          </View>
        </LinearGradient>

        {/* Nasıl kazanılır */}
        <Text variant="label" tone="rose" style={styles.section}>
          {t('rewards.earn.title')}
        </Text>
        <View style={styles.group}>
          {EARN.map((e, i) => (
            <View key={e.key} style={[styles.row, i < EARN.length - 1 && styles.rowBorder]}>
              <View style={[styles.icon, { backgroundColor: e.tone }]}>
                <Ionicons name={e.icon} size={17} color={colors.onColor} />
              </View>
              <Text variant="bodyStrong" tone="ink" style={styles.rowLabel}>
                {t(e.key)}
              </Text>
              <Text variant="bodyStrong" tone="rose">
                {e.pts}
              </Text>
            </View>
          ))}
        </View>

        {/* Kullan */}
        <Text variant="label" tone="rose" style={styles.section}>
          {t('rewards.redeem.title')}
        </Text>
        <View style={styles.group}>
          {REDEEM.map((r, i) => (
            <View key={r.key} style={[styles.row, i < REDEEM.length - 1 && styles.rowBorder]}>
              <View style={[styles.icon, { backgroundColor: colors.blue }]}>
                <Ionicons name={r.icon} size={17} color={colors.onColor} />
              </View>
              <Text variant="bodyStrong" tone="ink" style={styles.rowLabel}>
                {t(r.key)}
              </Text>
              <Ionicons name="chevron-forward" size={18} color={colors.muted} />
            </View>
          ))}
        </View>

        <View style={styles.note}>
          <Ionicons name="lock-closed" size={13} color={colors.muted} />
          <Text variant="caption" tone="muted" style={styles.noteText}>
            {t('rewards.note')}
          </Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    content: { paddingHorizontal: space(3), paddingBottom: space(4) },
    pointsCard: { borderRadius: radius.xl, padding: space(2.5) },
    pointsTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: space(0.5),
    },
    dim: { opacity: 0.9 },
    tierBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: 'rgba(255,255,255,0.22)',
      paddingHorizontal: space(1.25),
      paddingVertical: 4,
      borderRadius: radius.pill,
    },
    tierText: { fontWeight: '600' },
    progressTrack: {
      height: 6,
      borderRadius: 3,
      backgroundColor: 'rgba(255,255,255,0.3)',
      marginTop: space(1.5),
      marginBottom: space(1),
      overflow: 'hidden',
    },
    progressFill: { height: 6, borderRadius: 3, backgroundColor: colors.onColor },
    raffle: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(2),
      borderRadius: radius.lg,
      padding: space(2.5),
      marginTop: space(2),
    },
    raffleBody: { flex: 1, gap: 2 },
    section: { marginTop: space(3), marginBottom: space(1.5) },
    group: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.line,
      overflow: 'hidden',
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
    note: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1),
      marginTop: space(2.5),
      paddingHorizontal: space(1),
    },
    noteText: { flex: 1 },
  });
