import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import type { MessageKey } from '@ayna/i18n';
import { formatPrice, PREMIUM_PRICE_KZT } from '../../src/data';
import { useLocale } from '../../src/locale';
import { useStore } from '../../src/store';
import { type ColorTokens, radius, space } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import { Button, Screen, StackHeader, Text } from '../../src/ui';

type IoniconName = keyof typeof Ionicons.glyphMap;
// §11.1 — satıcı (uzman/salon) premium GÖRÜNÜRLÜK PAKETİ
const BENEFITS: { icon: IoniconName; title: MessageKey; desc: MessageKey }[] = [
  { icon: 'star', title: 'premium.b.featured', desc: 'premium.b.featured_d' },
  { icon: 'location', title: 'premium.b.nearby', desc: 'premium.b.nearby_d' },
  { icon: 'pricetags', title: 'premium.b.showcase', desc: 'premium.b.showcase_d' },
  { icon: 'chatbubbles', title: 'premium.b.demands', desc: 'premium.b.demands_d' },
  { icon: 'megaphone', title: 'premium.b.promo', desc: 'premium.b.promo_d' },
];

export default function SellerPremiumScreen() {
  const { t } = useLocale();
  const { colors, gradients, shadow } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const premium = useStore((s) => s.premium);
  const setPremium = useStore((s) => s.setPremium);

  // §460 — gerçek ödeme app DIŞINDA (banka/Kaspi + dekont); burada demo aktivasyon + onay.
  const purchase = () => {
    setPremium(true);
    Alert.alert(t('premium.activated_title'), t('premium.activated_body'), [
      { text: t('common.ok'), onPress: () => router.back() },
    ]);
  };

  return (
    <Screen edges={[]}>
      <StackHeader title={t('premium.title')} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Plan kartı */}
        <LinearGradient colors={gradients.gold} style={styles.plan}>
          <View style={styles.crown}>
            <Ionicons name="star" size={26} color={colors.onAccent} />
          </View>
          <Text variant="bodyStrong" tone="onAccent" style={styles.planName}>
            {t('premium.plan_name')}
          </Text>
          <View style={styles.priceRow}>
            <Text variant="display" tone="onAccent" style={styles.price}>
              {formatPrice(PREMIUM_PRICE_KZT)}
            </Text>
            <Text variant="bodyStrong" tone="onAccent" style={styles.perMonth}>
              {t('premium.per_month')}
            </Text>
          </View>
          <Text variant="caption" tone="onAccent" style={styles.tagline}>
            {t('premium.tagline')}
          </Text>
        </LinearGradient>

        {/* Avantajlar — görünürlük paketi (ikon + başlık + açıklama) */}
        <Text variant="bodyStrong" tone="ink" style={styles.sectionTitle}>
          {t('premium.section')}
        </Text>
        <View style={styles.benefits}>
          {BENEFITS.map((b) => (
            <View key={b.title} style={[styles.benefitRow, shadow.soft]}>
              <View style={styles.benefitIcon}>
                <Ionicons name={b.icon} size={19} color={colors.accentFg} />
              </View>
              <View style={styles.flex}>
                <Text variant="bodyStrong" tone="ink" numberOfLines={1}>
                  {t(b.title)}
                </Text>
                <Text variant="caption" tone="muted">
                  {t(b.desc)}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* §460 — ödeme app dışı bilgilendirme */}
        <View style={styles.payNote}>
          <Ionicons name="card-outline" size={15} color={colors.accentFg} />
          <Text variant="caption" tone="accentFg" style={styles.flex}>
            {t('premium.pay_note')}
          </Text>
        </View>

        <Text variant="caption" tone="muted" style={styles.cancel}>
          {t('premium.cancel')}
        </Text>
      </ScrollView>

      {/* Alt sabit CTA */}
      <View style={styles.footer}>
        {premium ? (
          <View style={styles.activeTag}>
            <Ionicons name="checkmark-circle" size={18} color={colors.success} />
            <Text variant="bodyStrong" tone="ink">
              {t('premium.already')}
            </Text>
          </View>
        ) : (
          <Button label={`${t('premium.cta')} · ${formatPrice(PREMIUM_PRICE_KZT)}`} variant="primary" onPress={purchase} />
        )}
      </View>
    </Screen>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    content: { paddingHorizontal: space(3), paddingTop: space(2.5), paddingBottom: space(4) },
    flex: { flex: 1 },
    plan: { borderRadius: radius.xl, padding: space(3), alignItems: 'center', gap: space(0.5) },
    crown: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: 'rgba(255,255,255,0.3)',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: space(0.5),
    },
    planName: { letterSpacing: 0.3, opacity: 0.95 },
    priceRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
    price: { fontSize: 40, letterSpacing: -1 },
    perMonth: { marginBottom: space(1), opacity: 0.9 },
    tagline: { opacity: 0.9, textAlign: 'center' },
    sectionTitle: { marginTop: space(3), marginBottom: space(1.5) },
    benefits: { gap: space(1.25) },
    benefitRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1.5),
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: space(1.75),
    },
    benefitIcon: {
      width: 44,
      height: 44,
      borderRadius: radius.md,
      backgroundColor: colors.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    payNote: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1),
      backgroundColor: colors.accentSoft,
      padding: space(1.5),
      borderRadius: radius.md,
      marginTop: space(3),
    },
    cancel: { textAlign: 'center', marginTop: space(2) },
    footer: {
      paddingHorizontal: space(3),
      paddingTop: space(1.5),
      paddingBottom: space(3),
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.line,
      backgroundColor: colors.bg,
    },
    activeTag: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space(0.75) },
  });
