import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, Image, ScrollView, StyleSheet, View } from 'react-native';
import { api } from '../../src/api';
import { formatPrice } from '../../src/data';
import { fillParams, useLocale } from '../../src/locale';
import { useStore } from '../../src/store';
import { type ColorTokens, radius, space } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import { Button, PressableScale, Screen, StackHeader, TAB_BAR_CLEARANCE, Text } from '../../src/ui';

// §11/§460 — üyelik ödeme dekontu: app-dışı ödeme (Kaspi/banka) sonrası dekont yükle → admin onayı.
export default function SubReceiptScreen() {
  const { t } = useLocale();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const token = useStore((s) => s.token);
  const { id, tier, amount } = useLocalSearchParams<{ id: string; tier: string; amount: string }>();

  const [uri, setUri] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const tierName = tier === 'platinum' ? 'Platinum' : 'Premium';

  const pick = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.35,
      base64: true, // dekont DATA URL gider — admin panelde görüntülenir
    });
    if (!res.canceled && res.assets[0]) {
      const a = res.assets[0];
      setUri(a.base64 ? `data:image/jpeg;base64,${a.base64}` : a.uri);
    }
  };

  const submit = async () => {
    if (!uri || !token || !id || busy) return;
    setBusy(true);
    try {
      await api.uploadSubReceipt(id, uri, token);
      Alert.alert(t('sub.sent_t'), t('sub.sent_b'), [
        { text: t('common.ok'), onPress: () => router.replace('/seller/reports') },
      ]);
    } catch {
      Alert.alert(t('premium.title'), t('sub.error'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen edges={[]}>
      <StackHeader title={t('sub.receipt_title')} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Ödeme talimatı — app dışı */}
        <View style={styles.payBox}>
          <View style={styles.payHead}>
            <Ionicons name="card-outline" size={18} color={colors.accentFg} />
            <Text variant="bodyStrong" tone="ink">
              {fillParams(t('sub.pay_title'), { tier: tierName })}
            </Text>
          </View>
          <Text variant="display" tone="ink" style={styles.amount}>
            {formatPrice(Number(amount) || 0)}
          </Text>
          <Text variant="caption" tone="muted" style={styles.payDesc}>
            {t('sub.pay_desc')}
          </Text>
        </View>

        <Text variant="label" tone="accentFg" style={styles.label}>
          {t('sub.receipt_label')}
        </Text>
        {uri ? (
          <PressableScale onPress={pick}>
            <Image source={{ uri }} style={styles.preview} resizeMode="cover" />
          </PressableScale>
        ) : (
          <PressableScale style={styles.pick} onPress={pick}>
            <Ionicons name="cloud-upload-outline" size={26} color={colors.accentFg} />
            <Text variant="bodyStrong" tone="accentFg">
              {t('sub.pick')}
            </Text>
            <Text variant="caption" tone="muted">
              {t('sub.pick_hint')}
            </Text>
          </PressableScale>
        )}

        <View style={styles.note}>
          <Ionicons name="information-circle-outline" size={15} color={colors.muted} />
          <Text variant="caption" tone="muted" style={styles.flex}>
            {t('sub.approve_note')}
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          label={t('sub.submit')}
          variant="primary"
          disabled={!uri || busy}
          onPress={submit}
        />
      </View>
    </Screen>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    content: {
      paddingHorizontal: space(3),
      paddingTop: space(1.5),
      paddingBottom: TAB_BAR_CLEARANCE + space(2),
      gap: space(0.5),
    },
    flex: { flex: 1 },
    payBox: {
      backgroundColor: colors.accentSoft,
      borderRadius: radius.lg,
      padding: space(2),
      gap: space(0.5),
    },
    payHead: { flexDirection: 'row', alignItems: 'center', gap: space(1) },
    amount: { fontSize: 34, letterSpacing: -0.5, marginTop: space(0.5) },
    payDesc: { lineHeight: 18 },
    label: { marginTop: space(2.5), marginBottom: space(1) },
    pick: {
      alignItems: 'center',
      justifyContent: 'center',
      gap: space(0.5),
      backgroundColor: colors.surface,
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: colors.line,
      borderRadius: radius.lg,
      paddingVertical: space(4),
    },
    preview: {
      width: '100%',
      height: 240,
      borderRadius: radius.lg,
      backgroundColor: colors.surfaceMuted,
    },
    note: {
      flexDirection: 'row',
      gap: space(1),
      backgroundColor: colors.surfaceMuted,
      borderRadius: radius.md,
      padding: space(1.5),
      marginTop: space(2.5),
    },
    footer: {
      paddingHorizontal: space(3),
      paddingTop: space(1.5),
      paddingBottom: space(3),
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.line,
      backgroundColor: colors.bg,
    },
  });
