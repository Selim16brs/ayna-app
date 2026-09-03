import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import { servicesOf, tri } from '../taxonomy';
import { useHizmetYakinda } from '../yakinda';
import { useLocale } from '../locale';
import { radius, space, type ColorTokens, font } from '../theme';
import { useTheme, useThemedStyles } from '../theme-context';
import { Text } from './Text';
import { YakindaRozeti } from './YakindaRozeti';

/**
 * Bir ana kategorinin ALT HİZMETLERİ (taksonomi) — ferah, sarmalayan (wrap) çip bulutu.
 * Tümü tek bakışta görünür (yatay kaydırma yok); tek seçim, seçili çipe tekrar basınca kalkar.
 * Keşfet→kategori, talep akışı vb. her yerde AYNI merkezi listeden gelir.
 */
export function ServiceChips({
  categoryId,
  value,
  onChange,
  secilenler,
  degistir,
}: {
  categoryId: string;
  /** Tek seçim kipi (eski çağıranlar). */
  value?: string | null;
  onChange?: (id: string | null) => void;
  /**
   * ÇOKLU seçim kipi — brief §4.5 (düğün paketi).
   *
   * Verilirse tek seçim yok sayılıyor. İki ayrı bileşen yazmak yerine
   * kip eklendi: çipin görünümü, üç dilli adı ve "Yakında" rozeti aynı
   * kalmalı, ikinci bir kopya zamanla ayrışırdı.
   *
   * Liste TÜM kategorilerin seçimini taşıyor; bu bileşen yalnız kendi
   * kategorisindekileri işaretliyor. Böylece kullanıcı kategoriler
   * arasında gezerken seçimleri kaybolmuyor — gelin paketi zaten üç
   * ayrı kategoriden hizmet topluyor.
   */
  secilenler?: readonly string[];
  degistir?: (yeni: string[]) => void;
}) {
  const { locale } = useLocale();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const services = servicesOf(categoryId);
  const yakindaMi = useHizmetYakinda();
  if (services.length === 0) return null;
  return (
    <View style={styles.wrap}>
      {services.map((s) => {
        const coklu = !!degistir && !!secilenler;
        const on = coklu ? secilenler!.includes(s.id) : s.id === value;
        const dokun = () => {
          if (coklu) {
            degistir!(
              secilenler!.includes(s.id)
                ? secilenler!.filter((x) => x !== s.id)
                : [...secilenler!, s.id],
            );
            return;
          }
          onChange?.(on ? null : s.id);
        };
        return (
          <Pressable
            key={s.id}
            onPress={dokun}
            style={[styles.chip, on ? styles.chipOn : styles.chipOff]}
            hitSlop={4}
          >
            <Ionicons
              name={on ? 'checkmark-circle' : 'add-circle-outline'}
              size={16}
              color={on ? colors.onAccent : colors.accentFg}
            />
            <Text
              variant="caption"
              tone={on ? 'onAccent' : 'ink'}
              style={styles.text}
              numberOfLines={1}
            >
              {tri(s.label, locale)}
            </Text>
            {/*
             * Brief §7.4 — arz yok. Çip yine SEÇİLEBİLİR: talep akışının
             * amacı zaten arz olmayan yerde talebi toplamak.
             */}
            {yakindaMi(s.id) ? <YakindaRozeti /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space(1) },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingLeft: space(1.25),
      paddingRight: space(1.75),
      paddingVertical: space(1.1),
      borderRadius: radius.pill,
    },
    chipOff: { backgroundColor: colors.surface, borderWidth: 1.25, borderColor: colors.line },
    chipOn: { backgroundColor: colors.accent, borderWidth: 1.25, borderColor: colors.accent },
    text: { fontFamily: font.semibold, fontSize: 13.5 },
  });
