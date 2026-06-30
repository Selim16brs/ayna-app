import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { formatPrice } from '../../src/data';
import { useLocale } from '../../src/locale';
import { type ColorTokens, radius, space } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import { Progress, Screen, StackHeader, Text } from '../../src/ui';

// Uzman bazlı hizmet dağılımı (mock; gerçek panelde API'den gelir)
const SERVICES = [
  { name: 'Saç boyama', share: 0.42 },
  { name: 'Kesim & fön', share: 0.31 },
  { name: 'Bakım', share: 0.27 },
];

export default function StaffDetailScreen() {
  const { t } = useLocale();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const p = useLocalSearchParams<{
    name?: string;
    image?: string;
    bookings?: string;
    rating?: string;
  }>();
  const bookings = Number(p.bookings ?? 0) || 0;
  const rating = Number(p.rating ?? 0) || 0;
  const revenue = bookings * 14000; // mock ortalama bilet

  return (
    <Screen edges={['top']}>
      <StackHeader title={t('seller.staff.title')} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.head}>
          {p.image ? <Image source={{ uri: p.image }} style={styles.avatar} /> : null}
          <View>
            <Text variant="h2" tone="ink">
              {p.name}
            </Text>
            <Text variant="caption" tone="muted">
              {t('seller.staff.period')}
            </Text>
          </View>
        </View>

        <View style={styles.stats}>
          <Stat
            icon="calendar-outline"
            value={String(bookings)}
            label={t('seller.staff.bookings')}
          />
          <View style={styles.divider} />
          <Stat icon="star-outline" value={rating.toFixed(1)} label={t('seller.staff.rating')} />
          <View style={styles.divider} />
          <Stat
            icon="cash-outline"
            value={formatPrice(revenue)}
            label={t('seller.staff.revenue')}
          />
        </View>

        <Text variant="label" tone="rose" style={styles.section}>
          {t('seller.staff.services')}
        </Text>
        <View style={styles.group}>
          {SERVICES.map((s, i) => (
            <View key={s.name} style={[styles.svc, i < SERVICES.length - 1 && styles.svcBorder]}>
              <View style={styles.svcHead}>
                <Text variant="bodyStrong" tone="ink">
                  {s.name}
                </Text>
                <Text variant="caption" tone="inkSoft">
                  %{Math.round(s.share * 100)}
                </Text>
              </View>
              <Progress value={s.share} color={colors.rose} />
            </View>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}

function Stat({
  icon,
  value,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  label: string;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.stat}>
      <Ionicons name={icon} size={18} color={colors.rose} />
      <Text variant="bodyStrong" tone="ink" style={styles.statValue}>
        {value}
      </Text>
      <Text variant="caption" tone="muted">
        {label}
      </Text>
    </View>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    content: { padding: space(2), paddingBottom: space(4) },
    head: { flexDirection: 'row', alignItems: 'center', gap: space(1.5), marginBottom: space(2.5) },
    avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.surfaceMuted },
    stats: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.line,
      paddingVertical: space(2),
    },
    stat: { flex: 1, alignItems: 'center', gap: 4 },
    statValue: { marginTop: 2 },
    divider: { width: 1, backgroundColor: colors.line, marginVertical: space(1) },
    section: { paddingHorizontal: space(1), marginTop: space(3), marginBottom: space(1.5) },
    group: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.line,
      overflow: 'hidden',
    },
    svc: { padding: space(2), gap: space(1) },
    svcBorder: { borderBottomWidth: 1, borderBottomColor: colors.line },
    svcHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  });
