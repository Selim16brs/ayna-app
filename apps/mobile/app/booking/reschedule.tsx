import { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { esikGecti } from '@ayna/domain';
import { formatSlotTr } from '../../src/datetime';
import { useLocale } from '../../src/locale';
import { useStore } from '../../src/store';
import { font, space, type ColorTokens } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import { Button, DateField, Screen, StackHeader, Text } from '../../src/ui';

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
  const { colors } = useTheme();
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
        <View style={styles.kart}>
          <Text style={styles.etiket}>{t('reschedule.current')}</Text>
          <View style={styles.mevcutSatir}>
            <View style={styles.mevcutFoto} />
            <View style={styles.buyu}>
              <Text style={styles.mevcutAd} numberOfLines={1}>
                {booking.proName}
              </Text>
              <Text style={styles.mevcutZaman}>{formatSlotTr(booking.startMs)}</Text>
            </View>
          </View>
        </View>

        {esikGectiMi ? (
          // Kapalıyken seçici HİÇ gösterilmiyor: seçtirip sonra reddetmek,
          // kullanıcıyı boşa uğraştırmak olurdu.
          <View style={styles.kapaliKart}>
            <Ionicons name="time-outline" size={18} color={colors.muted} />
            <Text style={styles.kapaliYazi}>{t('reschedule.closed')}</Text>
          </View>
        ) : (
          <>
            <Text style={styles.bolumBaslik}>{t('reschedule.new_time')}</Text>
            <View style={styles.kart}>
              <DateField
                label={t('reschedule.new_time')}
                value={ne}
                onChange={setNe}
                mode="datetime"
                minimumDate={new Date()}
                last
              />
            </View>

            {/* ERTELEME HAKKI — altın uyarı. Kullanıcı tek hakkını
                harcamadan ÖNCE görmeli; kuralı sonradan söylemek geç. */}
            <View style={styles.kuralKart}>
              <Ionicons name="swap-horizontal" size={18} color={colors.gold} />
              <View style={styles.buyu}>
                <Text style={styles.kuralBaslik}>{t('reschedule.rule_title')}</Text>
                <Text style={styles.kuralNot}>{t('reschedule.rule')}</Text>
              </View>
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
    icerik: { padding: 24, gap: 20, paddingBottom: space(3) },
    bos: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
    buyu: { flex: 1 },
    kart: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 16,
      gap: 10,
      borderWidth: 1,
      borderColor: colors.line,
    },
    etiket: {
      fontFamily: font.semibold,
      fontSize: 11,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      color: colors.muted,
    },
    mevcutSatir: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    mevcutFoto: { width: 44, height: 44, borderRadius: 100, backgroundColor: colors.accentSoft },
    mevcutAd: { fontFamily: font.semibold, fontSize: 15, color: colors.ink },
    mevcutZaman: { fontFamily: font.regular, fontSize: 11, color: colors.muted, marginTop: 2 },
    bolumBaslik: { fontFamily: font.semibold, fontSize: 18, color: colors.ink, marginBottom: -8 },
    kapaliKart: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.line,
    },
    kapaliYazi: {
      flex: 1,
      fontFamily: font.regular,
      fontSize: 13,
      lineHeight: 18,
      color: colors.muted,
    },
    kuralKart: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      backgroundColor: colors.goldSoft,
      borderRadius: 20,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.gold,
    },
    kuralBaslik: { fontFamily: font.semibold, fontSize: 13, color: colors.gold },
    kuralNot: {
      fontFamily: font.regular,
      fontSize: 11,
      lineHeight: 15,
      color: colors.muted,
      marginTop: 2,
    },
  });
