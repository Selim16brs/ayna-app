import { useState } from 'react';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { radius, space, type ColorTokens, font } from '../theme';
import { useTheme, useThemedStyles } from '../theme-context';
import { Text } from './Text';

// TR kısa ay adları — tarih etiketini serbest metin yerine seçilen tarihten üretiriz.
// Biçimlendirici `src/date-label.ts`e taşındı (mağaza da kullanıyor, o dosya
// react-native içe aktaramaz). Buradan yeniden dışa aktarılıyor ki mevcut
// çağıranlar değişmesin.
import { formatTrDate } from '../date-label';
export { formatTrDate };

/**
 * Ortak tarih/saat alanı (Benim İçin kayıt eklemeleri + Randevu al aynı model).
 * iOS: kompakt tıklanabilir yerleşik seçici. Android: dokununca açılan diyalog.
 * Etiket seçilen tarihten üretilir; serbest metin yok.
 */
export function DateField({
  label,
  value,
  onChange,
  mode,
  minimumDate,
  maximumDate,
  last,
}: {
  label: string;
  value: Date;
  onChange: (d: Date) => void;
  mode: 'date' | 'datetime';
  minimumDate?: Date;
  maximumDate?: Date;
  last?: boolean;
}) {
  // `mode` zaten bileşenin prop'u (date/datetime) — tema kipi ayrı adla.
  const { mode: tema } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [show, setShow] = useState(false);
  return (
    <View style={[styles.field, !last && styles.fieldGap]}>
      <Text variant="bodyStrong" tone="ink" style={styles.label}>
        {label}
      </Text>
      {Platform.OS === 'ios' ? (
        <View style={styles.iosRow}>
          <DateTimePicker
            value={value}
            mode={mode}
            display="compact"
            /*
             * Koyu tema kontrolü ESKİ palet değerine bakıyordu (#191E1B).
             * O renk Figma geçişinde gitti (artık #18061C), yani koşul
             * HİÇ doğru olmuyordu: yerli tarih seçici koyu temada da açık
             * görünümde açılıyordu. Karşılaştırma yerine temanın kendi
             * kipi okunuyor.
             */
            themeVariant={tema === 'dark' ? 'dark' : 'light'}
            locale="tr-TR"
            minimumDate={minimumDate}
            maximumDate={maximumDate}
            onChange={(_, d) => d && onChange(d)}
          />
        </View>
      ) : (
        <>
          <Pressable style={styles.input} onPress={() => setShow(true)}>
            <Text variant="bodyStrong" tone="ink" style={styles.dateText}>
              {formatTrDate(value, mode === 'datetime')}
            </Text>
          </Pressable>
          {show ? (
            <DateTimePicker
              value={value}
              mode="date"
              minimumDate={minimumDate}
              maximumDate={maximumDate}
              onChange={(_, d) => {
                setShow(false);
                if (d) onChange(d);
              }}
            />
          ) : null}
        </>
      )}
    </View>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    field: {},
    fieldGap: { marginBottom: space(2) },
    label: { marginBottom: space(1), fontFamily: font.semibold },
    iosRow: { flexDirection: 'row', alignItems: 'center', minHeight: 40 },
    input: {
      backgroundColor: colors.surfaceMuted,
      borderRadius: radius.md,
      paddingHorizontal: space(1.75),
      height: 52,
      justifyContent: 'center',
    },
    dateText: { fontSize: 16 },
  });
