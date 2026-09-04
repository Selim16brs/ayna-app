import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import { useLocale } from '../locale';
import { radius, space, type ColorTokens, type ThemeMode } from '../theme';
import { AKSANLAR, AKSAN_ANAHTARLARI } from '../theme.aksan';
import { useTheme, useThemedStyles } from '../theme-context';
import { Segmented } from './Segmented';
import { Text } from './Text';

/**
 * GÖRÜNÜM KARTI — tema kipi + uygulama rengi.
 *
 * Kurucu: "bizim müşteri tarafında yaptığımız ve uzman ile salonda da olan
 * şeyler otomatik olarak bu ekranlarda da yapılmalı… mesela zemine
 * attığımız üst taraftaki tasarım ve renk seçim olayı salon ve uzmanda da
 * olmalı."
 *
 * Bu blok müşteri profilinin İÇİNE yazılmıştı; salon profilinde yoktu.
 * Kopyalasaydım ikisi zamanla ayrışırdı — birine eklenen yeni renk
 * diğerinde çıkmazdı. Tek bileşen: her profil aynı kartı çiziyor,
 * değişiklik hepsine birden geliyor.
 *
 * Ayar HESABA DEĞİL CİHAZA ait: uzman hesabıyla girip rengi değiştiren
 * kişi müşteri hesabında da aynı rengi görüyor. Tek kişi iki rolde
 * dolaşıyor; uygulamanın rengi ona ait, rolüne değil.
 */
export function GorunumKarti() {
  const { t } = useLocale();
  const { colors, preference, setPreference, aksan, setAksan, isDark } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const appearance: 'system' | ThemeMode = preference ?? 'system';

  return (
    <View style={styles.kart}>
      <View style={styles.baslik}>
        <Ionicons name="contrast-outline" size={18} color={colors.inkSoft} />
        <Text variant="bodyStrong" tone="ink" style={styles.flex}>
          {t('profile.appearance')}
        </Text>
      </View>
      <Segmented
        value={appearance}
        onChange={(v: 'system' | ThemeMode) => setPreference(v === 'system' ? null : v)}
        options={[
          { value: 'system', label: t('profile.appearance.system') },
          { value: 'light', label: t('profile.appearance.light') },
          { value: 'dark', label: t('profile.appearance.dark') },
        ]}
      />

      {/*
       * UYGULAMA RENGİ — ayrı bir ekran DEĞİL: "uygulama nasıl görünsün"
       * tek bir soru; ikiye bölüp kullanıcıyı iki yere göndermek gereksiz.
       *
       * Yuvarlaklar SEÇİLİ TEMANIN rengini gösteriyor — koyu temada açık
       * temanın tonunu göstermek yanıltıcı olurdu.
       */}
      <View style={styles.ayrac} />
      <View style={styles.baslik}>
        <Ionicons name="color-palette-outline" size={18} color={colors.inkSoft} />
        <Text variant="bodyStrong" tone="ink" style={styles.flex}>
          {t('profile.accent')}
        </Text>
        <Text variant="caption" tone="muted">
          {t(AKSANLAR[aksan].etiket)}
        </Text>
      </View>
      <Text variant="caption" tone="muted">
        {t('profile.accent.hint')}
      </Text>
      <View style={styles.renkIzgara}>
        {AKSAN_ANAHTARLARI.map((anahtar) => {
          const secili = anahtar === aksan;
          const renk = AKSANLAR[anahtar][isDark ? 'dark' : 'light'].accent;
          return (
            <Pressable
              key={anahtar}
              onPress={() => setAksan(anahtar)}
              style={styles.renkHucre}
              hitSlop={4}
              accessibilityRole="button"
              accessibilityState={{ selected: secili }}
              accessibilityLabel={t(AKSANLAR[anahtar].etiket)}
            >
              <View style={[styles.renkHalka, secili && { borderColor: renk }]}>
                <View style={[styles.renkDaire, { backgroundColor: renk }]}>
                  {/*
                   * Seçili olan yalnız halkayla değil TİKLE de belli oluyor:
                   * renk körlüğünde iki yakın ton halkadan ayırt edilemez.
                   */}
                  {secili ? <Ionicons name="checkmark" size={20} color={colors.onAccent} /> : null}
                </View>
              </View>
              <Text
                variant="micro"
                tone={secili ? 'ink' : 'muted'}
                numberOfLines={1}
                style={styles.renkAd}
              >
                {t(AKSANLAR[anahtar].etiket)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    kart: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: space(2),
      marginBottom: space(2),
      gap: space(1.5),
    },
    baslik: { flexDirection: 'row', alignItems: 'center', gap: space(1) },
    flex: { flex: 1 },
    ayrac: { height: StyleSheet.hairlineWidth, backgroundColor: colors.line },
    // Sekiz yuvarlak, satıra dört. Sabit genişlik: ad etiketleri farklı
    // uzunlukta olunca kaymayı önlüyor.
    renkIzgara: { flexDirection: 'row', flexWrap: 'wrap', rowGap: space(1.5) },
    renkHucre: { width: '25%', alignItems: 'center', gap: 6 },
    // Halka + iç daire = 50pt: dokunma hedefi 44pt eşiğinin üstünde.
    renkHalka: { padding: 3, borderRadius: 100, borderWidth: 2, borderColor: 'transparent' },
    renkDaire: {
      width: 40,
      height: 40,
      borderRadius: 100,
      alignItems: 'center',
      justifyContent: 'center',
    },
    renkAd: { textAlign: 'center' },
  });
