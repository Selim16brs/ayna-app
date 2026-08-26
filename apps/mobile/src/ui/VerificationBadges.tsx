import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';
import type { MessageKey } from '@ayna/i18n';
import { StyleSheet, View } from 'react-native';

type IoniconName = ComponentProps<typeof Ionicons>['name'];
import { useLocale } from '../locale';
import { type ColorTokens, radius, space, font } from '../theme';
import { useTheme, useThemedStyles } from '../theme-context';
import { Text } from './Text';

type Verification = {
  identity: boolean;
  business: boolean;
  bin: boolean;
  address: boolean;
  social: boolean;
  cert?: boolean; // §uzman onboarding — uzmana özel: doğrulanmış sertifika
};

// §3.3 — KATMANLI güven rozetleri. Hepsi aynı anlama gelmez: AYNA Verified üst rozet (vurgulu),
// altında katmanlar (kimlik/işletme/BİN/adres/sertifika/sosyal).
//
// TASARIM KARARI: DOĞRULANMAYAN katman da gösterilir — soluk, üstü çizili ve
// "doğrulanmadı" etiketiyle. Yalnız yeşilleri göstermek, eksiği gizleyip herkesi
// "tam doğrulanmış" gibi gösterir; kullanıcı neyin EKSİK olduğunu göremez.
// Gerçeğin kendisi, tek bir "doğrulandı" etiketinden daha çok güven verir.
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
    { on: verification.cert ?? false, icon: 'ribbon-outline', key: 'verify.cert' },
    { on: verification.social, icon: 'share-social-outline', key: 'verify.social' },
  ];
  // Doğrulananlar önce, eksikler sonra — göz önce kazanılmışı görsün.
  const items = [...all].sort((a, b) => Number(b.on) - Number(a.on));
  if (!aynaVerified && all.every((i) => !i.on)) return null;
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
        <View key={i.key} style={[styles.badge, !i.on && styles.badgeOff]}>
          <Ionicons
            name={i.on ? i.icon : 'ellipse-outline'}
            size={13}
            color={i.on ? colors.success : colors.muted}
          />
          <Text variant="caption" tone={i.on ? 'inkSoft' : 'muted'}>
            {t(i.key)}
            {i.on ? '' : ` · ${t('verify.not_yet')}`}
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
    badgeOff: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.line },
    aynaBadge: { backgroundColor: colors.accentFg },
    aynaText: { fontFamily: font.semibold },
  });
