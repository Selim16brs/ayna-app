import { useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import MapView, { Marker, type Region } from 'react-native-maps';
import {
  CATEGORIES,
  cityCenter,
  distanceKm,
  priceLabel,
  type Professional,
  proCoords,
} from '../src/data';
import { useProfessionals } from '../src/catalog';
import { useStore } from '../src/store';
import { useLocale } from '../src/locale';
import { type ColorTokens, radius, space } from '../src/theme';
import { useTheme, useThemedStyles } from '../src/theme-context';
import { PressableScale, Screen, StackHeader, Text } from '../src/ui';

export default function MapScreen() {
  const router = useRouter();
  const { t } = useLocale();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const all = useProfessionals();
  // §5.1.4 — harita da şehre göre filtreli (salona bağlı uzmanlar zaten listede tek başına yok)
  const city = useStore((s) => s.currentUser?.city) ?? 'Almatı';
  const [cat, setCat] = useState<string | null>(null);
  const [selected, setSelected] = useState<Professional | null>(null);

  // Harita seçili ŞEHRİN merkezine odaklanır (Almatı seçince Almatı, Astana seçince Astana).
  const center = cityCenter(city);
  const region: Region = { ...center, latitudeDelta: 0.14, longitudeDelta: 0.14 };

  const pros = useMemo(
    () => all.filter((p) => p.city === city && (!cat || p.sector === cat)),
    [all, city, cat],
  );

  return (
    <Screen edges={[]}>
      <View style={styles.headerRow}>
        <StackHeader title={t('map.title')} />
        <PressableScale style={styles.listBtn} onPress={() => router.replace('/search')}>
          <Ionicons name="list" size={16} color={colors.ink} />
          <Text variant="caption" tone="ink">
            {t('map.list')}
          </Text>
        </PressableScale>
      </View>

      {/* Kategori filtresi */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
        style={styles.chipsWrap}
      >
        <Chip label={t('map.all')} active={cat === null} onPress={() => setCat(null)} />
        {CATEGORIES.map((c) => (
          <Chip
            key={c.id}
            label={t(c.labelKey)}
            active={cat === c.id}
            onPress={() => setCat(cat === c.id ? null : c.id)}
          />
        ))}
      </ScrollView>

      <View style={styles.mapWrap}>
        <MapView key={city} style={StyleSheet.absoluteFill} initialRegion={region}>
          {pros.map((p) => (
            <Marker
              key={p.id}
              coordinate={proCoords(p.id)}
              // §5.1.3 — salon vs bağımsız uzman pinleri görsel ayrı
              pinColor={p.kind === 'salon' ? colors.accentFg : colors.blue}
              onPress={() => setSelected(p)}
            />
          ))}
        </MapView>

        {/* Teklif motoru köprüsü (denge kuralı §7.4) */}
        {!selected ? (
          <PressableScale style={styles.bridge} onPress={() => router.push('/quote/new')}>
            <Ionicons name="sparkles" size={15} color={colors.onAccent} />
            <Text variant="caption" tone="onAccent" style={styles.bridgeText} numberOfLines={2}>
              {t('map.bridge')}
            </Text>
          </PressableScale>
        ) : null}

        {/* Seçili sağlayıcı mini kartı — kenarlıksız gölgeli SalonRow dili */}
        {selected ? (
          <View style={[styles.card, styles.cardShadow]}>
            <Pressable style={styles.cardClose} hitSlop={8} onPress={() => setSelected(null)}>
              <Ionicons name="close" size={16} color={colors.muted} />
            </Pressable>
            <View style={styles.cardRow}>
              <Image source={{ uri: selected.image }} style={styles.cardImage} />
              <View style={styles.cardBody}>
                <Text variant="bodyStrong" tone="ink" style={styles.cardName} numberOfLines={1}>
                  {selected.name}
                </Text>
                <Text variant="caption" tone="muted" numberOfLines={1}>
                  {selected.specialty}
                </Text>
                <View style={styles.cardMeta}>
                  <Ionicons name="star" size={12} color={colors.gold} />
                  <Text variant="caption" tone="inkSoft">
                    {selected.rating.toFixed(1)}
                  </Text>
                  <Text variant="caption" tone="muted">
                    · {distanceKm(center, proCoords(selected.id))} {t('map.distance')}
                  </Text>
                  <Text variant="caption" tone="muted">
                    · {priceLabel(selected)}
                  </Text>
                </View>
              </View>
            </View>
            <PressableScale
              style={styles.cardBtn}
              onPress={() => router.push('/professional/' + selected.id)}
            >
              <Text variant="bodyStrong" tone="onAccent">
                {t('map.open')}
              </Text>
            </PressableScale>
          </View>
        ) : null}
      </View>
    </Screen>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text variant="caption" tone={active ? 'onAccent' : 'inkSoft'} style={styles.chipText}>
        {label}
      </Text>
    </Pressable>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    listBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      marginRight: space(3),
      paddingHorizontal: space(1.75),
      paddingVertical: space(1),
      borderRadius: radius.pill,
      backgroundColor: colors.surfaceMuted,
    },
    chipsWrap: { maxHeight: 58 },
    chips: { paddingHorizontal: space(3), gap: space(1), paddingVertical: space(1) },
    chip: {
      paddingHorizontal: space(2),
      paddingVertical: space(1),
      borderRadius: radius.pill,
      backgroundColor: colors.surfaceMuted,
    },
    chipActive: { backgroundColor: colors.accent },
    chipText: { fontWeight: '700' },
    mapWrap: { flex: 1, overflow: 'hidden' },
    bridge: {
      position: 'absolute',
      top: space(1.5),
      left: space(2),
      right: space(2),
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1),
      backgroundColor: colors.accent,
      borderRadius: radius.pill,
      paddingHorizontal: space(2),
      paddingVertical: space(1.25),
    },
    bridgeText: { flex: 1 },
    card: {
      position: 'absolute',
      left: space(3),
      right: space(3),
      bottom: space(3),
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: space(2),
      gap: space(1.75),
    },
    cardShadow: {
      shadowColor: '#3A332B',
      shadowOpacity: 0.16,
      shadowRadius: 22,
      shadowOffset: { width: 0, height: 10 },
      elevation: 10,
    },
    cardClose: {
      position: 'absolute',
      top: space(1.25),
      right: space(1.25),
      zIndex: 2,
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardRow: { flexDirection: 'row', gap: space(1.5), alignItems: 'center' },
    cardImage: { width: 72, height: 72, borderRadius: radius.md, backgroundColor: colors.bgSunken },
    cardName: { fontSize: 16, fontWeight: '800', letterSpacing: -0.2 },
    cardBody: { flex: 1, gap: 3 },
    cardMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: 2,
      flexWrap: 'wrap',
    },
    cardBtn: {
      backgroundColor: colors.accent,
      borderRadius: radius.pill,
      paddingVertical: space(1.5),
      alignItems: 'center',
    },
  });
