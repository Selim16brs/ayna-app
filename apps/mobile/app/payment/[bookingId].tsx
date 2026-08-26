import { DEFAULT_SPEND_RULES, paymentSplit } from '@ayna/domain';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, Switch, View } from 'react-native';
import { api, type PaymentIntent, type PointsSpendRules } from '../../src/api';
import { formatPrice } from '../../src/data';
import { fillParams, useLocale } from '../../src/locale';
import { useStore } from '../../src/store';
import { type ColorTokens, radius, space } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import { Button, Screen, StackHeader, Text } from '../../src/ui';

// EK Z.8 — In-app Kaspi ödeme (simülasyon). §8.2 puan %50 tavanı.
export default function PaymentScreen() {
  const { t } = useLocale();
  const { colors, shadow } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const token = useStore((s) => s.token);
  const booking = useStore((s) => s.bookings.find((b) => b.id === bookingId));
  const hydrateLoyalty = useStore((s) => s.hydrateLoyalty);

  const amount = booking?.price ?? 0;
  const [balance, setBalance] = useState(0);
  const [spendRules, setSpendRules] = useState<PointsSpendRules | null>(null);
  const [usePoints, setUsePoints] = useState(false);
  const [paid, setPaid] = useState<PaymentIntent | null>(null);
  const [busy, setBusy] = useState(false);

  // K4 — tavan ve kilit SUNUCUDAN. Burada eskiden `amount * 0.5` sabiti vardı;
  // sunucu %25 uygularken ekran %50 gösteriyordu, yani kullanıcıya söz verilen
  // indirim ödeme anında yarıya düşecekti. Hesap sunucuyla aynı saf fonksiyon.
  const unlocked = spendRules?.unlocked ?? false;
  const maxPoints = useMemo(
    () =>
      paymentSplit(amount, balance, balance, unlocked ? new Date() : null, {
        unlockAt: spendRules?.unlockAt ?? DEFAULT_SPEND_RULES.unlockAt,
        capPct: spendRules?.capPct ?? DEFAULT_SPEND_RULES.capPct,
        commissionPct: spendRules?.commissionPct ?? DEFAULT_SPEND_RULES.commissionPct,
        subsidyCapPct: spendRules?.subsidyCapPct ?? DEFAULT_SPEND_RULES.subsidyCapPct,
      }).pointsUsed,
    [amount, balance, unlocked, spendRules],
  );
  const pointsApplied = usePoints ? maxPoints : 0;
  const cashDue = amount - pointsApplied;

  const load = useCallback(async () => {
    if (!token || !bookingId) return;
    try {
      const [sum, existing] = await Promise.all([
        api.loyalty(token),
        api.paymentFor(token, bookingId),
      ]);
      setBalance(sum.points);
      setSpendRules(sum.spend ?? null);
      if (existing?.status === 'paid') setPaid(existing);
    } catch {
      /* yut */
    }
  }, [token, bookingId]);

  useEffect(() => {
    void load();
  }, [load]);

  const pay = async () => {
    if (!token || !bookingId || busy) return;
    setBusy(true);
    try {
      const intent = await api.createPayment(token, bookingId, pointsApplied);
      const done = await api.confirmPayment(token, intent.id);
      setPaid(done);
      await hydrateLoyalty();
      Alert.alert(
        t('payment.success_title'),
        fillParams(t('payment.success_sub'), { ref: done.providerRef ?? '' }),
      );
    } catch {
      Alert.alert(t('payment.title'), t('payment.failed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen edges={['bottom']}>
      <StackHeader title={t('payment.title')} />
      <View style={styles.content}>
        {paid ? (
          <View style={styles.paidBox}>
            <View style={styles.paidIcon}>
              <Ionicons name="checkmark-circle" size={40} color={colors.sage} />
            </View>
            <Text variant="h2" tone="ink">
              {t('payment.paid')}
            </Text>
            <Text variant="caption" tone="muted">
              {paid.providerRef}
            </Text>
            <Button label={t('common.ok')} onPress={() => router.back()} />
          </View>
        ) : (
          <>
            <View style={[styles.card, shadow.soft]}>
              <Row label={t('payment.service_amount')} value={formatPrice(amount)} />
              {maxPoints > 0 ? (
                <View style={styles.pointsRow}>
                  <View style={styles.pointsText}>
                    <Text variant="bodyStrong" tone="ink">
                      {t('payment.use_points')}
                    </Text>
                    <Text variant="caption" tone="muted">
                      {fillParams(t('payment.points_hint'), { max: maxPoints })}
                    </Text>
                  </View>
                  <Switch
                    value={usePoints}
                    onValueChange={setUsePoints}
                    trackColor={{ true: colors.accent, false: colors.surfaceMuted }}
                  />
                </View>
              ) : null}
              {/* K4.2 — puanı olup da kullanamayan kullanıcı SEBEBİNİ görmeli.
                  Sürgünün sessizce kaybolması "puanım nerede?" sorusu üretir. */}
              {maxPoints === 0 && balance > 0 && !unlocked ? (
                <Text variant="caption" tone="muted" style={styles.lockNote}>
                  {fillParams(t('rewards.rules.unlock'), {
                    amount: (spendRules?.unlockAt ?? DEFAULT_SPEND_RULES.unlockAt).toLocaleString(
                      'tr-TR',
                    ),
                  })}
                </Text>
              ) : null}
              {pointsApplied > 0 ? (
                <Row
                  label={t('payment.points_applied')}
                  value={`− ${formatPrice(pointsApplied)}`}
                  tone="accentFg"
                />
              ) : null}
              <View style={styles.divider} />
              <Row label={t('payment.cash_due')} value={formatPrice(cashDue)} strong />
            </View>

            <Text variant="caption" tone="muted" style={styles.simNote}>
              {t('payment.sim_note')}
            </Text>

            <Button label={t('payment.pay_kaspi')} onPress={pay} disabled={busy || amount <= 0} />
          </>
        )}
      </View>
    </Screen>
  );
}

function Row({
  label,
  value,
  strong,
  tone,
}: {
  label: string;
  value: string;
  strong?: boolean;
  tone?: 'ink' | 'accentFg';
}) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.row}>
      <Text variant={strong ? 'bodyStrong' : 'body'} tone="inkSoft">
        {label}
      </Text>
      <Text variant={strong ? 'h2' : 'bodyStrong'} tone={tone ?? 'ink'}>
        {value}
      </Text>
    </View>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    content: { paddingHorizontal: space(3), paddingTop: space(2), gap: space(2) },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: space(2.5),
      gap: space(1.5),
    },
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    lockNote: { marginTop: 6 },
    pointsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: space(2),
    },
    pointsText: { flex: 1, gap: 2 },
    divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.line },
    simNote: { textAlign: 'center', paddingHorizontal: space(2) },
    paidBox: { alignItems: 'center', gap: space(1.5), paddingTop: space(8) },
    paidIcon: {
      width: 76,
      height: 76,
      borderRadius: radius.pill,
      backgroundColor: colors.sageSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
