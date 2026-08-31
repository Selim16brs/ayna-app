import { useCallback, useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Alert, ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { api, type CommissionInvoice } from '../../src/api';
import { formatPrice } from '../../src/data';
import { fillParams, useLocale } from '../../src/locale';
import { useStore } from '../../src/store';
import { type ColorTokens, radius, space } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import { Screen, StackHeader, Text, TAB_BAR_CLEARANCE } from '../../src/ui';

// §12.8 — pro'nun komisyon faturaları: dönem, tutar, vade, durum + dekont yükleme
// Süreler SUNUCUDAN gelen ayarlarla aynı olmalı; burada yalnız METİN için
// kullanılıyor. Sunucu kuralı uygular, ekran onu anlatır.
const ODEME_DK = 45;
const EK_SURE_DK = 15;

/** Vadeye kalan dakika; süre dolmuşsa null. */
function kalanDk(dueDate: string): number | null {
  const fark = new Date(dueDate).getTime() - Date.now();
  return fark > 0 ? Math.ceil(fark / 60_000) : null;
}

export default function CommissionsScreen() {
  const { t } = useLocale();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const token = useStore((s) => s.token);
  // Askıdayken 2 KATI bedel gösterilir. Borç, ödenmemiş faturaların toplamı;
  // kullanıcı kısıtlı değilse kart hiç çizilmez.
  const kisitli = useStore((st) => st.currentUser?.restricted === true);
  const [invoices, setInvoices] = useState<CommissionInvoice[] | null>(null);
  const askidaBorc =
    kisitli && invoices
      ? invoices
          .filter((i) => i.status !== 'collected')
          .reduce((acc, i) => acc + Number(i.commissionAmount), 0) || null
      : null;
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return setInvoices([]);
    try {
      setInvoices(await api.myCommissions(token));
    } catch {
      setInvoices([]);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const uploadReceipt = async (inv: CommissionInvoice) => {
    if (!token) return;
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.35,
      base64: true,
    });
    if (res.canceled || !res.assets[0]) return;
    setBusy(inv.id);
    try {
      const a = res.assets[0];
      const uri = a.base64 ? `data:image/jpeg;base64,${a.base64}` : a.uri;
      await api.uploadCommissionReceipt(token, inv.id, uri);
      await load();
      // GERİ BİLDİRİM: burada yüklenen şey ÖDEME KANITI. Sessizlik en pahalı
      // olanı — uzman ödediğini kanıtlayamadığını sanıp desteğe yazar ya da
      // ikinci kez yükler. Hata yolu da sessizdi (`catch` yoktu).
      Alert.alert(t('commission.receipt_sent_t'), t('commission.receipt_sent_b'));
    } catch {
      Alert.alert(t('common.error'));
    } finally {
      setBusy(null);
    }
  };

  const statusTone = (s: string) =>
    s === 'collected' ? colors.success : s === 'overdue' ? colors.accentFg : colors.gold;
  const statusLabel = (s: string) =>
    s === 'collected'
      ? t('commission.status.collected')
      : s === 'overdue'
        ? t('commission.status.overdue')
        : t('commission.status.pending');

  return (
    <Screen edges={[]}>
      <StackHeader title={t('commission.title')} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text variant="body" tone="muted" style={styles.intro}>
          {t('commission.intro')}
        </Text>

        {/* KURAL ÖNCEDEN BİLDİRİLİR. Kurucu kuralının açık şartı: askıya alma ve
            2 katı bedel, uzman daha CEZAYI YEMEDEN bilinmeli. Bunu yalnız
            gecikince gönderilen bildirime bırakmak, "daha öncesinde
            belirtilmeli" maddesini çiğnerdi. */}
        <View style={styles.ruleCard}>
          <View style={styles.ruleHead}>
            <Ionicons name="time-outline" size={16} color={colors.ink} />
            <Text variant="bodyStrong" tone="ink">
              {t('commission.rule_t')}
            </Text>
          </View>
          <Text variant="caption" tone="muted" style={styles.ruleText}>
            {fillParams(t('commission.rule_b'), { due: ODEME_DK, grace: EK_SURE_DK })}
          </Text>
          <Text variant="caption" style={[styles.ruleText, { color: colors.danger }]}>
            {t('commission.rule_x2')}
          </Text>
        </View>

        {askidaBorc !== null ? (
          <View style={styles.suspendedCard}>
            <View style={styles.ruleHead}>
              <Ionicons name="lock-closed-outline" size={16} color={colors.danger} />
              <Text variant="bodyStrong" style={{ color: colors.danger }}>
                {t('commission.suspended_t')}
              </Text>
            </View>
            <Text variant="caption" tone="muted" style={styles.ruleText}>
              {fillParams(t('commission.suspended_b'), {
                amount: formatPrice(askidaBorc * 2),
              })}
            </Text>
          </View>
        ) : null}

        {invoices === null ? (
          <ActivityIndicator color={colors.accent} style={{ marginTop: space(4) }} />
        ) : invoices.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="card-outline" size={40} color={colors.muted} />
            <Text variant="body" tone="muted" style={styles.emptyText}>
              {t('commission.empty')}
            </Text>
          </View>
        ) : (
          invoices.map((inv) => (
            <View key={inv.id} style={styles.card}>
              <View style={styles.cardHead}>
                <Text variant="bodyStrong">{formatPrice(inv.commissionAmount)}</Text>
                <View style={[styles.pill, { backgroundColor: statusTone(inv.status) + '22' }]}>
                  <Text variant="caption" style={{ color: statusTone(inv.status) }}>
                    {statusLabel(inv.status)}
                  </Text>
                </View>
              </View>
              <Text variant="caption" tone="muted" style={styles.period}>
                {inv.periodStart.slice(0, 10)} – {inv.periodEnd.slice(0, 10)} · {inv.bookingsCount}{' '}
                {t('commission.bookings')} · {t('commission.gross')} {formatPrice(inv.grossRevenue)}
              </Text>
              {/* Süre DAKİKALARLA işliyor; "vade 31.08" yazmak kuralı gizlerdi. */}
              {inv.status !== 'collected' ? (
                <Text
                  variant="caption"
                  style={{ color: kalanDk(inv.dueDate) === null ? colors.danger : colors.gold }}
                >
                  {kalanDk(inv.dueDate) === null
                    ? t('commission.expired')
                    : `${t('commission.left')}: ${kalanDk(inv.dueDate)} dk`}
                </Text>
              ) : null}
              <Text
                variant="caption"
                style={{ color: inv.status === 'overdue' ? colors.accentFg : colors.inkSoft }}
              >
                {t('commission.due')}: {inv.dueDate.slice(0, 10)}
                {inv.status !== 'collected' && inv.overdueDays > 0
                  ? ` · ${inv.overdueDays} ${t('commission.days_overdue')}`
                  : ''}
              </Text>

              {inv.status !== 'collected' ? (
                <Pressable
                  style={styles.cta}
                  onPress={() => uploadReceipt(inv)}
                  disabled={busy === inv.id}
                >
                  <Ionicons
                    name={inv.receiptUri ? 'checkmark-circle' : 'cloud-upload-outline'}
                    size={18}
                    color={colors.onAccent}
                  />
                  <Text variant="bodyStrong" tone="onAccent" style={styles.ctaText}>
                    {inv.receiptUri
                      ? t('commission.receipt_change')
                      : t('commission.receipt_upload')}
                  </Text>
                </Pressable>
              ) : (
                <Text variant="caption" tone="muted" style={styles.paidNote}>
                  {t('commission.paid_note')}
                </Text>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    content: { padding: space(3), paddingBottom: TAB_BAR_CLEARANCE, gap: space(2) },
    intro: { marginBottom: space(1) },
    ruleCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: space(2),
      gap: space(0.75),
      marginBottom: space(1),
    },
    suspendedCard: {
      backgroundColor: colors.dangerSoft,
      borderRadius: radius.lg,
      padding: space(2),
      gap: space(0.75),
      marginBottom: space(1),
    },
    ruleHead: { flexDirection: 'row', alignItems: 'center', gap: space(0.75) },
    ruleText: { lineHeight: 18 },
    empty: { alignItems: 'center', gap: space(1.5), marginTop: space(6) },
    emptyText: { textAlign: 'center' },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: space(2.5),
      gap: space(0.75),
      borderWidth: 1,
      borderColor: colors.line,
    },
    cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    pill: { paddingHorizontal: space(1.5), paddingVertical: space(0.5), borderRadius: radius.pill },
    period: { marginTop: space(0.25) },
    cta: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: space(1),
      backgroundColor: colors.accent,
      borderRadius: radius.md,
      paddingVertical: space(1.5),
      marginTop: space(1.5),
    },
    ctaText: {},
    paidNote: { marginTop: space(1) },
  });
