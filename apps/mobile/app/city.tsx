import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { CITIES, nearestCity } from '../src/data';
import { useLocale } from '../src/locale';
import { useStore } from '../src/store';
import { radius, space, type ColorTokens } from '../src/theme';
import { useTheme, useThemedStyles } from '../src/theme-context';
import { Screen, StackHeader, TAB_BAR_CLEARANCE, Text, TextInput } from '../src/ui';

// §5.1.4 — Şehir seçimi: "Konumumu kullan" (GPS) + arama + tüm KZ şehirleri.
export default function CityScreen() {
  const { t } = useLocale();
  const router = useRouter();
  const { colors, shadow } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const city = useStore((s) => s.currentUser?.city) ?? 'Almatı';
  const setCity = useStore((s) => s.setCity);
  const [q, setQ] = useState('');
  const [locating, setLocating] = useState(false);

  function pick(c: string) {
    setCity(c);
    router.back();
  }

  // GPS ile en yakın şehri bul → seç (§5.1.4 "Konumumu kullan")
  async function useMyLocation() {
    if (locating) return;
    setLocating(true);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== 'granted') return;
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      pick(nearestCity({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }));
    } catch {
      /* yut */
    } finally {
      setLocating(false);
    }
  }

  const filtered = useMemo(() => {
    const norm = q.trim().toLocaleLowerCase('tr');
    return norm ? CITIES.filter((c) => c.toLocaleLowerCase('tr').includes(norm)) : CITIES;
  }, [q]);

  return (
    <Screen edges={[]}>
      <StackHeader title={t('city.title')} />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Konumumu kullan */}
        <Pressable onPress={useMyLocation} style={[styles.gpsRow, shadow.soft]} disabled={locating}>
          <View style={styles.gpsIcon}>
            <Ionicons name="navigate" size={20} color={colors.onAccent} />
          </View>
          <Text variant="bodyStrong" tone="ink" style={styles.rowLabel}>
            {locating ? t('city.locating') : t('city.use_location')}
          </Text>
          <Ionicons name="chevron-forward" size={18} color={colors.muted} />
        </Pressable>

        {/* Arama */}
        <View style={[styles.search, { backgroundColor: colors.surfaceMuted }]}>
          <Ionicons name="search" size={18} color={colors.muted} />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder={t('city.search_placeholder')}
            placeholderTextColor={colors.muted}
            style={styles.searchInput}
          />
        </View>

        {filtered.length === 0 ? (
          <Text variant="caption" tone="muted" style={styles.noMatch}>
            {t('city.no_match')}
          </Text>
        ) : (
          filtered.map((c) => {
            const active = c === city;
            return (
              <Pressable
                key={c}
                style={[styles.row, shadow.soft, active && styles.rowActive]}
                onPress={() => pick(c)}
              >
                <View style={[styles.pin, active && styles.pinActive]}>
                  <Ionicons
                    name="location"
                    size={20}
                    color={active ? colors.onAccent : colors.inkSoft}
                  />
                </View>
                <Text
                  variant="bodyStrong"
                  tone={active ? 'onAccent' : 'ink'}
                  style={styles.rowLabel}
                >
                  {c}
                </Text>
                {active ? (
                  <View style={styles.check}>
                    <Ionicons name="checkmark" size={18} color={colors.onAccent} />
                  </View>
                ) : null}
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </Screen>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    content: {
      paddingHorizontal: space(3),
      paddingTop: space(2),
      paddingBottom: TAB_BAR_CLEARANCE + space(6),
      gap: space(1.5),
    },
    gpsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1.5),
      height: 60,
      paddingHorizontal: space(1.75),
      borderRadius: radius.lg,
      backgroundColor: colors.surface,
    },
    gpsIcon: {
      width: 44,
      height: 44,
      borderRadius: radius.md,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    search: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1),
      borderRadius: radius.md,
      paddingHorizontal: space(1.75),
      height: 48,
    },
    searchInput: { flex: 1, color: colors.ink, fontSize: 15 },
    noMatch: { textAlign: 'center', paddingVertical: space(4) },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1.5),
      height: 66,
      paddingHorizontal: space(1.75),
      borderRadius: radius.lg,
      backgroundColor: colors.surface,
    },
    rowActive: { backgroundColor: colors.accent },
    pin: {
      width: 44,
      height: 44,
      borderRadius: radius.md,
      backgroundColor: colors.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pinActive: { backgroundColor: 'rgba(255,255,255,0.35)' },
    rowLabel: { flex: 1, fontSize: 16, fontWeight: '800', letterSpacing: -0.2 },
    check: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: 'rgba(255,255,255,0.35)',
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
