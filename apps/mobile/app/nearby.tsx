import { useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { kullaniciKonumu, konumuVar, gercekMesafeKm } from '../src/data';
import { useProfessionals, useProfessionalsLoading } from '../src/catalog';
import { useStore } from '../src/store';
import { fillParams, useLocale } from '../src/locale';
import { type ColorTokens, radius, space, font } from '../src/theme';
import { useTheme, useThemedStyles } from '../src/theme-context';
import { Screen, StackHeader, Text, ListSkeleton } from '../src/ui';
import { ProRow } from './search';

// §5.1.8 — Sana Yakın "Tümü": şehirdeki tüm salonlar; premium önce, kendi içinde mesafeye göre.
export default function NearbyScreen() {
  const { t } = useLocale();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const all = useProfessionals();
  const loading = useProfessionalsLoading();
  const city = useStore((s) => s.currentUser?.city) ?? 'Almatı';
  const [notified, setNotified] = useState(false);

  const addresses = useStore((s) => s.addresses);
  /*
   * "YAKINIMDAKİLER" GERÇEK KONUMA DAYANIYOR.
   *
   * Kurucu: "bir müşteri yakınındakileri seçtiğinde ona alakasız
   * uzaklıktaki yerler çıkarsa bu sorun olur."
   *
   * Eskiden mesafe KULLANICININ ŞEHİR MERKEZİ ile UYDURULMUŞ salon konumu
   * arasında hesaplanıyordu: iki ucu da gerçek değildi, sıralama rastgeleydi.
   *
   * Artık iki uç da gerçekse sıralanıyor. Değilse sıralama YAPILMIYOR —
   * yanlış sırayı doğru sanmaktansa sıralamamak doğru; kullanıcıya da
   * neden olduğu söyleniyor.
   */
  const benimKonum = kullaniciKonumu(addresses);
  // Bağlantıdaki `tur=uzman` uzman listesini açıyor; yoksa salonlar.
  const { tur } = useLocalSearchParams<{ tur?: string }>();
  const uzmanlar = tur === 'uzman';

  const { salons, siralanabilir } = useMemo(() => {
    /*
     * AYNI EKRAN İKİ LİSTEYE HİZMET EDİYOR.
     *
     * Kurucu: "hem yakınındaki salonlar hem de yakınındaki uzmanlar ilk 3
     * görünmeli… kalanlar tümü butonuna basılarak görünmeli."
     *
     * İki ayrı ekran açsaydım mesafe hesabı, sıralama kuralı ve "sıralama
     * yapılamıyor" uyarısı iki kez yazılır ve zamanla ayrışırdı. Tür
     * bağlantıdan geliyor.
     */
    const liste = all.filter(
      (p) => p.city === city && (uzmanlar ? p.kind !== 'salon' : p.kind === 'salon'),
    );
    const konumlu = liste.filter((p) => konumuVar(p));
    // Sıralama ancak KULLANICININ ve en az bir salonun konumu varsa anlamlı.
    const ok = benimKonum !== null && konumlu.length > 0;
    if (!ok) {
      return {
        salons: [...liste].sort((a, b) => Number(b.isPremium) - Number(a.isPremium)),
        siralanabilir: false,
      };
    }
    const uzaklik = (p: (typeof liste)[number]) =>
      gercekMesafeKm(benimKonum, { latitude: p.lat!, longitude: p.lng! }) ??
      Number.MAX_SAFE_INTEGER;
    return {
      salons: [...liste].sort(
        (a, b) => Number(b.isPremium) - Number(a.isPremium) || uzaklik(a) - uzaklik(b),
      ),
      siralanabilir: true,
    };
  }, [all, city, benimKonum, uzmanlar]);

  return (
    <Screen edges={[]}>
      <StackHeader title={t(uzmanlar ? 'home.nearby_experts' : 'home.nearby')} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/*
         * Sıralanamıyorsa SÖYLENİYOR. Sessizce rastgele sıralamak,
         * kullanıcının "en yakın" sandığı şeyin öyle olmaması demek.
         */}
        {!loading && salons.length > 0 && !siralanabilir ? (
          <View style={styles.uyari}>
            <Ionicons name="information-circle-outline" size={16} color={colors.inkSoft} />
            <Text variant="caption" tone="inkSoft" style={styles.uyariYazi}>
              {t('nearby.no_location')}
            </Text>
          </View>
        ) : null}
        {loading ? (
          <ListSkeleton rows={4} />
        ) : salons.length === 0 ? (
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
            <Pressable
              onPress={() => setNotified(true)}
              disabled={notified}
              style={[styles.notify, notified && styles.notifyDone]}
            >
              <Ionicons
                name={notified ? 'checkmark' : 'notifications-outline'}
                size={16}
                color={colors.onAccent}
              />
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
    uyari: {
      flexDirection: 'row',
      gap: space(1),
      alignItems: 'flex-start',
      padding: space(1.75),
      borderRadius: radius.md,
      backgroundColor: colors.surfaceMuted,
      marginBottom: space(2),
    },
    uyariYazi: { flex: 1, lineHeight: 19 },

    content: {
      paddingHorizontal: space(3),
      paddingTop: space(2),
      paddingBottom: space(3),
    },
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
    notifyText: { fontFamily: font.semibold },
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
    premiumText: { fontFamily: font.semibold },
  });
