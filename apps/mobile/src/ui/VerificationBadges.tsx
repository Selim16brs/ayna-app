import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';
import type { MessageKey } from '@ayna/i18n';
import { StyleSheet, View } from 'react-native';

type IoniconName = ComponentProps<typeof Ionicons>['name'];
import { fillParams, useLocale } from '../locale';
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
          <Ionicons name="shield-checkmark" size={17} color={colors.onAccent} />
          <View>
            <Text variant="caption" tone="onAccent" style={styles.aynaText}>
              {t('verify.ayna')}
            </Text>
            {/* Sayı rozeti SÜSLEMEKTEN çıkarıp bilgiye çeviriyor: "AYNA Onaylı"
                tek başına neyin doğrulandığını söylemiyordu. */}
            <Text variant="micro" tone="onAccent" style={styles.aynaSub}>
              {fillParams(t('verify.layers_done'), {
                done: String(all.filter((i) => i.on).length),
                total: String(all.length),
              })}
            </Text>
          </View>
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
    /**
     * AYNA Onaylı AMBLEMİ — katman çiplerinden bilerek ayrı.
     *
     * Eskiden aynı `badge` kalıbındaydı: en önemli güven işareti, "BİN
     * doğrulanmadı" çipiyle aynı boyda ve aynı sıradaydı. Göz onu
     * seçemiyordu. Artık daha yüksek, iki satırlı ve tam genişlikte —
     * katman çipleri onun ALTINDA, destekleyici bilgi olarak duruyor.
     */
    aynaBadge: {
      backgroundColor: colors.accentFg,
      width: '100%',
      gap: space(1),
      paddingVertical: space(1),
      paddingHorizontal: space(1.5),
      borderRadius: radius.lg,
    },
    aynaText: { fontFamily: font.semibold },
    aynaSub: { opacity: 0.85, marginTop: 1 },
  });
