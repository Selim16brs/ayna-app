import { Ionicons } from '@expo/vector-icons';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import type { PromosyonKarti as Karti } from '@ayna/domain';
import { useLocale } from '../locale';
import { font, radius, space, type ColorTokens } from '../theme';
import { useTheme, useThemedStyles } from '../theme-context';
import { Text } from './Text';

/**
 * PROMOSYON KARTI — uzmanın kendi kampanyası.
 *
 * "Fırsatlar"daki ücretli vitrin kartından AYRI görünüyor: orada
 * "SPONSORLU" etiketi var, burada uzmanın adı ve puanı. İkisini aynı
 * kartla çizmek, ödenmiş yerleşimle ücretsiz hakkı aynı şey gibi
 * göstermek olurdu.
 *
 * ── UYDURMA SAYI YOK ────────────────────────────────────────────────────
 *
 * Mesafe bilinmiyorsa yazılmıyor (koordinatı olmayan işletme). Puanı
 * olmayan uzman "0,0" değil — değerlendirilmemiş olmak en kötü puanı
 * almakla aynı şey değil.
 */
export function PromosyonKarti({
  p,
  onPress,
  /**
   * Liste ekranında TAM GENİŞLİK. Ana ekrandaki yatay şeritte sabit
   * genişlik gerekiyor; liste ekranında sabit kalsaydı kartlar solda dar
   * bir sütun oluşturur, sağda boşluk kalırdı.
   */
  genis = false,
}: {
  p: Karti;
  onPress: () => void;
  genis?: boolean;
}) {
  const { t } = useLocale();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <Pressable
      style={[styles.kart, genis && styles.kartGenis]}
      onPress={onPress}
      accessibilityRole="button"
    >
      {p.gorsel ? (
        <Image source={{ uri: p.gorsel }} style={styles.gorsel} resizeMode="cover" />
      ) : (
        <View style={[styles.gorsel, styles.gorselBos]}>
          <Ionicons name="pricetag-outline" size={22} color={colors.accentFg} />
        </View>
      )}
      <View style={styles.govde}>
        <Text variant="bodyStrong" tone="ink" numberOfLines={1}>
          {p.baslik}
        </Text>
        <Text variant="caption" tone="muted" numberOfLines={1}>
          {p.proAd}
        </Text>
        {/*
          AÇIKLAMA İNDİRİMİN YERİNE GEÇMİYOR: indirim ayrı bir rozet.
          Dar kartta yer yok — açıklama yalnız geniş (liste) hâlde.
          Alt yazıya "-%30" yazsaydık kampanyanın kendi anlatımı ekrana
          hiç çıkmazdı.
        */}
        {genis && p.aciklama ? (
          <Text variant="micro" tone="inkSoft" numberOfLines={2}>
            {p.aciklama}
          </Text>
        ) : null}
        <View style={styles.meta}>
          {p.puan !== null ? (
            <>
              <Ionicons name="star" size={11} color={colors.gold} />
              <Text variant="micro" tone="inkSoft">
                {p.puan.toFixed(1)}
              </Text>
            </>
          ) : (
            <Text variant="micro" tone="muted" numberOfLines={1}>
              {t('promos.no_rating')}
            </Text>
          )}
          {p.mesafeKm !== null ? (
            <Text variant="micro" tone="muted">
              · {p.mesafeKm.toFixed(1)} km
            </Text>
          ) : null}
        </View>
      </View>
      {p.indirimYuzde !== null ? (
        <View style={styles.rozet}>
          <Text variant="micro" style={styles.rozetYazi}>
            %{p.indirimYuzde}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    kart: {
      width: 260,
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1.25),
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: space(1.25),
    },
    kartGenis: { width: 'auto', alignSelf: 'stretch' },
    gorsel: { width: 56, height: 56, borderRadius: radius.md },
    gorselBos: {
      backgroundColor: colors.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    govde: { flex: 1, gap: 2 },
    meta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    rozet: {
      paddingHorizontal: space(0.75),
      paddingVertical: 2,
      borderRadius: radius.pill,
      backgroundColor: colors.accent,
    },
    rozetYazi: { color: colors.onAccent, fontFamily: font.semibold },
  });
