import type { ReactNode } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useLocale } from '../locale';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { type ColorTokens, radius, space, font } from '../theme';
import { useTheme, useThemedStyles } from '../theme-context';
import { Text } from './Text';

/**
 * Alt sayfa başlığı — KANVAS kalıbı (design/*.dc.html).
 *
 * Burada MOR BİR BANT vardı: accent zeminli, alt köşeleri yuvarlatılmış, 28pt
 * beyaz başlıklı bir hero. Kanvasların HİÇBİRİNDE böyle bir öğe yok — Randevu,
 * Puanlar, Teklifler, Yorumlar, Gizlilik, Boni ve Mesajlar artboard'larının
 * tamamı aynı kalıbı kullanıyor:
 *
 *     20px üst boşluk · 44×44 beyaz kart çip (geri) · 24px KOYU başlık ·
 *     14px soluk alt başlık · sayfa zemini (#FBF8F6)
 *
 * Bant 73 alt ekranda ortaktı, yani "alt ekranlar hiç değişmedi" şikâyetinin
 * tek kaynağı buydu. Tek yerde düzeltiliyor.
 *
 * Yan fayda: durum çubuğu yazısı açık temada KOYU (app/_layout.tsx). Mor bandın
 * üstünde koyu saat/pil okunmuyordu; açık zeminde doğru kontrasta kavuşuyor.
 *
 * Üst güvenli alanı kendisi ekler (Screen edges={[]}).
 */
export function StackHeader({
  title,
  subtitle,
  right,
  heroImage,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  // Bandın SAĞ ALTINA sabitlenen görsel (ör. Boni kedisi) — alt kenarı bantla aynı yerde biter.
  heroImage?: ReactNode;
}) {
  const { t } = useLocale();
  const router = useRouter();
  const { colors, shadow } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(makeStyles);
  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/discover');
  };
  return (
    <View style={[styles.hero, { paddingTop: insets.top + space(2.5) }]}>
      <Pressable
        style={[styles.back, shadow.soft]}
        onPress={goBack}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel={t('common.back')}
      >
        <Ionicons name="chevron-back" size={19} color={colors.ink} />
      </Pressable>
      {/* Başlık kutusu DARALABİLİR: uzun başlık geri çipini ya da sağdaki
          eylemi ekran dışına itmesin. heroImage MUTLAK konumlu (akış dışı),
          o yüzden başlığın altına girmesin diye sağdan yer bırakılır. */}
      <View style={[styles.texts, heroImage ? styles.textsWithHero : null]}>
        {title ? (
          <Text variant="display" tone="ink" numberOfLines={1} style={styles.title}>
            {title}
          </Text>
        ) : null}
        {subtitle ? (
          <Text variant="caption" tone="muted" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right ?? null}
      {heroImage ? <View style={styles.heroImageWrap}>{heroImage}</View> : null}
    </View>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    hero: {
      backgroundColor: colors.bg,
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1.5),
      paddingHorizontal: space(2.5),
      paddingBottom: space(1.75),
      position: 'relative',
      overflow: 'hidden', // heroImage kullanan ekranda taşan kısım kırpılır
    },
    // Başlığın SAĞ ALTI — görselin alt kenarı başlıkla aynı hizada biter
    heroImageWrap: { position: 'absolute', right: 0, bottom: 0, zIndex: 1 },
    back: {
      width: 44,
      height: 44,
      borderRadius: radius.xs,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
    },
    texts: { flexGrow: 1, flexShrink: 1, minWidth: 0, gap: 1 },
    textsWithHero: { paddingRight: 92 },
    title: {
      fontSize: 24,
      lineHeight: 28,
      fontFamily: font.semibold,
      letterSpacing: -0.4,
    },
  });
