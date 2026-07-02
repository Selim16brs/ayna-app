import { useCallback, useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { api, type SellerInviteCode } from '../../src/api';
import { useLocale } from '../../src/locale';
import { useStore } from '../../src/store';
import { type ColorTokens, radius, space } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import { Button, Screen, StackHeader, Text } from '../../src/ui';

export default function SellerCodesScreen() {
  const { t } = useLocale();
  const { colors, shadow } = useTheme();
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
    s === 'active' ? t('seller.codes.active') : s === 'used' ? t('seller.codes.used') : t('seller.codes.revoked');

  return (
    <Screen edges={[]}>
      <StackHeader title={t('seller.codes.title')} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text variant="caption" tone="muted" style={styles.hint}>
          {t('seller.codes.hint')}
        </Text>

        {businessId ? (
          <Button
            label={busy ? '…' : t('seller.codes.generate')}
            onPress={generate}
            disabled={busy}
          />
        ) : null}

        {codes === null ? null : !businessId ? (
          <View style={[styles.card, shadow.soft]}>
            <Text variant="caption" tone="muted">
              {t('seller.codes.no_business')}
            </Text>
          </View>
        ) : codes.length === 0 ? (
          <View style={[styles.card, shadow.soft]}>
            <Text variant="caption" tone="muted">
              {t('seller.codes.empty')}
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {codes.map((c) => (
              <View key={c.id} style={[styles.row, shadow.soft]}>
                <View style={{ flex: 1 }}>
                  <Text variant="h2" tone="ink" style={styles.code}>
                    {c.code}
                  </Text>
                  <Text variant="caption" tone="muted">
                    {statusLabel(c.status)}
                  </Text>
                </View>
                {c.status === 'active' ? (
                  <Ionicons
                    name="close-circle"
                    size={26}
                    color={colors.danger}
                    onPress={() => revoke(c.id)}
                  />
                ) : null}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    content: { padding: space(3), paddingBottom: space(4), gap: space(1.5) },
    hint: { marginBottom: space(0.5) },
    card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: space(2) },
    list: { gap: space(1.25), marginTop: space(0.5) },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: space(2),
    },
    code: { letterSpacing: 3, fontFamily: 'Menlo' },
  });
