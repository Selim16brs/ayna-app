import { useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { cityCenter, distanceKm, proCoords } from '../src/data';
import { useProfessionals } from '../src/catalog';
import { useStore } from '../src/store';
import { fillParams, useLocale } from '../src/locale';
import { type ColorTokens, radius, space } from '../src/theme';
import { useTheme, useThemedStyles } from '../src/theme-context';
import { Screen, StackHeader, TAB_BAR_CLEARANCE, Text } from '../src/ui';
import { ProRow } from './search';

// §5.1.8 — Sana Yakın "Tümü": şehirdeki tüm salonlar; premium önce, kendi içinde mesafeye göre.
export default function NearbyScreen() {
  const { t } = useLocale();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const all = useProfessionals();
  const city = useStore((s) => s.currentUser?.city) ?? 'Almatı';
  const [notified, setNotified] = useState(false);

  const salons = useMemo(() => {
    const dist = (id: string) => distanceKm(cityCenter(city), proCoords(id));
    return all
      .filter((p) => p.city === city && p.kind === 'salon')
      .sort(
        (a, b) => Number(b.isPremium) - Number(a.isPremium) || dist(a.id) - dist(b.id),
      );
  }, [all, city]);

  return (
    <Screen edges={[]}>
      <StackHeader title={t('home.nearby')} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {salons.length === 0 ? (
          // §5.1.4 — boş şehir durumu: hizmet veren yoksa "yakında + haber ver"
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Ionicons name="location-outline" size={30} color={colors.accentFg} />
            </View>
            <Text variant="bodyStrong" tone="ink" style={styles.emptyTitle}>
              {fillParams(t('nearby.empty_title'), { city })}
            </Text>
            <Text variant="caption" tone="muted" style={styles.emptySub}>
              {t('nearby.empty_sub')}
            </Text>
            <Pressable onPress={() => setNotified(true)} disabled={notified} style={[styles.notify, notified && styles.notifyDone]}>
              <Ionicons name={notified ? 'checkmark' : 'notifications-outline'} size={16} color={colors.onAccent} />
              <Text variant="caption" tone="onAccent" style={styles.notifyText}>
                {notified ? t('nearby.notified') : t('nearby.notify')}
              </Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.list}>
            {salons.map((p, i) => (
              <ProRow
                key={p.id}
                pro={p}
                index={i}
                onPress={() => router.push('/professional/' + p.id)}
                right={
                  p.isPremium ? (
                    <View style={styles.premiumTag}>
                      <Ionicons name="star" size={11} color={colors.onAccent} />
                      <Text variant="caption" tone="onAccent" style={styles.premiumText}>
                        {t('nearby.premium')}
                      </Text>
                    </View>
                  ) : undefined
                }
              />
            ))}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    content: { paddingHorizontal: space(3), paddingTop: space(2), paddingBottom: TAB_BAR_CLEARANCE },
    list: { gap: space(1.5) },
    empty: { alignItems: 'center', paddingTop: space(8), gap: space(1) },
    emptyIcon: {
      width: 64,
      height: 64,
      borderRadius: radius.pill,
      backgroundColor: colors.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: space(0.5),
    },
    emptyTitle: { textAlign: 'center' },
    emptySub: { textAlign: 'center', paddingHorizontal: space(4) },
    notify: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(0.75),
      backgroundColor: colors.accent,
      paddingHorizontal: space(2),
      paddingVertical: space(1),
      borderRadius: radius.pill,
      marginTop: space(1.5),
    },
    notifyDone: { backgroundColor: colors.sage },
    notifyText: { fontWeight: '800' },
    premiumTag: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      backgroundColor: colors.accent,
      paddingHorizontal: space(1),
      paddingVertical: 4,
      borderRadius: radius.pill,
      alignSelf: 'center',
    },
    premiumText: { fontWeight: '800' },
  });
