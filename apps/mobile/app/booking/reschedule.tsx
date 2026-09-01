import { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { esikGecti } from '@ayna/domain';
import { formatSlotTr } from '../../src/datetime';
import { useLocale } from '../../src/locale';
import { useStore } from '../../src/store';
import { radius, shadow, space, type ColorTokens } from '../../src/theme';
import { useThemedStyles } from '../../src/theme-context';
import { Button, DateField, Screen, StackHeader, TAB_BAR_CLEARANCE, Text } from '../../src/ui';

/**
 * ERTELEME — brief §4.6.
 *
 *   · Yalnızca 3 saat eşiğinden ÖNCE aktif; randevu başına müşteri için 1 KEZ.
 *   · Aynı takvim seçici → yeni slot → uzmana Kabul/Red talebi.
 *   · Kabul: DEPOZİTO AYNEN YENİ TARİHE TAŞINIR, yeni ödeme yok.
 *   · Red: eski randevu geçerli kalır.
 *
 * Bu ekran olmadan saatini değiştirmek isteyen müşterinin elinde yalnız İPTAL
 * vardı; eşiğin içindeyse depozitosunu yakıyordu — hâlbuki hizmetten
 * vazgeçmemişti.
 */
export default function RescheduleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useLocale();
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();

  const booking = useStore((s) => s.bookings.find((b) => b.id === id));
  const hydrateBookings = useStore((s) => s.hydrateBookings);
  const randevuEylemi = useStore((s) => s.randevuEylemi);
  const [ne, setNe] = useState<Date>(() => new Date(Date.now() + 24 * 60 * 60_000));
  const [busy, setBusy] = useState(false);

  if (!booking) {
    return (
      <Screen edges={[]}>
        <StackHeader title={t('reschedule.title')} />
        <View style={styles.bos}>
          <Text variant="body" tone="muted">
            {t('booking.detail.missing')}
          </Text>
        </View>
      </Screen>
    );
  }

  // §4.6 — eşikten sonra erteleme YOK: yalnız iptal (depozito yanar) veya gelme.
  const esikGectiMi = esikGecti(booking.startMs);

  const gonder = async () => {
    if (busy || esikGectiMi) return;
    setBusy(true);
    try {
      // Kural SUNUCUDA: hak bitmişse ya da pencere kapanmışsa sunucu reddeder
      // ve yerel durum tazelenir. Ağ yoksa talep kuyrukta bekler, kaybolmaz.
      const sonuc = await randevuEylemi(booking.id, 'ertele', ne.getTime());
      if (sonuc.sonuc === 'reddedildi') {
        // Sunucunun kendi gerekçesi varsa onu göster — "bir hata oluştu"
        // kullanıcıya neyi düzelteceğini söylemiyor.
        Alert.alert(sonuc.mesaj ?? t('reschedule.err'));
        return;
      }
      await hydrateBookings();
      Alert.alert(
        sonuc.sonuc === 'kuyrukta' ? t('flow.queued_t') : t('reschedule.sent_t'),
        sonuc.sonuc === 'kuyrukta' ? t('flow.queued_b') : t('reschedule.sent_b'),
        [{ text: t('common.ok'), onPress: () => router.back() }],
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen edges={[]}>
      <StackHeader title={t('reschedule.title')} />
      <ScrollView contentContainerStyle={styles.icerik} showsVerticalScrollIndicator={false}>
        <View style={[styles.kart, shadow.card]}>
          <Text variant="caption" tone="muted">
            {t('reschedule.current')}
          </Text>
          <Text variant="bodyStrong" tone="ink">
            {formatSlotTr(booking.startMs)}
          </Text>
        </View>

        {esikGectiMi ? (
          // Kapalıyken seçici HİÇ gösterilmiyor: seçtirip sonra reddetmek,
          // kullanıcıyı boşa uğraştırmak olurdu.
          <View style={[styles.kart, shadow.card]}>
            <Text variant="body" tone="muted" style={styles.not}>
              {t('reschedule.closed')}
            </Text>
          </View>
        ) : (
          <>
            <View style={[styles.kart, shadow.card]}>
              <DateField
                label={t('reschedule.new_time')}
                value={ne}
                onChange={setNe}
                mode="datetime"
                minimumDate={new Date()}
                last
              />
            </View>
            <View style={[styles.kart, shadow.card]}>
              <Text variant="caption" tone="muted" style={styles.not}>
                {t('reschedule.rule')}
              </Text>
            </View>
            <Button label={t('reschedule.submit')} disabled={busy} onPress={() => void gonder()} />
          </>
        )}
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
    not: { lineHeight: 18 },
  });
