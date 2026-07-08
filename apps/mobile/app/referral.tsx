import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Share, StyleSheet, View } from 'react-native';
import { api, type MyReferral } from '../src/api';
import { fillParams, useLocale } from '../src/locale';
import { useStore } from '../src/store';
import { type ColorTokens, radius, space } from '../src/theme';
import { useTheme, useThemedStyles } from '../src/theme-context';
import { Button, Screen, StackHeader, TAB_BAR_CLEARANCE, Text, TextInput } from '../src/ui';

// EK Z.6 — Müşteri referans programı: kendi kodunu paylaş + arkadaş kodunu kullan.
export default function ReferralScreen() {
  const { t } = useLocale();
  const { colors, shadow } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const token = useStore((s) => s.token);
  const hydrateLoyalty = useStore((s) => s.hydrateLoyalty);

  const [data, setData] = useState<MyReferral | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setData(await api.referralMine(token));
    } catch {
      /* yut */
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const share = async () => {
    if (!data) return;
    await Share.share({
      message: fillParams(t('referral.share_message'), { code: data.code, points: data.rewardPoints }),
    });
  };

  const redeem = async () => {
    const c = code.trim();
    if (!token || c.length < 4 || busy) return;
    setBusy(true);
    try {
      const res = await api.redeemReferral(token, c);
      setCode('');
      await Promise.all([load(), hydrateLoyalty()]);
      Alert.alert(
        t('referral.redeemed_title'),
        fillParams(t('referral.redeemed_sub'), { points: res.pointsAwarded, name: res.referrerName }),
      );
    } catch {
      Alert.alert(t('referral.title'), t('referral.redeem_failed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen edges={['bottom']}>
      <StackHeader title={t('referral.title')} />
      <View style={styles.content}>
        <Text variant="body" tone="inkSoft" style={styles.subtitle}>
          {data ? fillParams(t('referral.subtitle'), { points: data.rewardPoints }) : ''}
        </Text>

        {/* Kod kartı */}
        <View style={[styles.codeCard, shadow.card]}>
          <Text variant="caption" tone="onAccent" style={styles.codeLabel}>
            {t('referral.your_code')}
          </Text>
          <Text variant="display" tone="onAccent" style={styles.code}>
            {data?.code ?? '••••••'}
          </Text>
          <View style={styles.stats}>
            <Stat value={String(data?.invited ?? 0)} label={t('referral.invited')} />
            <View style={styles.statDivider} />
            <Stat value={String(data?.pointsEarned ?? 0)} label={t('referral.points_earned')} />
          </View>
        </View>

        <Button label={t('referral.share')} onPress={share} />

        {/* Kod kullan */}
        <View style={styles.redeemBox}>
          <Text variant="bodyStrong" tone="ink">
            {t('referral.have_code')}
          </Text>
          <View style={styles.redeemRow}>
            <TextInput
              value={code}
              onChangeText={(v) => setCode(v.toUpperCase())}
              placeholder={t('referral.enter_code')}
              placeholderTextColor={colors.muted}
              autoCapitalize="characters"
              style={styles.input}
            />
            <Button label={t('referral.redeem')} variant="secondary" onPress={redeem} disabled={busy || code.trim().length < 4} />
          </View>
        </View>
      </View>
    </Screen>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.stat}>
      <Text variant="h2" tone="onAccent">
        {value}
      </Text>
      <Text variant="caption" tone="onAccent" style={styles.statLabel}>
        {label}
      </Text>
    </View>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    content: { paddingHorizontal: space(3), paddingTop: space(2), paddingBottom: TAB_BAR_CLEARANCE, gap: space(2) },
    subtitle: {},
    codeCard: {
      backgroundColor: colors.accent,
      borderRadius: radius.xl,
      padding: space(3),
      alignItems: 'center',
      gap: space(0.5),
    },
    codeLabel: { opacity: 0.9, letterSpacing: 1 },
    code: { letterSpacing: 6, marginBottom: space(1) },
    stats: { flexDirection: 'row', alignItems: 'center', gap: space(2), marginTop: space(1) },
    stat: { alignItems: 'center' },
    statLabel: { opacity: 0.9 },
    statDivider: { width: StyleSheet.hairlineWidth, height: 32, backgroundColor: 'rgba(255,255,255,0.4)' },
    redeemBox: { gap: space(1), marginTop: space(1) },
    redeemRow: { flexDirection: 'row', alignItems: 'center', gap: space(1) },
    input: {
      flex: 1,
      backgroundColor: colors.surfaceMuted,
      borderRadius: radius.md,
      paddingHorizontal: space(1.75),
      height: 48,
      color: colors.ink,
      fontSize: 16,
      letterSpacing: 2,
    },
  });
