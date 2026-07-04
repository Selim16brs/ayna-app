import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useLocale } from '../locale';
import { selectTier, useStore } from '../store';
import { type ColorTokens, radius, space } from '../theme';
import { useTheme, useThemedStyles } from '../theme-context';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

// §11 — KATMAN-FARKINDA ÜYELİK TEŞVİKİ (upsell):
// free (standart) → Premium + Platinum'a; premium → Platinum'a yükseltme. Platinum → gizli.
export function TierUpsell() {
  const { t } = useLocale();
  const { colors, gradients, shadow } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const tier = useStore(selectTier);

  if (tier === 'platinum') return null; // en üst katman → teşvik yok

  const toPlat = tier === 'premium'; // premium kullanıcı → Platinum'a yükselt
  const title = t(toPlat ? 'upsell.toPlat.title' : 'upsell.toPrem.title');
  const body = t(toPlat ? 'upsell.toPlat.body' : 'upsell.toPrem.body');
  const cta = t(toPlat ? 'upsell.toPlat.cta' : 'upsell.toPrem.cta');
  // free → Premium sekmesiyle aç (giriş fiyatı); premium → Platinum sekmesiyle
  const target = toPlat ? '/seller/premium?tier=platinum' : '/seller/premium?tier=premium';

  return (
    <PressableScale style={[styles.card, shadow.soft]} onPress={() => router.push(target as never)}>
      <LinearGradient colors={gradients.gold} style={styles.icon}>
        <Ionicons name={toPlat ? 'diamond' : 'sparkles'} size={18} color={colors.onAccent} />
      </LinearGradient>
      <View style={styles.flex}>
        <Text variant="bodyStrong" tone="ink" numberOfLines={1}>
          {title}
        </Text>
        <Text variant="caption" tone="muted" numberOfLines={2}>
          {body}
        </Text>
        <Text variant="caption" tone="accentFg" style={styles.cta}>
          {cta} →
        </Text>
      </View>
    </PressableScale>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1.25),
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: space(1.75),
    },
    flex: { flex: 1 },
    icon: { width: 42, height: 42, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
    cta: { fontWeight: '800', marginTop: 3 },
  });
