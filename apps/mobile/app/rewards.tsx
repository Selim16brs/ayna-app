import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { POINTS_EXPIRY_MONTHS, POINTS_SPEND_CAP_PCT, RAFFLE_COST, REWARDS, type Reward } from '../src/data';
import { useLocale } from '../src/locale';
import { useStore } from '../src/store';
import { type ColorTokens, radius, space } from '../src/theme';
import { useTheme, useThemedStyles } from '../src/theme-context';
import type { MessageKey } from '@ayna/i18n';
import { Progress, Screen, SectionHeader, StackHeader, Text } from '../src/ui';

const NEXT_DRAW = '30 Haziran';
// Keşfet canlı aksan paleti — ödül/çekiliş görsel-zengin kartlar
const POINTS_GRAD: readonly [string, string] = ['#B06CFF', '#8A4FE0'];
const RAFFLE_GRAD: readonly [string, string] = ['#FF2E93', '#D81F7A'];
const TIER_LABEL: Record<'bronze' | 'silver' | 'gold', MessageKey> = {
  bronze: 'rewards.tier.bronze',
  silver: 'rewards.tier.silver',
  gold: 'rewards.tier.gold',
};

type IoniconName = keyof typeof Ionicons.glyphMap;

export default function RewardsScreen() {
  const { t } = useLocale();
  const { colors, shadow } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const points = useStore((s) => s.points);
  const raffleEntries = useStore((s) => s.raffleEntries);
  const tier = useStore((s) => s.tier);
  const ledger = useStore((s) => s.ledger);
  const redeem = useStore((s) => s.redeem);
  const enterRaffle = useStore((s) => s.enterRaffle);

  const onJoinRaffle = () => {
    Alert.alert(t('rewards.raffle.join_confirm'), t('rewards.raffle.cost'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('rewards.raffle.join'),
        onPress: () =>
          Alert.alert(enterRaffle() ? t('rewards.raffle.joined') : t('rewards.redeem.insufficient')),
      },
    ]);
  };

  // §11 — sunucudan türetilen seviye; yoksa makul varsayılan
  const tierKey = tier?.key ?? 'bronze';
  const progress = tier?.progress ?? 0;
  const pointsToNext = tier?.pointsToNext ?? 0;
  const isMaxTier = tier?.next == null;

  const onRedeem = (r: Reward) => {
    Alert.alert(t('rewards.redeem.confirm'), undefined, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.continue'),
        onPress: async () => {
          if (await redeem(r)) Alert.alert(t('rewards.redeem.success'));
          else Alert.alert(t('rewards.redeem.insufficient'));
        },
      },
    ]);
  };

  return (
    <Screen edges={[]}>
      <StackHeader title={t('rewards.title')} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Puan kartı — görsel-zengin mor kart, ışıltı halkaları */}
        <LinearGradient
          colors={POINTS_GRAD}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.pointsCard, shadow.card]}
        >
          <View style={styles.glowA} />
          <View style={styles.glowB} />
          <View style={styles.pointsTop}>
            <Text variant="caption" tone="onColor" style={styles.dim}>
              {t('rewards.points')}
            </Text>
            <View style={styles.tierBadge}>
              <Ionicons name="medal" size={13} color={colors.onColor} />
              <Text variant="caption" tone="onColor" style={styles.tierText}>
                {t(TIER_LABEL[tierKey])}
              </Text>
            </View>
          </View>
          <Text style={styles.pointsBig}>{points}</Text>
          <View style={styles.progressWrap}>
            <Progress
              value={progress}
              height={7}
              color={colors.onColor}
              track="rgba(255,255,255,0.28)"
            />
          </View>
          <Text variant="caption" tone="onColor" style={styles.dim}>
            {isMaxTier
              ? t('rewards.tier.max')
              : `${t('rewards.next_tier')}: ${pointsToNext} ${t('rewards.points_to_next')}`}
          </Text>
        </LinearGradient>

        {/* Çekiliş — görsel-zengin pembe kart */}
        <LinearGradient
          colors={RAFFLE_GRAD}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.raffle, shadow.card]}
        >
          <View style={styles.raffleIcon}>
            <Ionicons name="gift" size={28} color="#FFFFFF" />
          </View>
          <View style={styles.raffleBody}>
            <Text variant="h2" tone="onColor" style={styles.raffleTitle}>
              {raffleEntries} {t('rewards.raffle.entries')}
            </Text>
            <Text variant="caption" tone="onColor" style={styles.dim}>
              {t('rewards.raffle.next')}: {NEXT_DRAW}
            </Text>
            <Text variant="caption" tone="onColor" style={styles.dim}>
              {t('rewards.raffle.prize')}
            </Text>
          </View>
          <Pressable
            style={[styles.raffleJoin, points < RAFFLE_COST && styles.raffleJoinOff]}
            disabled={points < RAFFLE_COST}
            onPress={onJoinRaffle}
          >
            <Text variant="caption" style={styles.raffleJoinText}>
              {t('rewards.raffle.join')}
            </Text>
            <Text variant="caption" style={styles.raffleJoinSub}>
              {RAFFLE_COST}
            </Text>
          </Pressable>
        </LinearGradient>

        {/* §8.2 — son kullanma uyarısı (12 ay hareketsizse yanar) */}
        {points > 0 ? (
          <View style={styles.expiryBanner}>
            <Ionicons name="hourglass-outline" size={16} color={colors.gold} />
            <Text variant="caption" tone="ink" style={styles.expiryText}>
              {t('rewards.expiry_warn')}
            </Text>
          </View>
        ) : null}

        {/* Kullan */}
        <SectionHeader title={t('rewards.redeem.title')} />
        <View style={[styles.group, shadow.soft]}>
          {REWARDS.map((r, i) => {
            const affordable = points >= r.cost;
            return (
              <View key={r.id} style={[styles.row, i < REWARDS.length - 1 && styles.rowBorder]}>
                <View style={[styles.icon, { backgroundColor: colors.accentSoft }]}>
                  <Ionicons name={r.icon as IoniconName} size={19} color={colors.onAccent} />
                </View>
                <View style={styles.rowLabel}>
                  <Text variant="bodyStrong" tone="ink" style={styles.rowName}>
                    {t(r.titleKey)}
                  </Text>
                  <Text variant="caption" tone="muted">
                    {r.cost} {t('rewards.redeem.cost')}
                  </Text>
                </View>
                <Pressable
                  disabled={!affordable}
                  onPress={() => onRedeem(r)}
                  style={[styles.redeemBtn, !affordable && styles.redeemBtnOff]}
                >
                  <Text
                    variant="caption"
                    style={{ color: affordable ? colors.onAccent : colors.muted, fontWeight: '800' }}
                  >
                    {t('rewards.redeem.use')}
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </View>

        {/* Puan geçmişi */}
        <SectionHeader title={t('rewards.ledger.title')} />
        <View style={[styles.group, shadow.soft]}>
          {ledger.map((e, i) => (
            <View key={e.id} style={[styles.row, i < ledger.length - 1 && styles.rowBorder]}>
              <View
                style={[
                  styles.icon,
                  { backgroundColor: e.kind === 'earn' ? colors.successSoft : colors.surfaceMuted },
                ]}
              >
                <Ionicons
                  name={e.kind === 'earn' ? 'arrow-up' : 'arrow-down'}
                  size={16}
                  color={e.kind === 'earn' ? colors.success : colors.muted}
                />
              </View>
              <View style={styles.rowLabel}>
                <Text variant="bodyStrong" tone="ink" style={styles.rowName}>
                  {t(e.labelKey)}
                </Text>
                <Text variant="caption" tone="muted" numberOfLines={1}>
                  {e.detail} · {e.dateLabel}
                </Text>
              </View>
              <Text
                variant="bodyStrong"
                style={{ color: e.kind === 'earn' ? colors.success : colors.muted }}
              >
                {e.points > 0 ? `+${e.points}` : e.points}
              </Text>
            </View>
          ))}
        </View>

        {/* §8.1/8.2 — puan kuralları (şeffaflık) */}
        <SectionHeader title={t('rewards.rules.title')} />
        <View style={[styles.group, shadow.soft]}>
          <RuleRow icon="cash-outline" text={t('rewards.rules.earn')} />
          <RuleRow icon="people-outline" text={t('rewards.rules.channels')} />
          <RuleRow icon="pie-chart-outline" text={`${t('rewards.rules.cap')} (%${POINTS_SPEND_CAP_PCT})`} />
          <RuleRow icon="hourglass-outline" text={`${t('rewards.rules.expire')} (${POINTS_EXPIRY_MONTHS} ay)`} last />
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

function RuleRow({ icon, text, last }: { icon: IoniconName; text: string; last?: boolean }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={[styles.row, !last && styles.rowBorder]}>
      <View style={[styles.icon, { backgroundColor: colors.accentSoft }]}>
        <Ionicons name={icon} size={18} color={colors.accentFg} />
      </View>
      <Text variant="caption" tone="ink" style={styles.ruleText}>
        {text}
      </Text>
    </View>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    content: { paddingHorizontal: space(3), paddingTop: space(2), paddingBottom: space(13) },
    raffleJoin: {
      backgroundColor: 'rgba(255,255,255,0.22)',
      paddingHorizontal: space(1.75),
      paddingVertical: space(1),
      borderRadius: radius.pill,
      alignItems: 'center',
    },
    raffleJoinOff: { opacity: 0.5 },
    raffleJoinText: { color: '#FFFFFF', fontWeight: '800' },
    raffleJoinSub: { color: 'rgba(255,255,255,0.9)', fontSize: 10 },
    expiryBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1),
      backgroundColor: colors.goldSoft,
      borderRadius: radius.lg,
      padding: space(1.75),
      marginTop: space(2),
    },
    expiryText: { flex: 1 },
    ruleText: { flex: 1, lineHeight: 18 },
    pointsCard: { borderRadius: radius.xl, padding: space(3), overflow: 'hidden' },
    glowA: {
      position: 'absolute',
      top: -40,
      right: -30,
      width: 150,
      height: 150,
      borderRadius: 75,
      backgroundColor: 'rgba(255,255,255,0.14)',
    },
    glowB: {
      position: 'absolute',
      bottom: -50,
      left: -20,
      width: 130,
      height: 130,
      borderRadius: 65,
      backgroundColor: 'rgba(255,255,255,0.08)',
    },
    pointsTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: space(0.5),
    },
    pointsBig: {
      fontSize: 46,
      lineHeight: 50,
      fontWeight: '800',
      letterSpacing: -1,
      color: '#FFFFFF',
      marginTop: space(0.5),
    },
    dim: { opacity: 0.92 },
    tierBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: 'rgba(255,255,255,0.24)',
      paddingHorizontal: space(1.5),
      paddingVertical: 5,
      borderRadius: radius.pill,
    },
    tierText: { fontWeight: '700' },
    progressWrap: { marginTop: space(2), marginBottom: space(1.25) },
    raffle: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(2),
      borderRadius: radius.lg,
      padding: space(2.5),
      marginTop: space(2),
      overflow: 'hidden',
    },
    raffleIcon: {
      width: 58,
      height: 58,
      borderRadius: 29,
      backgroundColor: 'rgba(255,255,255,0.22)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    raffleTitle: { fontSize: 22, fontWeight: '800', letterSpacing: -0.4 },
    raffleBody: { flex: 1, gap: 3 },
    group: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      overflow: 'hidden',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1.5),
      paddingHorizontal: space(2),
      paddingVertical: space(1.75),
    },
    rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.line },
    icon: {
      width: 44,
      height: 44,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowLabel: { flex: 1, gap: 3 },
    rowName: { fontSize: 15, fontWeight: '800', letterSpacing: -0.2 },
    redeemBtn: {
      backgroundColor: colors.accent,
      paddingHorizontal: space(1.75),
      paddingVertical: space(1),
      borderRadius: radius.pill,
    },
    redeemBtnOff: { backgroundColor: colors.surfaceMuted },
    note: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1),
      marginTop: space(2.5),
      paddingHorizontal: space(1),
    },
    noteText: { flex: 1 },
  });
