import { useEffect, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { ActivityIndicator, Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { type Region } from 'react-native-maps';
import { cityCenter, type LatLng } from '../data';
import { useLocale } from '../locale';
import { type ColorTokens, radius, space } from '../theme';
import { useTheme, useThemedStyles } from '../theme-context';
import { Text } from './Text';

export interface PickedAddress {
  address: string;
  district: string;
  city: string;
  lat: number;
  lng: number;
}

/**
 * §5.1.4 — Haritadan iğneyle konum seçici. Merkezde sabit iğne durur, harita altında kayar
 * (klasik "pin drop" deseni). "Bu konumu kullan" → ters-geocode → adres/ilçe/il otomatik dolar.
 * Konum izni yalnız "Konumum" için istenir; harita elle kaydırılarak da seçilebilir.
 */
export function AddressPicker({
  visible,
  initialCity,
  initialCoord,
  onClose,
  onPick,
}: {
  visible: boolean;
  initialCity?: string | undefined;
  initialCoord?: LatLng | undefined;
  onClose: () => void;
  onPick: (r: PickedAddress) => void;
}) {
  const { t } = useLocale();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  const start = initialCoord ?? cityCenter(initialCity);
  // Merkezdeki (iğne altındaki) güncel koordinat — harita durdukça güncellenir.
  const centerRef = useRef<LatLng>(start);
  const [resolving, setResolving] = useState(false);

  // Modal her açıldığında haritayı başlangıç bölgesine getir.
  useEffect(() => {
    if (visible) centerRef.current = start;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const region: Region = {
    latitude: start.latitude,
    longitude: start.longitude,
    latitudeDelta: 0.03,
    longitudeDelta: 0.03,
  };

  const goToMyLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return;
    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    }).catch(() => null);
    if (!pos) return;
    const c = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
    centerRef.current = c;
    mapRef.current?.animateToRegion({ ...c, latitudeDelta: 0.008, longitudeDelta: 0.008 }, 500);
  };

  const confirm = async () => {
    const c = centerRef.current;
    setResolving(true);
    let picked: PickedAddress = { address: '', district: '', city: initialCity ?? '', ...toLL(c) };
    try {
      const g = (await Location.reverseGeocodeAsync(c))[0];
      if (g) {
        const line = [g.street, g.streetNumber].filter(Boolean).join(' ').trim();
        picked = {
          address: line || g.name || '',
          district: g.district || g.subregion || '',
          city: g.city || g.region || initialCity || '',
          ...toLL(c),
        };
      }
    } catch {
      // Ters-geocode başarısız → yalnız koordinat döner; kullanıcı adresi elle yazar/düzeltir.
    } finally {
      setResolving(false);
    }
    onPick(picked);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          initialRegion={region}
          onRegionChangeComplete={(r) => {
            centerRef.current = { latitude: r.latitude, longitude: r.longitude };
          }}
        />

        {/* Merkezde sabit iğne — harita altında kayar, iğnenin ucu tam merkezde durur */}
        <View pointerEvents="none" style={styles.pinWrap}>
          <Ionicons name="location" size={44} color={colors.accentFg} style={styles.pin} />
        </View>

        {/* Üst: kapat + başlık + ipucu */}
        <View style={[styles.top, { paddingTop: insets.top + space(1) }]}>
          <Pressable style={styles.roundBtn} onPress={onClose} hitSlop={8}>
            <Ionicons name="chevron-back" size={22} color={colors.ink} />
          </Pressable>
          <View style={styles.titleBox}>
            <Text variant="bodyStrong" tone="ink" numberOfLines={1}>
              {t('addr.map_title')}
            </Text>
            <Text variant="caption" tone="muted" numberOfLines={1}>
              {t('addr.map_hint')}
            </Text>
          </View>
        </View>

        {/* Konumum */}
        <Pressable
          style={[styles.myLoc, { bottom: insets.bottom + space(12) }]}
          onPress={goToMyLocation}
        >
          <Ionicons name="locate" size={20} color={colors.ink} />
        </Pressable>

        {/* Alt: onay */}
        <View style={[styles.foot, { paddingBottom: insets.bottom + space(2) }]}>
          <Pressable style={styles.confirmBtn} onPress={confirm} disabled={resolving}>
            {resolving ? (
              <ActivityIndicator color={colors.onAccent} />
            ) : (
              <Text variant="bodyStrong" tone="onAccent">
                {t('addr.use_location')}
              </Text>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function toLL(c: LatLng): { lat: number; lng: number } {
  return { lat: c.latitude, lng: c.longitude };
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    // İğnenin ucu merkezde: kutuyu 44px yukarı kaydır (ikonun alt-orta ucu ekran merkezine denk gelsin).
    pinWrap: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pin: { marginBottom: 44 },
    top: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1.5),
      paddingHorizontal: space(2),
      paddingBottom: space(1.5),
    },
    roundBtn: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    titleBox: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      paddingHorizontal: space(1.75),
      paddingVertical: space(1),
    },
    myLoc: {
      position: 'absolute',
      right: space(2),
      width: 46,
      height: 46,
      borderRadius: 23,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOpacity: 0.15,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 3 },
      elevation: 4,
    },
    foot: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      paddingHorizontal: space(3),
    },
    confirmBtn: {
      backgroundColor: colors.accent,
      borderRadius: radius.pill,
      paddingVertical: space(1.75),
      alignItems: 'center',
    },
  });
