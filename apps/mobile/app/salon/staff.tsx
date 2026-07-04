import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { SELLER_DATA } from '../../src/data';
import { useLocale } from '../../src/locale';
import { type ColorTokens, radius, space } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import { Button, PressableScale, Screen, StackHeader, TAB_BAR_CLEARANCE, Text } from '../../src/ui';

// §10.1 — SALON kadro yönetimi: uzman listesi + davet (kod) + uzmana dokun → detay (çıkar/performans).
export default function SalonStaffScreen() {
  const { t } = useLocale();
  const { colors, shadow } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const staff = SELLER_DATA.month.staff;

  return (
    <Screen edges={[]}>
      <StackHeader title={t('salon.staff.title')} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text variant="caption" tone="muted" style={styles.intro}>
          {t('salon.staff.intro')}
        </Text>

        {/* §3.4 — Uzman davet et (tek kullanımlık, 24s kod) */}
        <Button label={t('salon.staff.invite')} variant="primary" onPress={() => router.push('/seller/codes')} />

        <View style={styles.list}>
          {staff.map((u) => (
            <PressableScale
              key={u.name}
              style={[styles.card, shadow.soft]}
              onPress={() =>
                router.push({
                  pathname: '/seller/staff',
                  params: {
                    name: u.name,
                    image: u.image,
                    bookings: String(u.bookings),
                    rating: String(u.rating),
                  },
                })
              }
            >
              <Image source={{ uri: u.image }} style={styles.img} />
              <View style={styles.info}>
                <Text variant="bodyStrong" tone="ink" numberOfLines={1}>
                  {u.name}
                </Text>
                <View style={styles.metaRow}>
                  <Ionicons name="star" size={12} color={colors.gold} />
                  <Text variant="caption" tone="inkSoft">
                    {u.rating.toFixed(1)}
                  </Text>
                  <Text variant="caption" tone="muted">
                    · {u.bookings} {t('reports.bookings')}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.muted} />
            </PressableScale>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    content: { paddingHorizontal: space(3), paddingTop: space(2), paddingBottom: TAB_BAR_CLEARANCE + space(2), gap: space(1.5) },
    intro: { lineHeight: 18 },
    list: { gap: space(1.25), marginTop: space(0.5) },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1.25),
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: space(1.5),
    },
    img: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.surfaceMuted },
    info: { flex: 1, gap: 3 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  });
