import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { type ColorTokens, font, space } from '../theme';
import { useThemedStyles } from '../theme-context';
import { Text } from './Text';

/**
 * Sekme ekranlarının ortak başlığı — kanvas dili: AÇIK porselen zemin,
 * küçük selamlama üstte, büyük koyu isim altta.
 *
 * Önceki sürüm mor, alt köşeleri yuvarlak, kenardan kenara bir banttı ve tek
 * başına ÜÇ ekranı (Benim İçin · Randevularım · W2W) eski gösteriyordu.
 * Kanvasın hiçbir levhasında böyle bir bant yok; hepsi #FBF8F6 zemin.
 *
 * Sıralama da ana ekranla hizalandı: orada "İyi günler" küçük, "Selim" büyük.
 * Burada tersiydi — aynı kullanıcı iki sekmede iki farklı hiyerarşi görüyordu.
 */
export function TabHero({
  title,
  subtitle,
  right,
  children,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  children?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={[styles.hero, { paddingTop: insets.top + space(1.5) }]}>
      {/* Alt yazı KENDİ SATIRINDA, tam genişlikte.
          Eskiden sağdaki eylem düğmesiyle aynı satırı paylaşıyordu; Rusça
          metinler ("Настоящие советы от женщины к женщине") Türkçeden çok daha
          uzun olduğu için dört satıra bölünüyor, altındaki başlığı da
          sıkıştırıp "AYNA…" diye kırpıyordu. Satır genişliği DİLE GÖRE
          değiştiği için alt yazıyı düğmeyle yan yana koymak baştan kırılgandı. */}
      {subtitle ? (
        <Text variant="body" tone="inkSoft" numberOfLines={2} style={styles.subtitle}>
          {subtitle}
        </Text>
      ) : null}
      <View style={styles.row}>
        <Text tone="ink" style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {right ?? null}
      </View>
      {children}
    </View>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    hero: {
      backgroundColor: colors.bg,
      paddingHorizontal: space(2.5),
      paddingBottom: space(2),
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: space(1.5),
    },
    subtitle: { marginBottom: 2 },
    title: {
      fontSize: 34,
      lineHeight: 40,
      fontFamily: font.semibold,
      letterSpacing: -0.8,
      // Başlık daralabilir ama düğmeyi ezmez; düğme kendi boyunda kalır.
      flexShrink: 1,
      minWidth: 0,
    },
  });
