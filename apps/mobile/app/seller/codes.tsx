import { useCallback, useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Alert, Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import { api, type SellerInviteCode } from '../../src/api';
import { useLocale } from '../../src/locale';
import { useStore } from '../../src/store';
import { type ColorTokens, radius, space } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import { Button, Screen, StackHeader, Text } from '../../src/ui';

// UTC ISO → yerel "GG.AA HH:MM"; geçmiş ise null
function formatExpiry(iso?: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}.${p(d.getMonth() + 1)} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export default function SellerCodesScreen() {
  const { t } = useLocale();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const token = useStore((s) => s.token);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [codes, setCodes] = useState<SellerInviteCode[] | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!token) {
      setCodes([]);
      return;
    }
    const biz = await api.myBusinesses(token).catch(() => []);
    const id = biz[0]?.id ?? null;
    setBusinessId(id);
    setCodes(id ? await api.inviteCodes(token, id).catch(() => []) : []);
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const generate = async () => {
    if (!token || !businessId) return;
    setBusy(true);
    try {
      await api.createInviteCode(token, businessId);
      await load();
    } finally {
      setBusy(false);
    }
  };

  const share = async (code: string) => {
    try {
      await Share.share({ message: `${t('seller.codes.share_msg')}: ${code}` });
    } catch {
      // paylaşım iptali — sessiz
    }
  };

  const revoke = (codeId: string) => {
    Alert.alert(t('seller.codes.revoke_confirm'), undefined, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('seller.codes.revoke'),
        style: 'destructive',
        onPress: async () => {
          if (token && businessId) {
            await api.revokeInviteCode(token, businessId, codeId);
            await load();
          }
        },
      },
    ]);
  };

  const statusLabel = (s: string) =>
    s === 'active'
      ? t('seller.codes.active')
      : s === 'used'
        ? t('seller.codes.used')
        : t('seller.codes.revoked');

  return (
    <Screen edges={[]}>
      <StackHeader title={t('seller.codes.title')} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* §3.4 kuralı: tek kullanımlık, 24 saat */}
        <View style={styles.ruleCard}>
          <Ionicons name="key" size={20} color={colors.onAccent} />
          <View style={styles.ruleText}>
            <Text variant="bodyStrong" tone="onAccent">
              {t('seller.codes.rule')}
            </Text>
            <Text variant="caption" tone="onAccent" style={styles.ruleHint}>
              {t('seller.codes.hint')}
            </Text>
          </View>
        </View>

        {businessId ? (
          <Button
            label={busy ? '…' : t('seller.codes.generate')}
            onPress={generate}
            disabled={busy}
          />
        ) : null}

        {codes === null ? null : !businessId ? (
          <View style={styles.card}>
            <Text variant="caption" tone="muted">
              {t('seller.codes.no_business')}
            </Text>
          </View>
        ) : codes.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="ticket-outline" size={30} color={colors.muted} />
            <Text variant="caption" tone="muted">
              {t('seller.codes.empty')}
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {codes.map((c) => {
              const active = c.status === 'active';
              const expiry = formatExpiry(c.expiresAt);
              return (
                <View key={c.id} style={[styles.row, active && styles.rowActive]}>
                  <View style={styles.rowMain}>
                    <Text variant="display" tone={active ? 'ink' : 'muted'} style={styles.code}>
                      {c.code}
                    </Text>
                    <View style={styles.metaRow}>
                      <View
                        style={[styles.statusPill, active ? styles.pillActive : styles.pillMuted]}
                      >
                        <Text
                          variant="caption"
                          tone={active ? 'onAccent' : 'muted'}
                          style={styles.pillText}
                        >
                          {statusLabel(c.status)}
                        </Text>
                      </View>
                      {active && expiry ? (
                        <Text variant="caption" tone="muted">
                          {t('seller.codes.expires')}: {expiry}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                  {active ? (
                    <View style={styles.actions}>
                      <Pressable style={styles.iconBtn} hitSlop={6} onPress={() => share(c.code)}>
                        <Ionicons name="share-outline" size={22} color={colors.ink} />
                      </Pressable>
                      <Pressable style={styles.iconBtn} hitSlop={6} onPress={() => revoke(c.id)}>
                        <Ionicons name="close-circle" size={24} color={colors.danger} />
                      </Pressable>
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    content: { padding: space(3), paddingBottom: space(4), gap: space(1.5) },
    ruleCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1.25),
      backgroundColor: colors.accent,
      borderRadius: radius.lg,
      padding: space(2),
    },
    ruleText: { flex: 1 },
    ruleHint: { opacity: 0.85, marginTop: 2 },
    card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: space(2) },
    emptyCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: space(4),
      alignItems: 'center',
      gap: space(1),
    },
    list: { gap: space(1.25), marginTop: space(0.5) },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: space(2),
    },
    rowActive: { backgroundColor: colors.surfaceMuted },
    rowMain: { flex: 1, gap: space(0.75) },
    code: { letterSpacing: 4, fontFamily: 'Menlo', fontSize: 26 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: space(1) },
    statusPill: { paddingHorizontal: space(1.25), paddingVertical: 3, borderRadius: radius.pill },
    pillActive: { backgroundColor: colors.accent },
    pillMuted: { backgroundColor: colors.bgSunken },
    pillText: { fontWeight: '700' },
    actions: { flexDirection: 'row', alignItems: 'center', gap: space(1.5) },
    iconBtn: { alignItems: 'center', justifyContent: 'center' },
  });
