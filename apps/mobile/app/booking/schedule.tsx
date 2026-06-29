import { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { getProfessionalDetail } from '../../src/data';
import { useLocale } from '../../src/locale';
import { colors, radius, shadow, space } from '../../src/theme';
import { Button, Screen, StackHeader, Text } from '../../src/ui';

const DAYS = ['Bugün', 'Yarın', 'Cmt', 'Paz', 'Pzt'];
const TIMES = ['10:00', '11:30', '13:00', '14:30', '16:00', '17:30'];

export default function ScheduleScreen() {
  const router = useRouter();
  const { t } = useLocale();
  const params = useLocalSearchParams<{ proId?: string; source?: string }>();
  const pro = getProfessionalDetail(params.proId ?? '1');
  const [day, setDay] = useState(0);
  const [time, setTime] = useState<string | null>(null);

  function confirm() {
    router.replace({
      pathname: '/booking/confirmed',
      params: {
        proId: pro.id,
        source: params.source ?? 'direct',
        day: DAYS[day],
        time: time ?? '',
      },
    });
  }

  return (
    <Screen edges={['top']}>
      <StackHeader title={t('booking.schedule.title')} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.proCard, shadow.soft]}>
          <Text variant="bodyStrong" tone="ink">
            {pro.name}
          </Text>
          <Text variant="caption" tone="muted">
            {pro.specialty}
          </Text>
        </View>

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
              <Text variant="caption" tone={i === day ? 'onColor' : 'inkSoft'}>
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
              <Text variant="bodyStrong" tone={tm === time ? 'onColor' : 'ink'}>
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

const styles = StyleSheet.create({
  content: { paddingHorizontal: space(3), paddingBottom: space(4) },
  proCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: space(2),
  },
  label: { marginTop: space(3), marginBottom: space(1.5) },
  row: { flexDirection: 'row', gap: space(1), flexWrap: 'wrap' },
  dayChip: {
    paddingHorizontal: space(2),
    paddingVertical: space(1.25),
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  times: { flexDirection: 'row', flexWrap: 'wrap', gap: space(1.25) },
  timeChip: {
    width: '30%',
    alignItems: 'center',
    paddingVertical: space(1.5),
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  active: { backgroundColor: colors.rose, borderColor: colors.rose },
  footer: {
    paddingHorizontal: space(3),
    paddingTop: space(1.5),
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
});
