import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { api, type KycDocType, type MyKyc } from '../../src/api';
import { useLocale } from '../../src/locale';
import { useStore } from '../../src/store';
import { type ColorTokens, radius, space } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import { Button, Screen, Segmented, StackHeader, TAB_BAR_CLEARANCE, Text } from '../../src/ui';
import { BELGE_GENISLIK, kucultVeB64, siniriAsiyorMu } from '../../src/gorsel-kucult';

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
      quality: 0.35,
      base64: true,
    });
    if (res.canceled || !res.assets[0]) return;
    const a = res.assets[0];
    /*
     * BELGE KÜÇÜLTÜLÜYOR. Bu ekran küçültmüyordu: telefon fotoğrafı base64'e
     * çevrilince birkaç MB oluyor, iki-üç belge sunucunun 15 MB'lık gövde
     * sınırını aşıyor ve "doğrulama gönder" hata veriyordu. Profil ve
     * paylaşım ekranları zaten küçültüyordu; kural artık ortak.
     */
    const b64 = await kucultVeB64(a.uri, a.base64, BELGE_GENISLIK);
    /*
     * base64 YOKSA EKLENMİYOR. Eskiden yerel dosya yolu (`file://…`) belge
     * diye listeye giriyordu: sunucuya gönderilse okunamaz bir metin olurdu,
     * uzman ise belgeyi göndermiş sanırdı.
     */
    if (!b64) {
      Alert.alert(t('kyc.title'), t('kyc.read_err'));
      return;
    }
    setDocs((prev) => [...prev, `data:image/jpeg;base64,${b64}`]);
  };

  const submit = async () => {
    if (!token || docs.length === 0 || busy) return;
    /*
     * SINIRI AŞAN YIĞIN GÖNDERİLMİYOR. Sunucu 15 MB'ta isteği düşürüyor ve
     * kullanıcı sebebini anlamayan bir hata görüyor. Küçültmeden sonra bu
     * neredeyse hiç olmuyor ama beş büyük belge hâlâ aşabilir.
     */
    if (siniriAsiyorMu(docs)) {
      Alert.alert(t('kyc.title'), t('kyc.too_big'));
      return;
    }
    setBusy(true);
    try {
      await api.submitKyc(token, { docType, documents: docs });
      setDocs([]);
      await load();
      // GERİ BİLDİRİM: eskiden belge sunucuya gidiyor, liste sessizce boşalıyordu.
      // Kullanıcı gönderdi mi sildi mi anlamıyordu — üstelik KİMLİK belgesi gibi
      // en tedirgin olunan yerde. Hata da sessizdi: `catch` yoktu, istek düşerse
      // ekran yine boşalıyor ve hiçbir şey söylemiyordu.
      Alert.alert(t('kyc.sent_t'), t('kyc.sent_b'));
    } catch {
      Alert.alert(t('common.error'));
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
                    hitSlop={11}
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

const makeStyles = (_colors: ColorTokens) =>
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
    // §13 — görsel 22pt KALMALI (küçük resmin köşesi), dokunma alanı
    // değil: JSX'te hitSlop={11} veriliyor → 22 + 2×11 = 44 pt.
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
