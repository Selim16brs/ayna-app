import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Alert, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import {
  POINTS_EXPIRY_DAYS,
  POINTS_SPEND_CAP_PCT,
  POINTS_UNLOCK_KZT,
  formatPrice,
  RAFFLE_COST,
  REWARDS,
  type Reward,
} from '../src/data';
import { api } from '../src/api';
import { fillParams, useLocale } from '../src/locale';
import { useStore } from '../src/store';
import { type ColorTokens, radius, space, font } from '../src/theme';
import { useTheme, useThemedStyles } from '../src/theme-context';
import type { MessageKey } from '@ayna/i18n';
import {
  PressableScale,
  Progress,
  Screen,
  SectionHeader,
  StackHeader,
  Text,
  TAB_BAR_CLEARANCE,
} from '../src/ui';

const NEXT_DRAW = '30 Haziran';
// Keşfet canlı aksan paleti — ödül/çekiliş görsel-zengin kartlar
const TIER_LABEL: Record<'bronze' | 'silver' | 'gold', MessageKey> = {
  bronze: 'rewards.tier.bronze',
  silver: 'rewards.tier.silver',
  gold: 'rewards.tier.gold',
};

type IoniconName = keyof typeof Ionicons.glyphMap;

export default function RewardsScreen() {
  const { t } = useLocale();
  const { colors, shadow, gradients } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const router = useRouter();
  const token = useStore((st) => st.token);
  const avatarUri = useStore((st) => st.avatarUri);
  // Davet ödülü sunucudan — istemcide sabit tutmak, oran değişince ekranın
  // yanlış sayı göstermesi demekti.
  const [referralPoints, setReferralPoints] = useState<string>('');
  useEffect(() => {
    if (!token) return;
    let alive = true;
    void api
      .referralMine(token)
      .then((d) => {
        if (alive) setReferralPoints(String(d.rewardPoints));
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [token]);

  const points = useStore((s) => s.points);
  // K4.5 — kurallar SUNUCUDAN gelir; sunucu okunmadıysa yerel yedek kullanılır.
  const spend = useStore((st) => st.pointsSpend);
  const rates = useStore((st) => st.config.rates);
  // §5 — TEK tavan: "işlem başına biriken puanın en çok %25'i". Burada ikinci
  // bir sınır (sübvansiyon tavanı) daha hesaplanıyordu; brief'te öyle bir kural
  // yok ve iki tavanın küçüğünü göstermek ekranla sunucuyu ayrıştırıyordu.
  const capPct = spend?.capPct ?? rates.pointsCapPct ?? POINTS_SPEND_CAP_PCT;
  const unlockAt = spend?.unlockAt ?? rates.pointsUnlockKzt ?? POINTS_UNLOCK_KZT;
  const expiryDays = spend?.expiryDays ?? rates.pointsExpiryDays ?? POINTS_EXPIRY_DAYS;
  // §5 — kazanım hizmet bedelinin %1'i (eski %3 modeli geçersiz, brief §10).
  const earnPct = 1;
  // Sunucu `spend` göndermiyorsa (henüz güncellenmemiş API) kilit kavramı da
  // YOKTUR — o durumda "kilitli" göstermek yanlış olur. Ödeme kararını zaten
  // sunucu veriyor; istemci yalnız gösteriyor.
  const unlocked = spend ? spend.unlocked : true;
  const remainingToUnlock = spend?.remainingToUnlock ?? Math.max(0, unlockAt - points);
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
          Alert.alert(
            enterRaffle() ? t('rewards.raffle.joined') : t('rewards.redeem.insufficient'),
          ),
      },
    ]);
  };

  // §11 — sunucudan türetilen seviye; yoksa makul varsayılan
  const tierKey = tier?.key ?? 'bronze';
  const progress = tier?.progress ?? 0;
  const pointsToNext = tier?.pointsToNext ?? 0;
  const isMaxTier = tier?.next == null;

  const onRedeem = (r: Reward) => {
    // Polish 1.5 — harcama tutarı onay diyaloğunda GÖRÜNÜR (kaç puan, ne için)
    Alert.alert(
      t('rewards.redeem.confirm'),
      fillParams(t('rewards.redeem.confirm_b'), { cost: String(r.cost), title: t(r.titleKey) }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.continue'),
          onPress: async () => {
            if (await redeem(r)) Alert.alert(t('rewards.redeem.success'));
            else Alert.alert(t('rewards.redeem.insufficient'));
          },
        },
      ],
    );
  };

  return (
    <Screen edges={[]}>
      <StackHeader title={t('rewards.title')} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Puan kartı — görsel-zengin mor kart, ışıltı halkaları */}
        <LinearGradient
          colors={gradients.plum}
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
          {/* PUAN ÇIPLAK DURMAZ — kanvas kuralı. Kodda doğrulandı:
              app/payment/[bookingId].tsx cashDue = amount - pointsApplied,
              yani 1 puan = 1 ₸. Kur/çeviri yok. */}
          <View style={styles.pointsRow}>
            <Text style={styles.pointsBig}>{points.toLocaleString('tr-TR')}</Text>
            <View style={styles.worth}>
              <Text style={styles.worthValue} numeric>
                = {formatPrice(points)}
              </Text>
              <Text variant="micro" tone="onColor" style={styles.dim} numberOfLines={2}>
                {t('rewards.worth')}
              </Text>
            </View>
          </View>
          {/* K4.2 — kilit durumu puanın hemen yanında. "Puanım var ama
              harcayamıyorum" sürprizi ödeme ekranında değil BURADA çözülür. */}
          <View style={styles.lockRow}>
            <Ionicons
              name={unlocked ? 'lock-open' : 'lock-closed'}
              size={13}
              color={colors.onColor}
            />
            <Text variant="micro" tone="onColor" style={styles.dim} numberOfLines={2}>
              {unlocked
                ? t('rewards.unlocked')
                : fillParams(t('rewards.locked'), {
                    remaining: remainingToUnlock.toLocaleString('tr-TR'),
                  })}
            </Text>
          </View>
          {!unlocked ? (
            <Progress
              value={Math.min(1, points / Math.max(1, unlockAt))}
              height={5}
              color={colors.onColor}
              track={colors.onColor + '33'}
            />
          ) : null}
          <View style={styles.progressWrap}>
            <Progress
              value={progress}
              height={7}
              color={colors.onColor}
              track="rgba(255,255,255,0.28)"
            />
          </View>
          <Text variant="caption" tone="onColor" style={styles.dim}>
            {fillParams(t('rewards.rate_note'), { cap: String(POINTS_SPEND_CAP_PCT) })}
          </Text>
          <Text variant="caption" tone="onColor" style={styles.dim}>
            {isMaxTier
              ? t('rewards.tier.max')
              : `${t('rewards.next_tier')}: ${pointsToNext} ${t('rewards.points_to_next')}`}
          </Text>
        </LinearGradient>

        {/* Çekiliş kartı.
            Yazı `onColor` (sabit beyaz) idi ve gül gradyanın açık ucunda
            2.94:1 ölçülüyordu — İKİ TEMADA da okunmuyordu. Artık gradyanla
            aynı token setinden (`onAccent`): açıkta beyazımsı, koyuda koyu. */}
        <LinearGradient
          colors={gradients.rose}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.raffle, shadow.card]}
        >
          <View style={styles.raffleIcon}>
            <Ionicons name="gift" size={28} color={colors.onAccent} />
          </View>
          <View style={styles.raffleBody}>
            <Text variant="h2" tone="onAccent" style={styles.raffleTitle}>
              {raffleEntries} {t('rewards.raffle.entries')}
            </Text>
            <Text variant="caption" tone="onAccent" style={styles.dim}>
              {t('rewards.raffle.next')}: {NEXT_DRAW}
            </Text>
            <Text variant="caption" tone="onAccent" style={styles.dim}>
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
                    style={{
                      color: affordable ? colors.onAccent : colors.muted,
                      fontFamily: font.semibold,
                    }}
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

        {/* K4.5 — dört kural da kullanıcıya AÇIKÇA gösterilir. Sayılar sunucudan
            gelir; ekranda sabit yazılı bir değer yok. */}
        <SectionHeader title={t('rewards.rules.title')} />
        <View style={[styles.group, shadow.soft]}>
          <RuleRow
            icon="cash-outline"
            text={fillParams(t('rewards.rules.earn'), { pct: String(earnPct) })}
          />
          <RuleRow
            icon="lock-open-outline"
            text={fillParams(t('rewards.rules.unlock'), {
              amount: unlockAt.toLocaleString('tr-TR'),
            })}
          />
          <RuleRow
            icon="pie-chart-outline"
            text={fillParams(t('rewards.rules.cap'), {
              pct: capPct.toLocaleString('tr-TR', { maximumFractionDigits: 1 }),
            })}
          />
          <RuleRow
            icon="hourglass-outline"
            text={fillParams(t('rewards.rules.expire'), { days: String(expiryDays) })}
          />
          <RuleRow icon="people-outline" text={t('rewards.rules.channels')} last />
        </View>

        {/* ═══ DAVET — kanvas Puanlar.dc.html §davet ═══
            Kanvasta vardı ama koda hiç girmemişti: puan ekranından davet
            akışına giden yol yoktu. D9 ile ödül artık davet edilenin İLK
            TAMAMLANMIŞ randevusuna bağlı, dolayısıyla kullanıcının bu akışı
            bulabilmesi daha da önemli. */}
        <SectionHeader title={t('referral.title')} />
        <PressableScale
          style={[styles.inviteCard, shadow.soft]}
          onPress={() => router.push('/referral')}
        >
          <View style={styles.inviteTop}>
            <View style={styles.inviteAvatar}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.inviteAvatarImg} />
              ) : (
                <Ionicons name="people" size={22} color={colors.accent} />
              )}
            </View>
            <View style={styles.flex1}>
              <Text variant="title" tone="ink">
                {t('referral.title')}
              </Text>
              <Text variant="caption" tone="muted" style={styles.inviteSub}>
                {fillParams(t('referral.subtitle'), { points: referralPoints })}
              </Text>
            </View>
          </View>
          <LinearGradient
            colors={[colors.accent, colors.ink]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.inviteCta}
          >
            <Ionicons name="share-social-outline" size={17} color={colors.onAccent} />
            <Text variant="cta" tone="onAccent">
              {t('referral.share')}
            </Text>
          </LinearGradient>
          {/* Rehber okuma endişesini ÖNCEDEN yanıtla — kanvas kuralı */}
          <Text variant="micro" tone="muted" style={styles.inviteNote}>
            {t('referral.privacy_note')}
          </Text>
        </PressableScale>

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
    content: {
      paddingHorizontal: space(3),
      paddingTop: space(2),
      paddingBottom: TAB_BAR_CLEARANCE,
    },
    raffleJoin: {
      /*
       * Gül kartın üstündeki yarı saydam hap. Sabit BEYAZ %22 idi; koyu
       * temada gül artık AÇIK olduğu için beyaz perde kartı büsbütün
       * açıyor ve üstündeki beyaz yazıyı yok ediyordu. `onAccent`
       * temayla dönüyor: açıkta beyazımsı perde, koyuda koyu perde —
       * ikisi de kendi yazısıyla zıt.
       */
      backgroundColor: colors.onAccent + '38',
      paddingHorizontal: space(1.75),
      paddingVertical: space(1),
      borderRadius: radius.pill,
      alignItems: 'center',
    },
    raffleJoinOff: { opacity: 0.5 },
    raffleJoinText: { color: colors.onAccent, fontFamily: font.semibold },
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
    lockRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: space(1) },
    pointsRow: { flexDirection: 'row', alignItems: 'flex-end', gap: space(1.5) },
    worth: { flex: 1, paddingBottom: space(0.75), gap: 1 },
    worthValue: { color: colors.onColor, fontFamily: font.semibold, fontSize: 20, lineHeight: 25 },
    pointsBig: {
      fontSize: 46,
      lineHeight: 50,
      fontFamily: font.semibold,
      letterSpacing: -1,
      color: colors.onColor,
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
    tierText: { fontFamily: font.semibold },
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
    raffleTitle: { fontSize: 22, fontFamily: font.semibold, letterSpacing: -0.4 },
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
    rowName: { fontSize: 15, fontFamily: font.semibold, letterSpacing: -0.2 },
    redeemBtn: {
      backgroundColor: colors.accent,
      paddingHorizontal: space(1.75),
      paddingVertical: space(1),
      borderRadius: radius.pill,
    },
    redeemBtnOff: { backgroundColor: colors.surfaceMuted },
    flex1: { flex: 1 },
    inviteCard: {
      marginHorizontal: space(2.5),
      padding: space(2),
      borderRadius: radius.lg,
      backgroundColor: colors.surface,
      gap: space(1.625),
    },
    inviteTop: { flexDirection: 'row', alignItems: 'center', gap: space(1.5) },
    inviteAvatar: {
      width: 54,
      height: 54,
      borderRadius: 18,
      backgroundColor: colors.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    inviteAvatarImg: { width: 54, height: 54 },
    inviteSub: { marginTop: 4, lineHeight: 19 },
    inviteCta: {
      height: 54,
      borderRadius: 27,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: space(1),
    },
    inviteNote: { textAlign: 'center', lineHeight: 17 },
    note: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1),
      marginTop: space(2.5),
      paddingHorizontal: space(1),
    },
    noteText: { flex: 1 },
  });
