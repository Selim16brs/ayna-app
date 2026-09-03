import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { servicesOf, tri } from '../taxonomy';
import { useHizmetYakinda } from '../yakinda';
import { useLocale } from '../locale';
import { radius, space, type ColorTokens, font } from '../theme';
import { useTheme, useThemedStyles } from '../theme-context';
import { Text } from './Text';
import { YakindaRozeti } from './YakindaRozeti';

/**
 * Alt hizmetler — YATAY kaydırmalı kartlar.
 *
 * ── FİYAT VE SÜRE KALDIRILDI ────────────────────────────────────────────
 *
 * Kurucu: "fiyat ve süre yazmak doğru olmaz çünkü herkesin fiyatı ve
 * işlem süresi farklı."
 *
 * Haklıydı ve gösterilen sayılar KİMSENİN fiyatı değildi: katalog
 * varsayılanlarıydı (`hizmet-varsayilan.ts`) — uzman kayıt olurken
 * doldurulan başlangıç değerleri. Müşteri "Kesim 9.000 ₸" görüp uzmanın
 * profilinde 15.000 ₸ ile karşılaşıyordu.
 *
 * Gerçek fiyat UZMANIN KENDİ satırında ve profilinde duruyor; kategori
 * ekranı hizmetin NE olduğunu anlatır, kaça olduğunu değil.
 */
export function ServiceCards({
  categoryId,
  value,
  onChange,
}: {
  categoryId: string;
  value: string | null;
  onChange: (id: string | null) => void;
}) {
  const { locale } = useLocale();
  const { colors, shadow } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const services = servicesOf(categoryId);
  const yakindaMi = useHizmetYakinda();
  if (services.length === 0) return null;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {services.map((s) => {
        const on = s.id === value;
        return (
          <Pressable
            key={s.id}
            onPress={() => onChange(on ? null : s.id)}
            style={[styles.card, shadow.soft, on && styles.cardOn]}
          >
            <View style={styles.topRow}>
              <Text
                variant="caption"
                tone={on ? 'onAccent' : 'ink'}
                style={styles.name}
                numberOfLines={2}
              >
                {tri(s.label, locale)}
              </Text>
              {on ? <Ionicons name="checkmark-circle" size={16} color={colors.onAccent} /> : null}
            </View>
            {/*
             * Brief §7.4 — bu alt hizmette yayında uzman yok. Kart yine de
             * SEÇİLEBİLİR: rozet bir kapı değil, beklenti ayarı. Müşteri
             * seçip talep bırakabilmeli; ters pazar yerinin mantığı arz
             * yokken bile talep toplamak.
             */}
            {yakindaMi(s.id) ? <YakindaRozeti /> : null}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    row: { gap: space(1.25), paddingRight: space(3), paddingVertical: space(0.5) },
    card: {
      width: 138,
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      padding: space(1.5),
      gap: space(0.75),
      justifyContent: 'space-between',
    },
    cardOn: { backgroundColor: colors.accent },
    topRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 4 },
    name: { flex: 1, fontFamily: font.semibold, fontSize: 13.5, lineHeight: 17 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
    meta: { fontSize: 11.5 },
    price: { fontFamily: font.semibold, fontSize: 13 },
  });
