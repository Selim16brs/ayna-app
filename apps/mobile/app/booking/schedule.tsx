import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import type { BookingSource } from '../../src/data';
import { formatSlotTr } from '../../src/datetime';
import { api, type ApiOffer } from '../../src/api';
import { useProfessionalDetail } from '../../src/catalog';
import { useLocale } from '../../src/locale';
import { useStore } from '../../src/store';
import { type ColorTokens, radius, space } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import { Button, DateField, Screen, StackHeader, TAB_BAR_CLEARANCE, Text } from '../../src/ui';

const LEAD_H = 2; // en erken 2 saat sonrası

export default function ScheduleScreen() {
  const router = useRouter();
  const { t } = useLocale();
  const { shadow } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const params = useLocalSearchParams<{
    proId?: string;
    source?: string;
    uzmanId?: string;
    service?: string;
    offerId?: string;
  }>();
  // §keşif Modül 2 — kampanyadan gelindi: fiyat/hizmet kampanyadan, saat penceresi kısıtlı
  const [offer, setOffer] = useState<ApiOffer | null>(null);
  useEffect(() => {
    if (!params.offerId) return;
    let alive = true;
    api
      .offers()
      .then((rows) => alive && setOffer(rows.find((o) => o.id === params.offerId) ?? null))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [params.offerId]);
  const addBooking = useStore((s) => s.addBooking);
  const pro = useProfessionalDetail(params.proId ?? '1');
  const isSalon = pro.kind === 'salon' && pro.staff.length > 0;
  const [uzmanId, setUzmanId] = useState<string>(params.uzmanId ?? pro.staff[0]?.id ?? '');
  // En erken randevu = şimdi + 2 saat (dakikayı 0'a yuvarla); Benim İçin ile aynı native seçici.
  const minDate = new Date(Date.now() + LEAD_H * 3_600_000);
  minDate.setMinutes(0, 0, 0);
  const [when, setWhen] = useState<Date>(() => new Date(minDate));

  const uzman = pro.staff.find((u) => u.id === uzmanId);

  // Seçili hizmet → süre
  const chosenService = pro.services.find((sv) => sv.name === params.service);
  const durationMin = chosenService?.durationMin ?? pro.services[0]?.durationMin ?? 60;

  // Kampanya gün/saat penceresi (Almatı UTC+5) — sunucu ayrıca doğrular
  function inOfferWindow(ms: number): boolean {
    if (!offer) return true;
    const local = new Date(ms + 5 * 3600 * 1000);
    const wd = local.getUTCDay();
    if (offer.validDays.length > 0 && !offer.validDays.includes(wd)) return false;
    if (offer.timeFrom && offer.timeTo) {
      const hm = `${String(local.getUTCHours()).padStart(2, '0')}:${String(local.getUTCMinutes()).padStart(2, '0')}`;
      if (hm < offer.timeFrom || hm >= offer.timeTo) return false;
    }
    return true;
  }
  const offerWindowOk = inOfferWindow(when.getTime());

  function confirm() {
    const startMs = when.getTime();
    const source = (params.source as BookingSource) ?? 'direct';
    const serviceName = offer
      ? offer.title
      : (chosenService?.name ?? params.service ?? pro.services[0]?.name ?? pro.specialty);
    const price = offer
      ? offer.finalPrice
      : (chosenService?.price ?? pro.services[0]?.price ?? Number(pro.priceFrom));

    const id = addBooking({
      source,
      service: serviceName,
      proId: pro.id,
      proName: pro.name,
      proImage: pro.image,
      ...(uzman?.name ? { uzmanName: uzman.name } : {}),
      ...(offer ? { offerId: offer.id } : {}),
      startMs,
      durationMin,
      price,
    });

    router.replace({
      pathname: '/booking/confirmed',
      params: {
        id,
        proId: pro.id,
        source,
        slot: formatSlotTr(startMs),
        uzmanName: uzman?.name ?? '',
      },
    });
  }

  return (
    <Screen edges={['bottom']}>
      <StackHeader title={t('booking.schedule.title')} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.proCard, shadow.soft]}>
          <Image source={{ uri: pro.image }} style={styles.proImage} />
          <View style={styles.proBody}>
            <Text variant="bodyStrong" tone="ink" numberOfLines={1}>
              {pro.name}
            </Text>
            <Text variant="caption" tone="muted" numberOfLines={1}>
              {isSalon && uzman ? `${pro.specialty} · ${uzman.name}` : pro.specialty}
            </Text>
          </View>
        </View>

        {/* Uzman seçimi (salonlarda) */}
        {isSalon ? (
          <>
            <Text variant="h2" tone="ink" style={styles.label}>
              {t('booking.schedule.uzman')}
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.staffRow}
            >
              {pro.staff.map((u) => {
                const on = u.id === uzmanId;
                return (
                  <Pressable
                    key={u.id}
                    onPress={() => setUzmanId(u.id)}
                    style={[styles.staffCard, shadow.soft, on && styles.staffActive]}
                  >
                    <View style={[styles.staffAvatarWrap, on && styles.staffAvatarOn]}>
                      <Image source={{ uri: u.image }} style={styles.staffAvatar} />
                    </View>
                    <Text variant="caption" tone="ink" numberOfLines={1}>
                      {u.name}
                    </Text>
                    <Text variant="caption" tone="muted" numberOfLines={1}>
                      {u.role}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </>
        ) : null}

        {/* §keşif Modül 2 — kampanya bilgisi + fiyat (sunucu fiyatı ayrıca sabitler) */}
        {offer ? (
          <View style={styles.offerBox}>
            <Text variant="bodyStrong" tone="onAccent" numberOfLines={2}>
              {offer.title}
            </Text>
            <View style={styles.offerPriceRow}>
              <Text variant="caption" tone="onAccent" style={styles.offerOld}>
                {offer.basePrice.toLocaleString('tr-TR')} ₸
              </Text>
              <Text variant="bodyStrong" tone="onAccent">
                {offer.finalPrice.toLocaleString('tr-TR')} ₸
              </Text>
            </View>
            {offer.timeFrom || offer.validDays.length > 0 ? (
              <Text variant="caption" tone="onAccent">
                {t('offers.window_hint')}
                {offer.timeFrom ? ` · ${offer.timeFrom}–${offer.timeTo}` : ''}
              </Text>
            ) : null}
          </View>
        ) : null}

        <Text variant="h2" tone="ink" style={styles.label}>
          {t('booking.schedule.time')}
        </Text>
        {/* Benim İçin kayıt eklemeleriyle AYNI native tarih/saat modeli */}
        <View style={[styles.pickerCard, shadow.soft]}>
          <DateField
            label={t('booking.schedule.datetime')}
            value={when}
            onChange={setWhen}
            mode="datetime"
            minimumDate={minDate}
            last
          />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        {offer && !offerWindowOk ? (
          <Text variant="caption" style={styles.windowWarn}>
            {t('offers.window_invalid')}
          </Text>
        ) : null}
        <Button
          label={t('booking.schedule.confirm')}
          variant={offerWindowOk ? 'primary' : 'secondary'}
          disabled={!offerWindowOk}
          onPress={confirm}
        />
      </View>
    </Screen>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    content: { paddingHorizontal: space(3), paddingBottom: space(4) },
    pickerCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: space(2.25),
    },
    proCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1.5),
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: space(1.75),
    },
    proImage: {
      width: 60,
      height: 60,
      borderRadius: radius.md,
      backgroundColor: colors.bgSunken,
    },
    proBody: { flex: 1, gap: 3 },
    label: { marginTop: space(3), marginBottom: space(1.5) },
    staffRow: { gap: space(1.5), paddingRight: space(3), paddingVertical: space(0.5) },
    staffCard: {
      width: 112,
      alignItems: 'center',
      gap: 3,
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: space(1.75),
    },
    staffActive: { backgroundColor: colors.accentSoft },
    staffAvatarWrap: {
      width: 60,
      height: 60,
      borderRadius: 30,
      padding: 3,
      marginBottom: space(0.75),
      borderWidth: 2,
      borderColor: 'transparent',
    },
    staffAvatarOn: { borderColor: colors.accent },
    staffAvatar: {
      width: '100%',
      height: '100%',
      borderRadius: 27,
      backgroundColor: colors.bgSunken,
    },
    row: { flexDirection: 'row', gap: space(1), flexWrap: 'wrap' },
    dayChip: {
      paddingHorizontal: space(2.25),
      paddingVertical: space(1.5),
      borderRadius: radius.pill,
      backgroundColor: colors.surfaceMuted,
    },
    times: { flexDirection: 'row', flexWrap: 'wrap', gap: space(1.25) },
    timeChip: {
      width: '31%',
      alignItems: 'center',
      paddingVertical: space(1.75),
      borderRadius: radius.md,
      backgroundColor: colors.surfaceMuted,
    },
    active: { backgroundColor: colors.accent },
    offerBox: {
      backgroundColor: colors.accentFg,
      borderRadius: radius.lg,
      padding: space(2),
      gap: 4,
      marginTop: space(2),
    },
    offerPriceRow: { flexDirection: 'row', alignItems: 'center', gap: space(1) },
    offerOld: { textDecorationLine: 'line-through', opacity: 0.7 },
    windowWarn: { color: colors.danger, textAlign: 'center', marginBottom: space(1) },
    footer: {
      paddingHorizontal: space(3),
      paddingTop: space(1.5),
      paddingBottom: TAB_BAR_CLEARANCE,
    },
  });
