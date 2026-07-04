import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { MessageKey } from '@ayna/i18n';
import { useLocale } from '../../src/locale';
import { useStore } from '../../src/store';
import { type ColorTokens, radius, space } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import { PressableScale, Screen, TAB_BAR_CLEARANCE, Text, TierUpsell } from '../../src/ui';

type IoniconName = keyof typeof Ionicons.glyphMap;

// §9.1 — yönetim öğeleri (Talepler + Takvim ana ekranda; buradakiler ikincil yönetim)
const ITEMS: {
  id: string;
  icon: IoniconName;
  labelKey: MessageKey;
  descKey: MessageKey;
  route: string;
  tone: 'accent' | 'sage' | 'lavender' | 'gold';
  salonOnly?: boolean;
}[] = [
  { id: 'reengage', icon: 'heart', labelKey: 'seller.menu.reengage', descKey: 'seller.menu.reengage_d', route: '/seller/reengage', tone: 'accent' },
  { id: 'always', icon: 'infinite', labelKey: 'seller.menu.always', descKey: 'seller.menu.always_d', route: '/always', tone: 'lavender' },
  { id: 'services', icon: 'pricetags', labelKey: 'reports.action.services', descKey: 'seller.menu.services_d', route: '/seller/services', tone: 'gold' },
  { id: 'commissions', icon: 'card', labelKey: 'reports.action.commissions', descKey: 'seller.menu.commissions_d', route: '/seller/commissions', tone: 'sage' },
  { id: 'reviews', icon: 'star', labelKey: 'reports.action.reviews', descKey: 'seller.menu.reviews_d', route: '/seller/reviews', tone: 'gold' },
  { id: 'gallery', icon: 'images', labelKey: 'reports.action.gallery', descKey: 'seller.menu.gallery_d', route: '/seller/gallery', tone: 'lavender' },
  { id: 'promotions', icon: 'megaphone', labelKey: 'reports.action.promotions', descKey: 'seller.menu.promotions_d', route: '/seller/promotions', tone: 'sage' },
  { id: 'share', icon: 'share-social', labelKey: 'share.title', descKey: 'share.menu_d', route: '/seller/share', tone: 'accent' },
  // §10.1 — davet kodu üretici yalnız salonda
  { id: 'codes', icon: 'key', labelKey: 'reports.action.codes', descKey: 'seller.menu.codes_d', route: '/seller/codes', tone: 'lavender', salonOnly: true },
];

export default function SellerMenuScreen() {
  const { t } = useLocale();
  const { colors, shadow } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isSalon = useStore((s) => s.currentUser?.role === 'salon');
  const items = ITEMS.filter((i) => !i.salonOnly || isSalon);

  const tone = (k: 'accent' | 'sage' | 'lavender' | 'gold') =>
    k === 'accent'
      ? { bg: colors.accentSoft, fg: colors.accentFg }
      : { bg: colors[`${k}Soft` as const], fg: colors[k] };

  return (
    <Screen edges={[]}>
      {/* Lime başlık bandı (geri butonu yok — tab kökü) */}
      <View style={[styles.header, { paddingTop: insets.top + space(1.5) }]}>
        <Text variant="display" tone="ink" style={styles.headerTitle}>
          {t('seller.nav.menu')}
        </Text>
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* §11 — üyelik teşviki (katman-farkında) */}
        <TierUpsell />
        {items.map((it) => {
          const c = tone(it.tone);
          return (
            <PressableScale
              key={it.id}
              style={[styles.row, shadow.soft]}
              onPress={() => router.push(it.route as never)}
            >
              <View style={[styles.icon, { backgroundColor: c.bg }]}>
                <Ionicons name={it.icon} size={22} color={c.fg} />
              </View>
              <View style={styles.rowText}>
                <Text variant="bodyStrong" tone="ink" numberOfLines={1}>
                  {t(it.labelKey)}
                </Text>
                <Text variant="caption" tone="muted" numberOfLines={1}>
                  {t(it.descKey)}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.muted} />
            </PressableScale>
          );
        })}
      </ScrollView>
    </Screen>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    header: {
      backgroundColor: colors.accent,
      paddingHorizontal: space(3),
      paddingBottom: space(2.5),
      borderBottomLeftRadius: radius.xl,
      borderBottomRightRadius: radius.xl,
    },
    headerTitle: { fontSize: 30, fontWeight: '800', letterSpacing: -0.5, marginTop: space(1) },
    content: { paddingHorizontal: space(3), paddingTop: space(2.5), paddingBottom: TAB_BAR_CLEARANCE + space(2), gap: space(1.5) },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1.5),
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: space(1.75),
    },
    icon: {
      width: 46,
      height: 46,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowText: { flex: 1, gap: 2 },
  });
