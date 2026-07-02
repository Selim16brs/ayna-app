import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import type { BookingSource } from '../../src/data';
import { useProfessionalDetail } from '../../src/catalog';
import { useLocale } from '../../src/locale';
import { useStore } from '../../src/store';
import { type ColorTokens, radius, space } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import { Button, Screen, StackHeader, TAB_BAR_CLEARANCE, Text } from '../../src/ui';

const DAYS = ['Bugün', 'Yarın', 'Cmt', 'Paz', 'Pzt'];
const TIMES = ['10:00', '11:30', '13:00', '14:30', '16:00', '17:30'];

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
  }>();
  const addBooking = useStore((s) => s.addBooking);
  const pro = useProfessionalDetail(params.proId ?? '1');
  const isSalon = pro.kind === 'salon' && pro.staff.length > 0;
  const [uzmanId, setUzmanId] = useState<string>(params.uzmanId ?? pro.staff[0]?.id ?? '');
  const [day, setDay] = useState(0);
  const [time, setTime] = useState<string | null>(null);

  const uzman = pro.staff.find((u) => u.id === uzmanId);

  function confirm() {
    const source = (params.source as BookingSource) ?? 'direct';
    // Seçili hizmet: param ile gelen ad eşleşirse onu, yoksa ilk hizmeti / priceFrom'u kullan
    const chosenService = pro.services.find((sv) => sv.name === params.service);
    const serviceName =
      chosenService?.name ?? params.service ?? pro.services[0]?.name ?? pro.specialty;
    const price = chosenService?.price ?? pro.services[0]?.price ?? Number(pro.priceFrom);
    const dateLabel = `${DAYS[day]} · ${time ?? ''}`;
    // Gün dizininden küçük pozitif inDays türet (Bugün→1, Yarın→2, ...)
    const inDays = day + 1;

    const id = addBooking({
      source,
      service: serviceName,
      proId: pro.id,
      proName: pro.name,
      proImage: pro.image,
      ...(uzman?.name ? { uzmanName: uzman.name } : {}),
      dateLabel,
      price,
      inDays,
    });

    router.replace({
      pathname: '/booking/confirmed',
      params: {
        id,
        proId: pro.id,
        source,
        day: DAYS[day],
        time: time ?? '',
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

        <Text variant="h2" tone="ink" style={styles.label}>
          {t('booking.schedule.day')}
        </Text>
        <View style={styles.row}>
          {DAYS.map((d, i) => (
            <Pressable
              key={d}
              onPress={() => setDay(i)}
              style={[styles.dayChip, i === day && styles.active]}
            >
              <Text variant="bodyStrong" tone={i === day ? 'onAccent' : 'inkSoft'}>
                {d}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text variant="h2" tone="ink" style={styles.label}>
          {t('booking.schedule.time')}
        </Text>
        <View style={styles.times}>
          {TIMES.map((tm) => (
            <Pressable
              key={tm}
              onPress={() => setTime(tm)}
              style={[styles.timeChip, tm === time && styles.active]}
            >
              <Text variant="bodyStrong" tone={tm === time ? 'onAccent' : 'ink'}>
                {tm}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          label={t('booking.schedule.confirm')}
          variant={time ? 'primary' : 'secondary'}
          disabled={!time}
          onPress={confirm}
        />
      </View>
    </Screen>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    content: { paddingHorizontal: space(3), paddingBottom: space(4) },
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
    footer: {
      paddingHorizontal: space(3),
      paddingTop: space(1.5),
      paddingBottom: TAB_BAR_CLEARANCE,
    },
  });
