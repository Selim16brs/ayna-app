import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { api } from '../../src/api';
import { fillParams, useLocale } from '../../src/locale';
import { localDeposit, useStore } from '../../src/store';
import { radius, shadow, space, type ColorTokens } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import { Button, Sayac, Screen, StackHeader, TAB_BAR_CLEARANCE, Text } from '../../src/ui';

/**
 * DEPOZİTO ÖDEME — brief §4.4.
 *
 *   · Tutar: onay anındaki toplam hizmet bedelinin %10'u.
 *   · Süre: 10 DAKİKA, geri sayım ekranda görünür.
 *   · SES INVEST TOO hesabına transfer + dekont yükleme.
 *   · "Dekont yüklendiği an randevu KESINLESTI sayılır."
 *   · Puan kullanımı: bakiye ≥ 5.000 ise biriken puanın en fazla %25'i (§5).
 *
 * Ekranın tamamı tek bir soruya hizmet ediyor: "ne kadar, nereye, ne kadar
 * sürede?" Geri sayım en üstte çünkü brief §7 görünmez zaman sınırını yasaklıyor
 * ve buradaki sınır randevuyu düşürecek kadar sert.
 */

/** §5 — puan kullanımı için minimum bakiye ve işlem başına üst sınır. */
const PUAN_ESIGI = 5000;
const PUAN_ORANI = 0.25;
/** Ödemenin yapılacağı hesap (§4.4). */
const HESAP_ADI = 'SES INVEST TOO';

export default function DepositScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useLocale();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();

  const booking = useStore((s) => s.bookings.find((b) => b.id === id));
  const rates = useStore((s) => s.config.rates);
  const points = useStore((s) => s.points);
  const hydrateBookings = useStore((s) => s.hydrateBookings);

  const [dekont, setDekont] = useState<string | null>(null);
  const [puanKullan, setPuanKullan] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!booking) {
    return (
      <Screen edges={[]}>
        <StackHeader title={t('deposit.title')} />
        <View style={styles.bos}>
          <Text variant="body" tone="muted">
            {t('booking.detail.missing')}
          </Text>
        </View>
      </Screen>
    );
  }

  const tutar = booking.depositAmount ?? localDeposit(booking.price, rates);
  // §5 — eşiğin altındaysa puan hiç kullanılamaz; üstündeyse biriken puanın
  // %25'i kadarı, ama depozitodan fazlası anlamsız olurdu.
  const puanHakki = points >= PUAN_ESIGI ? Math.min(Math.floor(points * PUAN_ORANI), tutar) : 0;
  const odenecek = puanKullan ? Math.max(0, tutar - puanHakki) : tutar;

  const secDekont = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.35,
      base64: true,
    });
    if (res.canceled || !res.assets[0]) return;
    const a = res.assets[0];
    setDekont(a.base64 ? `data:image/jpeg;base64,${a.base64}` : a.uri);
  };

  const gonder = async () => {
    if (!dekont || busy) return;
    setBusy(true);
    try {
      await api.submitDepositReceipt(booking.id, dekont);
      await hydrateBookings();
      // §4.4 — dekont yüklendiği AN kesinleşti. Kullanıcı "onay bekliyorum"
      // sanmamalı; net söylenmeli.
      Alert.alert(t('deposit.done_t'), t('deposit.done_b'), [
        { text: t('common.ok'), onPress: () => router.back() },
      ]);
    } catch {
      Alert.alert(t('common.error'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen edges={[]}>
      <StackHeader title={t('deposit.title')} />
      <ScrollView contentContainerStyle={styles.icerik} showsVerticalScrollIndicator={false}>
        {/* Geri sayım EN ÜSTTE: bu sınır randevuyu düşürüyor. */}
        {booking.depositDeadline ? (
          <View style={[styles.kart, styles.acil, shadow.card]}>
            <Sayac
              bitis={booking.depositDeadline}
              metin={t('flow.deposit.countdown_b')}
              renk={colors.danger}
            />
          </View>
        ) : null}

        <View style={[styles.kart, shadow.card]}>
          <View style={styles.satir}>
            <Text variant="caption" tone="muted">
              {t('deposit.amount')}
            </Text>
            <Text variant="h2" tone="ink">
              {odenecek.toLocaleString('tr-TR')} ₸
            </Text>
          </View>
          <Text variant="caption" tone="muted">
            {fillParams(t('deposit.of_total'), {
              total: booking.price.toLocaleString('tr-TR'),
            })}
          </Text>
        </View>

        {/* §5 — puan kullanımı. Hak yoksa seçenek HİÇ gösterilmiyor: kullanılamayan
            bir seçeneği göstermek, eşiği açıklamak zorunda bırakır ve ekranı şişirir. */}
        {puanHakki > 0 ? (
          <Pressable
            style={[styles.kart, shadow.card, styles.puanSatir]}
            onPress={() => setPuanKullan((v) => !v)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: puanKullan }}
          >
            <Ionicons
              name={puanKullan ? 'checkbox' : 'square-outline'}
              size={22}
              color={puanKullan ? colors.accent : colors.muted}
            />
            <View style={styles.flex}>
              <Text variant="bodyStrong" tone="ink">
                {fillParams(t('deposit.use_points'), {
                  points: puanHakki.toLocaleString('tr-TR'),
                })}
              </Text>
              <Text variant="caption" tone="muted">
                {t('deposit.points_rule')}
              </Text>
            </View>
          </Pressable>
        ) : null}

        <View style={[styles.kart, shadow.card]}>
          <Text variant="bodyStrong" tone="ink">
            {t('deposit.account')}
          </Text>
          <Text variant="body" tone="ink" selectable>
            {HESAP_ADI}
          </Text>
          <Text variant="caption" tone="muted" style={styles.not}>
            {t('deposit.transfer_note')}
          </Text>
        </View>

        <Pressable style={[styles.kart, shadow.card, styles.yukle]} onPress={secDekont}>
          {dekont ? (
            <Image source={{ uri: dekont }} style={styles.onizleme} resizeMode="cover" />
          ) : (
            <>
              <Ionicons name="cloud-upload-outline" size={28} color={colors.muted} />
              <Text variant="body" tone="muted">
                {t('deposit.upload')}
              </Text>
            </>
          )}
        </Pressable>

        <Button
          label={t('deposit.submit')}
          disabled={!dekont || busy}
          variant={dekont ? 'primary' : 'secondary'}
          onPress={() => void gonder()}
        />
        <Text variant="caption" tone="muted" style={styles.not}>
          {t('deposit.verify_note')}
        </Text>
      </ScrollView>
    </Screen>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    icerik: { padding: space(2), gap: space(1.5), paddingBottom: TAB_BAR_CLEARANCE },
    bos: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space(3) },
    kart: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: space(2),
      gap: space(0.75),
    },
    acil: { borderWidth: 1, borderColor: colors.danger },
    satir: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    puanSatir: { flexDirection: 'row', alignItems: 'center', gap: space(1.5) },
    flex: { flex: 1 },
    not: { lineHeight: 18 },
    yukle: { alignItems: 'center', justifyContent: 'center', minHeight: 140, gap: space(1) },
    onizleme: { width: '100%', height: 180, borderRadius: radius.md },
  });
