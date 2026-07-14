import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';
import type { MessageKey } from '@ayna/i18n';
import { StyleSheet, View } from 'react-native';

type IoniconName = ComponentProps<typeof Ionicons>['name'];
import { useLocale } from '../locale';
import { type ColorTokens, radius, space } from '../theme';
import { useTheme, useThemedStyles } from '../theme-context';
import { Text } from './Text';

type Verification = {
  identity: boolean;
  business: boolean;
  bin: boolean;
  address: boolean;
  social: boolean;
};

// §3.3 — KATMANLI güven rozetleri. Hepsi aynı anlama gelmez: AYNA Verified üst rozet (vurgulu),
// altında doğrulanan katmanlar (kimlik/işletme/BİN/adres/sosyal). Yalnız doğrulananlar gösterilir.
export function VerificationBadges({
  verification,
  aynaVerified,
}: {
  verification?: Verification | undefined;
  aynaVerified?: boolean | undefined;
}) {
  const { t } = useLocale();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  if (!verification) return null;
  const all: { on: boolean; icon: IoniconName; key: MessageKey }[] = [
    { on: verification.identity, icon: 'person-outline', key: 'verify.identity' },
    { on: verification.business, icon: 'business-outline', key: 'verify.business' },
    { on: verification.bin, icon: 'document-text-outline', key: 'verify.bin' },
    { on: verification.address, icon: 'location-outline', key: 'verify.address' },
    { on: verification.social, icon: 'share-social-outline', key: 'verify.social' },
  ];
  const items = all.filter((i) => i.on);
  if (!aynaVerified && items.length === 0) return null;
  return (
    <View style={styles.wrap}>
      {aynaVerified ? (
        <View style={[styles.badge, styles.aynaBadge]}>
          <Ionicons name="shield-checkmark" size={14} color={colors.onAccent} />
          <Text variant="caption" tone="onAccent" style={styles.aynaText}>
            {t('verify.ayna')}
          </Text>
        </View>
      ) : null}
      {items.map((i) => (
        <View key={i.key} style={styles.badge}>
          <Ionicons name={i.icon} size={13} color={colors.success} />
          <Text variant="caption" tone="inkSoft">
            {t(i.key)}
          </Text>
        </View>
      ))}
    </View>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space(0.75), marginTop: space(1) },
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(0.5),
      paddingHorizontal: space(1.25),
      paddingVertical: space(0.5),
      borderRadius: radius.pill,
      backgroundColor: colors.surfaceMuted,
    },
    aynaBadge: { backgroundColor: colors.accentFg },
    aynaText: { fontWeight: '800' },
  });
