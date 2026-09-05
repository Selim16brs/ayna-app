import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { api } from '../../src/api';
import { useLocale } from '../../src/locale';
import { useStore } from '../../src/store';
import { type ColorTokens, radius, space } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import { AddressPicker, Button, Screen, StackHeader, Text } from '../../src/ui';

/**
 * KONUMUM — mevcut uzman/salon konumunu haritadan düzeltir.
 *
 * Konum kayıtta zorunlu oldu ama MEVCUT kayıtlarda yok: canlıda 25 uzmanın
 * 25'inde koordinat boştu. Onların da düzeltebilmesi gerekiyor, yoksa eski
 * uzmanlar "yakınımdakiler" sıralamasında sonsuza kadar dışarıda kalır.
 *
 * Kurucu: "nihai lokasyonu haritada belirlemeli veya kontrol etmelidir."
 * Bu yüzden ekranda tek eylem var ve o da haritayı açıyor; serbest metinle
 * konum girilemiyor.
 *
 * Admin onayı YOK — konum iletişim bilgisi değil (§profil-anında).
 */
export default function SellerLocationScreen() {
  const { t } = useLocale();
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const token = useStore((s) => s.token);
  const sehir = useStore((s) => s.currentUser?.city);

  const [koord, setKoord] = useState<{ lat: number; lng: number } | null>(null);
  const [adres, setAdres] = useState('');
  const [ilce, setIlce] = useState('');
  const [sehirSecim, setSehirSecim] = useState<string | null>(null);
  const [acik, setAcik] = useState(false);
  const [mesgul, setMesgul] = useState(false);

  const kaydet = async () => {
    if (!koord || !token || mesgul) return;
    setMesgul(true);
    try {
      await api.setMyLocation(
        {
          lat: koord.lat,
          lng: koord.lng,
          ...(adres ? { address: adres } : {}),
          ...(ilce ? { district: ilce } : {}),
          ...(sehirSecim ? { city: sehirSecim } : {}),
        },
        token,
      );
      Alert.alert(t('seller.location.saved'), undefined, [
        { text: t('common.ok'), onPress: () => router.back() },
      ]);
    } catch {
      Alert.alert(t('seller.location.title'), t('profile.edit.save_err'));
    } finally {
      setMesgul(false);
    }
  };

  return (
    <Screen edges={[]}>
      <StackHeader title={t('seller.location.title')} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Neden gerekli — kuru bir form yerine sebebi yazılı. */}
        <View style={styles.neden}>
          <Ionicons name="navigate-outline" size={18} color={colors.accentFg} />
          <Text variant="caption" tone="inkSoft" style={styles.nedenYazi}>
            {t('seller.location.why')}
          </Text>
        </View>

        <Button
          label={koord ? t('seller.location.change') : t('addresses.pick_on_map')}
          variant={koord ? 'secondary' : 'primary'}
          onPress={() => setAcik(true)}
        />

        {koord ? (
          <View style={styles.ozet}>
            <View style={styles.ozetSatir}>
              <Ionicons name="location" size={16} color={colors.accentFg} />
              <Text variant="bodyStrong" tone="ink" style={styles.ozetYazi}>
                {adres || t('addresses.pinned')}
              </Text>
            </View>
            {ilce || sehirSecim ? (
              <Text variant="caption" tone="muted">
                {[sehirSecim, ilce].filter(Boolean).join(' · ')}
              </Text>
            ) : null}
            {/*
             * Koordinat AÇIKÇA gösteriliyor: kurucu "kontrol etmelidir"
             * dedi. Uzman iğnenin nereye düştüğünü doğrulayabilmeli.
             */}
            <Text variant="micro" tone="muted">
              {koord.lat.toFixed(5)}, {koord.lng.toFixed(5)}
            </Text>
          </View>
        ) : null}

        {koord ? (
          <Button
            label={t('common.save')}
            onPress={() => void kaydet()}
            loading={mesgul}
            disabled={mesgul}
          />
        ) : null}

        <AddressPicker
          visible={acik}
          initialCity={sehir ?? undefined}
          initialCoord={koord ? { latitude: koord.lat, longitude: koord.lng } : undefined}
          onClose={() => setAcik(false)}
          onPick={(r) => {
            setKoord({ lat: r.lat, lng: r.lng });
            if (r.address) setAdres(r.address);
            if (r.district) setIlce(r.district);
            if (r.city) setSehirSecim(r.city);
          }}
        />
      </ScrollView>
    </Screen>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    content: {
      padding: space(3),
      paddingBottom: space(3),
      gap: space(2),
    },
    neden: {
      flexDirection: 'row',
      gap: space(1.25),
      alignItems: 'flex-start',
      padding: space(2),
      borderRadius: radius.lg,
      backgroundColor: colors.surfaceMuted,
    },
    nedenYazi: { flex: 1, lineHeight: 20 },
    ozet: {
      gap: space(0.75),
      padding: space(2),
      borderRadius: radius.lg,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.line,
    },
    ozetSatir: { flexDirection: 'row', alignItems: 'center', gap: space(1) },
    ozetYazi: { flex: 1 },
  });
