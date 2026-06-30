import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { REWARDS, type Reward } from '../src/data';
import { useLocale } from '../src/locale';
import { useStore } from '../src/store';
import { type ColorTokens, radius, space } from '../src/theme';
import { useTheme, useThemedStyles } from '../src/theme-context';
import { Progress, Screen, StackHeader, Text } from '../src/ui';

const TIER = 'Gümüş';
const PROGRESS = 0.62;
const BOOKINGS_LEFT = 3;
const NEXT_DRAW = '30 Haziran';

type IoniconName = keyof typeof Ionicons.glyphMap;

export default function RewardsScreen() {
  const { t } = useLocale();
  const { colors, gradients, shadow } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const points = useStore((s) => s.points);
  const raffleEntries = useStore((s) => s.raffleEntries);
  const ledger = useStore((s) => s.ledger);
  const redeem = useStore((s) => s.redeem);

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
            {points}
          </Text>
          <View style={styles.progressWrap}>
            <Progress
              value={PROGRESS}
              height={6}
              color={colors.onColor}
              track="rgba(255,255,255,0.3)"
            />
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
              {raffleEntries} {t('rewards.raffle.entries')}
            </Text>
            <Text variant="caption" tone="onColor" style={styles.dim}>
              {t('rewards.raffle.next')}: {NEXT_DRAW}
            </Text>
            <Text variant="caption" tone="onColor" style={styles.dim}>
              {t('rewards.raffle.prize')}
            </Text>
          </View>
        </LinearGradient>

        {/* Kullan */}
        <Text variant="label" tone="rose" style={styles.section}>
          {t('rewards.redeem.title')}
        </Text>
        <View style={styles.group}>
          {REWARDS.map((r, i) => {
            const affordable = points >= r.cost;
            return (
              <View key={r.id} style={[styles.row, i < REWARDS.length - 1 && styles.rowBorder]}>
                <View style={[styles.icon, { backgroundColor: colors.blue }]}>
                  <Ionicons name={r.icon as IoniconName} size={17} color={colors.onColor} />
                </View>
                <View style={styles.rowLabel}>
                  <Text variant="bodyStrong" tone="ink">
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
                    style={{ color: affordable ? colors.onColor : colors.muted, fontWeight: '600' }}
                  >
                    {t('rewards.redeem.use')}
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </View>

        {/* Puan geçmişi */}
        <Text variant="label" tone="rose" style={styles.section}>
          {t('rewards.ledger.title')}
        </Text>
        <View style={styles.group}>
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
                <Text variant="bodyStrong" tone="ink">
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
    progressWrap: { marginTop: space(1.5), marginBottom: space(1) },
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
    rowLabel: { flex: 1, gap: 2 },
    redeemBtn: {
      backgroundColor: colors.rose,
      paddingHorizontal: space(1.5),
      paddingVertical: space(0.75),
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
