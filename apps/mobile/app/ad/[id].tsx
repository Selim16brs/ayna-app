import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Image, Linking, ScrollView, StyleSheet, View } from 'react-native';

import { useLocale } from '../../src/locale';
import { type ColorTokens, radius, space } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import { Button, Screen, StackHeader, TAB_BAR_CLEARANCE, Text } from '../../src/ui';

// §5.1.6 — sponsorlu tedarikçi kampanya detay sayfası (reklam kartına dokununca açılır).
export default function SupplierAdScreen() {
  const { t } = useLocale();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const ad = undefined as import('../../src/data').SupplierAd | undefined; // demo reklam kaldırıldı — boş-durum

  if (!ad) {
    return (
      <Screen edges={[]}>
        <StackHeader title={t('seller.ads.title')} />
        <View style={styles.empty}>
          <Text variant="caption" tone="muted">
            {t('ad.not_found')}
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen edges={[]}>
      <StackHeader title={ad.brand} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Kapak görseli + marka/başlık + Sponsorlu rozeti */}
        <View style={styles.hero}>
          {ad.imageUri ? (
            <Image
              source={{ uri: ad.imageUri }}
              style={StyleSheet.absoluteFill}
              resizeMode="cover"
            />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.surfaceMuted }]} />
          )}
          <LinearGradient
            colors={['rgba(20,18,22,0.05)', 'rgba(20,18,22,0.35)', 'rgba(20,18,22,0.9)']}
            locations={[0, 0.45, 1]}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.sponsorTag}>
            <Ionicons name="pricetag" size={9} color="rgba(255,255,255,0.9)" />
            <Text variant="caption" style={styles.sponsorText}>
              {t('seller.ads.sponsored')}
            </Text>
          </View>
          <View style={styles.heroInfo}>
            <Text variant="caption" style={styles.heroBrand} numberOfLines={1}>
              {ad.brand}
            </Text>
            <Text variant="h2" style={styles.heroTitle} numberOfLines={2}>
              {ad.title}
            </Text>
          </View>
        </View>

        <View style={styles.body}>
          {/* Öne çıkan teklif */}
          {ad.offer ? (
            <View style={styles.offer}>
              <Ionicons name="gift" size={18} color={colors.accentFg} />
              <Text variant="bodyStrong" tone="ink" style={styles.flex}>
                {ad.offer}
              </Text>
            </View>
          ) : null}

          {/* Açıklama */}
          <Text variant="label" tone="accentFg" style={styles.sectionLabel}>
            {t('ad.about')}
          </Text>
          <Text variant="body" tone="inkSoft" style={styles.desc}>
            {ad.description ?? ad.subtitle}
          </Text>

          {/* Avantajlar */}
          {ad.perks && ad.perks.length > 0 ? (
            <>
              <Text variant="label" tone="accentFg" style={styles.sectionLabel}>
                {t('ad.perks')}
              </Text>
              <View style={styles.perks}>
                {ad.perks.map((p) => (
                  <View key={p} style={styles.perkRow}>
                    <View style={styles.check}>
                      <Ionicons name="checkmark" size={13} color={colors.onAccent} />
                    </View>
                    <Text variant="body" tone="ink" style={styles.flex}>
                      {p}
                    </Text>
                  </View>
                ))}
              </View>
            </>
          ) : null}

          {/* Sponsorlu içerik ifşası */}
          <View style={styles.disclosure}>
            <Ionicons name="information-circle-outline" size={14} color={colors.muted} />
            <Text variant="caption" tone="muted" style={styles.flex}>
              {t('ad.disclosure')}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Alt sabit CTA — iletişim */}
      {ad.contact ? (
        <View style={styles.footer}>
          <Button
            label={`${t('ad.contact')} · ${ad.contact}`}
            variant="primary"
            onPress={() =>
              Linking.openURL(`tel:${ad.contact!.replace(/[^0-9+]/g, '')}`).catch(() => undefined)
            }
          />
        </View>
      ) : null}
    </Screen>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    content: { paddingBottom: TAB_BAR_CLEARANCE + space(2) },
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    flex: { flex: 1 },
    hero: { height: 260, position: 'relative', justifyContent: 'flex-end' },
    sponsorTag: {
      position: 'absolute',
      top: space(1.5),
      right: space(2),
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: 'rgba(0,0,0,0.45)',
      paddingHorizontal: space(1),
      paddingVertical: 3,
      borderRadius: radius.pill,
    },
    sponsorText: { color: 'rgba(255,255,255,0.9)', fontSize: 9, letterSpacing: 0.3 },
    heroInfo: { padding: space(3), gap: 4 },
    heroBrand: { color: 'rgba(255,255,255,0.85)', fontWeight: '700', letterSpacing: 0.3 },
    heroTitle: { color: '#FFFFFF', letterSpacing: -0.4 },
    body: { paddingHorizontal: space(3), paddingTop: space(2.5) },
    offer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1.25),
      backgroundColor: colors.accentSoft,
      borderRadius: radius.lg,
      padding: space(1.75),
    },
    sectionLabel: { marginTop: space(2.5), marginBottom: space(1) },
    desc: { lineHeight: 22 },
    perks: { gap: space(1.25) },
    perkRow: { flexDirection: 'row', alignItems: 'center', gap: space(1.25) },
    check: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: colors.accentFg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    disclosure: {
      flexDirection: 'row',
      gap: space(1),
      backgroundColor: colors.surfaceMuted,
      borderRadius: radius.md,
      padding: space(1.5),
      marginTop: space(3),
    },
    footer: {
      paddingHorizontal: space(3),
      paddingTop: space(1.5),
      paddingBottom: space(3),
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.line,
      backgroundColor: colors.bg,
    },
  });
