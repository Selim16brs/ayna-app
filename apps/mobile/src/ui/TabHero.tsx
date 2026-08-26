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
      <View style={styles.row}>
        <View style={styles.textCol}>
          {subtitle ? (
            <Text variant="body" tone="inkSoft">
              {subtitle}
            </Text>
          ) : null}
          <Text tone="ink" style={styles.title} numberOfLines={1}>
            {title}
          </Text>
        </View>
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
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      gap: space(1.5),
      // Alt yazısı olan (Benim İçin/W2W) ve olmayan (Randevularım) sekmelerin
      // başlıkları aynı hizada başlasın.
      minHeight: 52,
    },
    textCol: { flex: 1, minWidth: 0 },
    title: {
      fontSize: 34,
      lineHeight: 40,
      fontFamily: font.semibold,
      letterSpacing: -0.8,
      marginTop: 3,
    },
  });
