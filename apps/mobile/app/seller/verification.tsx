import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { api } from '../../src/api';
import { useStore } from '../../src/store';
import { useLocale } from '../../src/locale';
import { type ColorTokens, radius, space } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import {
  Button,
  Screen,
  StackHeader,
  TAB_BAR_CLEARANCE,
  Text,
  TextInput,
  VerificationBadges,
} from '../../src/ui';
import type { MessageKey } from '@ayna/i18n';

type Verif = {
  verification: { identity: boolean; cert: boolean; social: boolean; business: boolean };
  aynaVerified: boolean;
  entityType: string;
  hasIin: boolean;
  socialInstagram: string;
  socialVerifyCode: string;
  kycStatus: string;
};

// §uzman onboarding Faz E4 — uzmanın katmanlı doğrulama durumu + Instagram sahiplik doğrulama.
// Kimlik = KYC (ayrı ekran); sertifika = admin; sosyal = kod-bio yöntemi (salon paralel).
export default function ExpertVerificationScreen() {
  const { t } = useLocale();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const token = useStore((s) => s.token);
  const [data, setData] = useState<Verif | null>(null);
  const [loading, setLoading] = useState(true);
  const [igUser, setIgUser] = useState('');
  const [igCode, setIgCode] = useState('');
  const [igBusy, setIgBusy] = useState(false);

  const load = useCallback(() => {
    if (!token) return;
    let alive = true;
    setLoading(true);
    void api
      .myVerification(token)
      .then((r) => {
        if (!alive) return;
        setData(r);
        if (r.socialInstagram) setIgUser(r.socialInstagram);
        if (r.socialVerifyCode) setIgCode(r.socialVerifyCode);
      })
      .catch(() => undefined)
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [token]);
  useFocusEffect(load);

  const genSocialCode = async () => {
    if (!token || igUser.trim().length < 1 || igBusy) return;
    setIgBusy(true);
    try {
      const r = await api.specialistSocialVerifyCode(token, igUser.trim());
      setIgCode(r.code);
    } catch {
      /* yoksay */
    } finally {
      setIgBusy(false);
    }
  };

  const v = data?.verification;
  // Katmanlı kontrol listesi: her katmanın etiketi + durumu + aksiyonu
  const rows: {
    key: MessageKey;
    on: boolean;
    icon: string;
    hint: MessageKey;
    onPress?: () => void;
  }[] = [
    {
      key: 'verify.identity',
      on: !!v?.identity,
      icon: 'person',
      hint: 'expert.verify.identity_d',
      onPress: () => router.push('/seller/kyc' as never),
    },
    { key: 'verify.cert', on: !!v?.cert, icon: 'ribbon', hint: 'expert.verify.cert_d' },
    {
      key: 'verify.social',
      on: !!v?.social,
      icon: 'share-social',
      hint: 'expert.verify.social_d',
    },
  ];

  return (
    <Screen edges={[]}>
      <StackHeader title={t('expert.verify.title')} />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: TAB_BAR_CLEARANCE }]}
        showsVerticalScrollIndicator={false}
      >
        {loading && !data ? (
          <ActivityIndicator color={colors.accent} style={{ marginTop: space(4) }} />
        ) : (
          <>
            {/* Üst durum kartı — AYNA Onaylı + doğrulanan katmanlar */}
            <View style={styles.hero}>
              <Ionicons
                name={data?.aynaVerified ? 'shield-checkmark' : 'shield-outline'}
                size={30}
                color={data?.aynaVerified ? colors.accentFg : colors.muted}
              />
              <Text variant="bodyStrong" tone="ink" style={styles.heroTitle}>
                {data?.aynaVerified ? t('verify.ayna') : t('expert.verify.not_yet')}
              </Text>
              <Text variant="caption" tone="muted" style={styles.heroSub}>
                {t('expert.verify.ayna_rule')}
              </Text>
              <VerificationBadges
                verification={
                  v
                    ? {
                        identity: v.identity,
                        business: v.business,
                        bin: v.business,
                        address: false,
                        social: v.social,
                        cert: v.cert,
                      }
                    : undefined
                }
                aynaVerified={data?.aynaVerified}
              />
            </View>

            {/* Katmanlı kontrol listesi */}
            <Text variant="bodyStrong" tone="ink" style={styles.section}>
              {t('expert.verify.layers')}
            </Text>
            {rows.map((r) => (
              <Pressable
                key={r.key}
                style={styles.layerRow}
                onPress={r.onPress}
                disabled={!r.onPress}
              >
                <View style={[styles.layerIcon, r.on && styles.layerIconOn]}>
                  <Ionicons
                    name={r.on ? 'checkmark' : (r.icon as never)}
                    size={18}
                    color={r.on ? colors.onAccent : colors.inkSoft}
                  />
                </View>
                <View style={styles.layerText}>
                  <Text variant="bodyStrong" tone="ink">
                    {t(r.key)}
                  </Text>
                  <Text variant="caption" tone="muted">
                    {t(r.hint)}
                  </Text>
                </View>
                {r.on ? (
                  <Text variant="caption" tone="accentFg" style={styles.layerOk}>
                    {t('expert.verify.done')}
                  </Text>
                ) : r.onPress ? (
                  <Ionicons name="chevron-forward" size={18} color={colors.muted} />
                ) : (
                  <Text variant="caption" tone="muted">
                    {t('expert.verify.pending')}
                  </Text>
                )}
              </Pressable>
            ))}

            {/* Instagram sahiplik doğrulama (kod-bio yöntemi) */}
            <Text variant="bodyStrong" tone="ink" style={styles.section}>
              {t('expert.verify.social_title')}
            </Text>
            {v?.social ? (
              <View style={styles.igVerified}>
                <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                <Text variant="body" tone="ink">
                  {t('expert.verify.social_ok')} @{data?.socialInstagram}
                </Text>
              </View>
            ) : (
              <>
                <Text variant="caption" tone="muted" style={styles.igHint}>
                  {t('expert.verify.social_hint')}
                </Text>
                <View style={styles.igRow}>
                  <View style={styles.igInput}>
                    <TextInput
                      value={igUser}
                      onChangeText={(x) => setIgUser(x.replace(/^@+/, ''))}
                      placeholder="kullanici_adi"
                      placeholderTextColor={colors.muted}
                      autoCapitalize="none"
                      autoCorrect={false}
                      style={styles.igField}
                    />
                  </View>
                  <Button
                    label={t('expert.verify.get_code')}
                    variant={igUser.trim() && !igBusy ? 'primary' : 'secondary'}
                    disabled={!igUser.trim() || igBusy}
                    onPress={genSocialCode}
                  />
                </View>
                {igCode ? (
                  <View style={styles.igCodeBox}>
                    <Text variant="caption" tone="muted">
                      {t('expert.verify.add_to_bio')}
                    </Text>
                    <Text variant="display" tone="accentFg" style={styles.igCode}>
                      {igCode}
                    </Text>
                    <Text variant="caption" tone="muted">
                      {t('expert.verify.pending_admin')}
                    </Text>
                  </View>
                ) : null}
              </>
            )}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    content: { paddingHorizontal: space(3), paddingTop: space(1) },
    hero: {
      alignItems: 'center',
      gap: space(0.75),
      padding: space(3),
      borderRadius: radius.xl,
      backgroundColor: colors.surfaceMuted,
    },
    heroTitle: { fontSize: 18, marginTop: space(0.5) },
    heroSub: { textAlign: 'center', lineHeight: 18 },
    section: { fontSize: 16, marginTop: space(3), marginBottom: space(1.5) },
    layerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1.5),
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: space(1.75),
      marginBottom: space(1),
    },
    layerIcon: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: colors.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    layerIconOn: { backgroundColor: colors.accent },
    layerText: { flex: 1, gap: 2 },
    layerOk: { fontWeight: '800' },
    igHint: { marginBottom: space(1.25), lineHeight: 18 },
    igRow: { flexDirection: 'row', alignItems: 'center', gap: space(1) },
    igInput: {
      flex: 1,
      height: 52,
      justifyContent: 'center',
      paddingHorizontal: space(2),
      borderRadius: radius.lg,
      backgroundColor: colors.surfaceMuted,
    },
    igField: { fontSize: 16, color: colors.ink },
    igCodeBox: {
      alignItems: 'center',
      gap: space(0.5),
      marginTop: space(1.5),
      padding: space(2.5),
      borderRadius: radius.lg,
      backgroundColor: colors.accentSoft,
    },
    igCode: { fontSize: 30, fontWeight: '900', letterSpacing: 2 },
    igVerified: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1),
      backgroundColor: colors.surfaceMuted,
      borderRadius: radius.lg,
      padding: space(2),
    },
  });
