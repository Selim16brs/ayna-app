import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { api, type KycDocType, type MyKyc } from '../../src/api';
import { useLocale } from '../../src/locale';
import { useStore } from '../../src/store';
import { type ColorTokens, radius, space } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import { Button, Screen, Segmented, StackHeader, TAB_BAR_CLEARANCE, Text } from '../../src/ui';

const DOC_TYPES: KycDocType[] = ['id_card', 'passport', 'certificate'];

// EK Z.3 — Uzman/salon KYC belge doğrulaması. OTP+yüz tespiti self-publish'e EK güven katmanı.
export default function KycScreen() {
  const { t } = useLocale();
  const { colors, shadow } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const token = useStore((s) => s.token);

  const [kyc, setKyc] = useState<MyKyc | null>(null);
  const [docType, setDocType] = useState<KycDocType>('id_card');
  const [docs, setDocs] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setKyc(await api.myKyc(token));
    } catch {
      /* yut */
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const pickDoc = async () => {
    if (docs.length >= 5) return;
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (res.canceled || !res.assets[0]) return;
    setDocs((prev) => [...prev, res.assets[0]!.uri]);
  };

  const submit = async () => {
    if (!token || docs.length === 0 || busy) return;
    setBusy(true);
    try {
      await api.submitKyc(token, { docType, documents: docs });
      setDocs([]);
      await load();
    } finally {
      setBusy(false);
    }
  };

  const status = kyc?.status ?? 'none';
  const statusTone: Record<
    string,
    { bg: string; fg: string; icon: keyof typeof Ionicons.glyphMap }
  > = {
    none: { bg: colors.surfaceMuted, fg: colors.inkSoft, icon: 'shield-outline' },
    pending: { bg: colors.goldSoft, fg: colors.gold, icon: 'hourglass-outline' },
    approved: { bg: colors.sageSoft, fg: colors.sage, icon: 'shield-checkmark' },
    rejected: { bg: colors.dangerSoft, fg: colors.danger, icon: 'close-circle-outline' },
  };
  const st = statusTone[status] ?? statusTone.none;
  const canSubmit = status !== 'pending' && status !== 'approved';

  return (
    <Screen edges={['bottom']}>
      <StackHeader title={t('kyc.title')} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text variant="body" tone="inkSoft" style={styles.subtitle}>
          {t('kyc.subtitle')}
        </Text>

        {/* Durum kartı */}
        <View style={[styles.statusCard, { backgroundColor: st.bg }, shadow.soft]}>
          <Ionicons name={st.icon} size={26} color={st.fg} />
          <View style={styles.statusText}>
            <Text variant="bodyStrong" tone="ink">
              {t(`kyc.status_${status}` as never)}
            </Text>
            {status === 'rejected' && kyc?.latest?.note ? (
              <Text variant="caption" tone="muted">
                {kyc.latest.note}
              </Text>
            ) : null}
          </View>
        </View>

        {canSubmit ? (
          <>
            <Text variant="bodyStrong" tone="ink" style={styles.label}>
              {t('kyc.doc_type')}
            </Text>
            <Segmented
              options={DOC_TYPES.map((d) => ({ value: d, label: t(`kyc.doctype.${d}` as never) }))}
              value={docType}
              onChange={setDocType}
            />

            <Text variant="bodyStrong" tone="ink" style={styles.label}>
              {t('kyc.documents')}
            </Text>
            <View style={styles.docGrid}>
              {docs.map((uri, i) => (
                <View key={`${uri}-${i}`} style={styles.docThumb}>
                  <Image source={{ uri }} style={styles.docImg} />
                  <Pressable
                    onPress={() => setDocs((p) => p.filter((_, x) => x !== i))}
                    style={styles.docRemove}
                  >
                    <Ionicons name="close" size={14} color={colors.onColor} />
                  </Pressable>
                </View>
              ))}
              {docs.length < 5 ? (
                <Pressable onPress={pickDoc} style={[styles.docAdd, { borderColor: colors.line }]}>
                  <Ionicons name="camera-outline" size={22} color={colors.muted} />
                </Pressable>
              ) : null}
            </View>

            <Button
              label={status === 'rejected' ? t('kyc.resubmit') : t('kyc.submit')}
              onPress={submit}
              disabled={busy || docs.length === 0}
            />
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    content: {
      paddingHorizontal: space(3),
      paddingTop: space(1),
      paddingBottom: TAB_BAR_CLEARANCE,
      gap: space(2),
    },
    subtitle: {},
    statusCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1.5),
      borderRadius: radius.lg,
      padding: space(2),
    },
    statusText: { flex: 1, gap: 2 },
    label: { marginTop: space(1) },
    docGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: space(1.5) },
    docThumb: { width: 84, height: 84, borderRadius: radius.md, overflow: 'hidden' },
    docImg: { width: '100%', height: '100%' },
    docRemove: {
      position: 'absolute',
      top: 4,
      right: 4,
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: 'rgba(0,0,0,0.55)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    docAdd: {
      width: 84,
      height: 84,
      borderRadius: radius.md,
      borderWidth: 1.5,
      borderStyle: 'dashed',
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
